package com.smartbox.backend.service.commerce;

import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.service.admin.OutboxService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.uuid;

@Service
@RequiredArgsConstructor
public class ApprovalTicketService {

    private final CommerceRepository db;
    private final OrderWorkflowService orders;
    private final OutboxService outbox;
    private final CurrentActor actors;

    @Transactional
    public Map<String, Object> act(UUID ticketId, String action, String reason) {
        var actor = actors.get();
        var ticket = db.one("SELECT * FROM public.approval_tickets WHERE id=?", ticketId);
        UUID orderId = uuid(ticket.get("order_id"));
        var order = db.order(orderId, true);
        ticket = db.one("SELECT * FROM public.approval_tickets WHERE id=? FOR UPDATE", ticketId);
        orders.requireNewWorkflow(order);

        String orderStatus = order.get("status").toString();
        if (!Set.of("pending", "customer_decision_pending", "paid").contains(orderStatus)) {
            throw new ConflictException("TICKET_ORDER_NOT_IN_REVIEW: Đơn hàng không ở trạng thái chờ duyệt");
        }

        String status = ticket.get("status").toString();
        int round = ((Number) ticket.get("review_round")).intValue();
        String next;
        if ("RESUBMIT".equals(action)) {
            actor.requireOwner(uuid(order.get("user_id")));
            if (!"RETURNED".equals(status)) {
                throw new ConflictException("INVALID_TICKET_TRANSITION");
            }
            requireReason(reason);
            next = "PENDING";
            round++;
        } else {
            actor.requireRoles("super_admin", "product_manager");
            if (!Set.of("PENDING", "PARTIALLY_REJECTED").contains(status)) {
                throw new ConflictException("TICKET_ALREADY_REVIEWED");
            }
            next = switch (action) {
                case "APPROVE" -> "APPROVED";
                case "RETURN" -> {
                    requireReason(reason);
                    yield "RETURNED";
                }
                case "REJECT" -> {
                    requireReason(reason);
                    yield "REJECTED";
                }
                default -> throw new BadRequestException("INVALID_TICKET_ACTION");
            };
        }
        UUID event = UUID.randomUUID();
        db.update("UPDATE public.approval_tickets SET status=?, review_round=?, reason=?, updated_at=? WHERE id=?",
                next, round, reason, now(), ticketId);
        db.update("INSERT INTO public.ticket_history VALUES(?,?,?,?,?,?)",
                event, ticketId, action, actor.id(), reason, now());
        db.audit(actor.id(), "TICKET_" + action, "approval_tickets", ticketId, reason);

        if ("APPROVE".equals(action)) {
            db.update("UPDATE public.order_item_approvals SET status='APPROVED', reviewed_by=?, reviewed_at=? WHERE ticket_id=? AND status='PENDING'",
                    actor.id(), now(), ticketId);
            if (Set.of("pending", "customer_decision_pending").contains(orderStatus)) {
                orders.transition(order, "awaiting_payment", actor.id().toString(), "TICKET_APPROVED");
                db.update("UPDATE public.orders SET expires_at=? WHERE id=?", now().plusMinutes(30), orderId);
            } else if ("paid".equals(orderStatus)) {
                orders.transition(order, "confirmed", actor.id().toString(), "TICKET_APPROVED");
                db.update("INSERT INTO public.shipments(id,order_id,status,created_at) VALUES(?,?,'PREPARING',?)",
                        UUID.randomUUID(), orderId, now());
            }
        } else if ("REJECT".equals(action)) {
            db.update("UPDATE public.order_item_approvals SET status='REJECTED', reviewed_by=?, reason=?, reviewed_at=? WHERE ticket_id=? AND status='PENDING'",
                    actor.id(), reason, now(), ticketId);
            if ("paid".equals(orderStatus)) {
                orders.requestRefund(order, reason);
            }
            orders.transition(order, "cancelled", actor.id().toString(), "TICKET_REJECTED");
            orders.release(order, actor.id(), "TICKET_REJECTED");
        }
        if ("APPROVE".equals(action)) {
            if ("paid".equals(orderStatus)) {
                outbox.enqueue("ORDER_CONFIRMED", orderId, "ticket:" + event, reason);
            }
        } else {
            String template = switch (action) {
                case "RETURN" -> "TICKET_RETURNED";
                case "REJECT" -> "TICKET_REJECTED";
                default -> "TICKET_RESUBMITTED";
            };
            outbox.enqueue(template, orderId, "ticket:" + event, reason);
        }
        return detail(ticketId);
    }

    @Transactional
    public Map<String, Object> actItem(UUID ticketId, UUID orderItemId, String action, String reason) {
        var actor = actors.get();
        actor.requireRoles("super_admin", "product_manager");
        var ticket = db.one("SELECT * FROM public.approval_tickets WHERE id=? FOR UPDATE", ticketId);
        UUID orderId = uuid(ticket.get("order_id"));
        var order = db.order(orderId, true);
        orders.requireNewWorkflow(order);

        if (!Set.of("pending", "customer_decision_pending").contains(order.get("status"))) {
            throw new ConflictException("TICKET_ORDER_NOT_IN_REVIEW: Đơn hàng không ở trạng thái chờ duyệt");
        }
        var itemApproval = db.one("SELECT * FROM public.order_item_approvals WHERE ticket_id=? AND order_item_id=? FOR UPDATE", ticketId, orderItemId);
        if (itemApproval == null) {
            throw new BadRequestException("ITEM_APPROVAL_NOT_FOUND");
        }
        if (itemApproval.get("manager_id") != null && !"super_admin".equals(actor.role())) {
            if (!actor.id().equals(uuid(itemApproval.get("manager_id")))) {
                throw new ConflictException("PO_NOT_AUTHORIZED_FOR_ITEM: Bạn không phải PO quản lý sản phẩm này");
            }
        }
        if (!"PENDING".equals(itemApproval.get("status"))) {
            throw new ConflictException("ITEM_ALREADY_REVIEWED");
        }
        String nextItemStatus;
        if ("APPROVE".equals(action)) {
            nextItemStatus = "APPROVED";
        } else if ("REJECT".equals(action)) {
            requireReason(reason);
            nextItemStatus = "REJECTED";
        } else {
            throw new BadRequestException("INVALID_ITEM_ACTION");
        }

        db.update("UPDATE public.order_item_approvals SET status=?, reviewed_by=?, reason=?, reviewed_at=? WHERE id=?",
                nextItemStatus, actor.id(), reason, now(), itemApproval.get("id"));
        db.update("INSERT INTO public.ticket_history VALUES(?,?,?,?,?,?)",
                UUID.randomUUID(), ticketId, "ITEM_" + action, actor.id(), "Item " + orderItemId + ": " + reason, now());
        db.audit(actor.id(), "ITEM_" + action, "order_item_approvals", uuid(itemApproval.get("id")), reason);

        // Check aggregate status of all items in ticket
        var allItems = db.list("SELECT status FROM public.order_item_approvals WHERE ticket_id=?", ticketId);
        long pendingCount = allItems.stream().filter(r -> "PENDING".equals(r.get("status"))).count();
        long approvedCount = allItems.stream().filter(r -> "APPROVED".equals(r.get("status"))).count();
        long rejectedCount = allItems.stream().filter(r -> "REJECTED".equals(r.get("status"))).count();

        if (pendingCount == 0) {
            if (rejectedCount == 0) {
                // All items approved
                db.update("UPDATE public.approval_tickets SET status='APPROVED', updated_at=? WHERE id=?", now(), ticketId);
                orders.transition(order, "awaiting_payment", actor.id().toString(), "ALL_ITEMS_APPROVED");
                db.update("UPDATE public.orders SET expires_at=? WHERE id=?", now().plusMinutes(30), orderId);
                outbox.enqueue("ORDER_APPROVED_AWAITING_PAYMENT", orderId, "ticket:" + ticketId + ":approved", "Đơn hàng đã được duyệt toàn bộ, vui lòng thanh toán");
            } else if (approvedCount == 0) {
                // All items rejected
                db.update("UPDATE public.approval_tickets SET status='REJECTED', reason=?, updated_at=? WHERE id=?", "Tất cả sản phẩm bị từ chối", now(), ticketId);
                orders.transition(order, "cancelled", actor.id().toString(), "ALL_ITEMS_REJECTED");
                orders.release(order, actor.id(), "ALL_ITEMS_REJECTED");
                outbox.enqueue("ORDER_REJECTED", orderId, "ticket:" + ticketId + ":rejected", "Đơn hàng bị từ chối do không sản phẩm nào được duyệt");
            } else {
                // Partial rejection -> ask customer
                db.update("UPDATE public.approval_tickets SET status='PARTIALLY_REJECTED', reason=?, updated_at=? WHERE id=?",
                        "Một số sản phẩm bị từ chối, chờ khách hàng phản hồi", now(), ticketId);
                orders.transition(order, "customer_decision_pending", actor.id().toString(), "PARTIALLY_APPROVED_AWAITING_CUSTOMER");
                outbox.enqueue("PARTIAL_APPROVAL_PROMPT", orderId, "ticket:" + ticketId + ":prompt", "Có sản phẩm không được duyệt. Khách hàng vui lòng xác nhận có tiếp tục mua các sản phẩm còn lại không.");
            }
        }
        return detail(ticketId);
    }

    @Transactional
    public Map<String, Object> customerDecision(UUID orderId, boolean accept) {
        var actor = actors.get();
        var order = db.order(orderId, true);
        actor.requireOwner(uuid(order.get("user_id")));
        orders.requireNewWorkflow(order);
        if (!"customer_decision_pending".equals(order.get("status"))) {
            throw new ConflictException("ORDER_NOT_AWAITING_CUSTOMER_DECISION");
        }
        var ticket = db.one("SELECT id FROM public.approval_tickets WHERE order_id=? FOR UPDATE", orderId);
        UUID ticketId = uuid(ticket.get("id"));

        if (accept) {
            // Customer accepts remaining approved items: release rejected items and recalculate
            var rejectedItems = db.list("SELECT a.order_item_id, i.variant_id, i.quantity FROM public.order_item_approvals a JOIN public.order_items i ON i.id=a.order_item_id WHERE a.order_id=? AND a.status='REJECTED'", orderId);
            for (var item : rejectedItems) {
                UUID variantId = uuid(item.get("variant_id"));
                int qty = ((Number) item.get("quantity")).intValue();
                orders.moveStock(variantId, qty, orderId, actor.id(), "PARTIAL_REJECT_RELEASE");
                db.update("DELETE FROM public.order_items WHERE id=?", item.get("order_item_id"));
            }
            orders.recalculate(orderId);
            db.update("UPDATE public.approval_tickets SET status='APPROVED', reason='CUSTOMER_ACCEPTED_PARTIAL_ORDER', updated_at=? WHERE id=?", now(), ticketId);
            db.update("INSERT INTO public.ticket_history VALUES(?,?,?,?,?,?)",
                    UUID.randomUUID(), ticketId, "CUSTOMER_ACCEPTED", actor.id(), "Khách hàng đồng ý tiếp tục đơn hàng với các sản phẩm được duyệt", now());
            orders.transition(order, "awaiting_payment", actor.id().toString(), "CUSTOMER_ACCEPTED_PARTIAL_ORDER");
            db.update("UPDATE public.orders SET expires_at=? WHERE id=?", now().plusMinutes(30), orderId);
            outbox.enqueue("ORDER_AWAITING_PAYMENT", orderId, "decision:" + orderId, "Đơn hàng đã cập nhật thành công, vui lòng thanh toán");
        } else {
            // Customer declines: cancel order and release all remaining inventory
            db.update("UPDATE public.approval_tickets SET status='CANCELLED', reason='CUSTOMER_DECLINED_PARTIAL_ORDER', updated_at=? WHERE id=?", now(), ticketId);
            db.update("INSERT INTO public.ticket_history VALUES(?,?,?,?,?,?)",
                    UUID.randomUUID(), ticketId, "CUSTOMER_DECLINED", actor.id(), "Khách hàng hủy toàn bộ đơn do không đồng ý mua lẻ các sản phẩm được duyệt", now());
            orders.transition(order, "cancelled", actor.id().toString(), "CUSTOMER_DECLINED_PARTIAL_ORDER");
            orders.release(order, actor.id(), "CUSTOMER_DECLINED_PARTIAL_ORDER");
            outbox.enqueue("ORDER_CANCELLED", orderId, "decision:" + orderId, "Đơn hàng đã hủy theo yêu cầu của khách hàng");
        }
        return orders.view(orderId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detail(UUID id) {
        var ticket = db.one("SELECT * FROM public.approval_tickets WHERE id=?", id);
        var actor = actors.get();
        var order = db.order(uuid(ticket.get("order_id")), false);
        if (!actor.staff()) {
            actor.requireOwner(uuid(order.get("user_id")));
        } else {
            actor.requireRoles("super_admin", "product_manager");
        }
        Map<String, Object> result = new LinkedHashMap<>(ticket);
        result.put("history", db.list("SELECT * FROM public.ticket_history WHERE ticket_id=? ORDER BY created_at,id", id));
        result.put("itemApprovals", db.list("SELECT a.id, a.ticket_id AS \"ticketId\", a.order_id AS \"orderId\", a.order_item_id AS \"orderItemId\", a.product_id AS \"productId\", a.manager_id AS \"managerId\", a.status, a.reason, a.reviewed_by AS \"reviewedBy\", a.reviewed_at AS \"reviewedAt\", a.created_at AS \"createdAt\", p.name AS \"productName\", v.sku, v.variant_name AS \"variantName\" FROM public.order_item_approvals a JOIN public.products p ON p.id=a.product_id JOIN public.order_items i ON i.id=a.order_item_id JOIN public.product_variants v ON v.id=i.variant_id WHERE a.ticket_id=? ORDER BY a.created_at, a.id", id));
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detailByOrder(UUID orderId) {
        var rows = db.list("SELECT id FROM public.approval_tickets WHERE order_id=? ORDER BY created_at DESC LIMIT 1", orderId);
        if (rows.isEmpty()) {
            return Map.of();
        }
        return detail(uuid(rows.getFirst().get("id")));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(int page, int size) {
        actors.get().requireRoles("super_admin", "product_manager");
        if (page < 0 || size < 1 || size > 100) {
            throw new BadRequestException("VALIDATION_ERROR");
        }
        return db.list("SELECT * FROM public.approval_tickets ORDER BY created_at DESC LIMIT ? OFFSET ?",
                size, (long) page * size);
    }

    private void requireReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("TICKET_REASON_REQUIRED");
        }
    }
}
