package com.smartbox.backend.service.admin;

import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.time;

@Service
@RequiredArgsConstructor
public class AdminNotificationsService {

    private final CommerceRepository db;
    private final CurrentActor actors;

    @Transactional(readOnly = true)
    public Map<String, Object> feed() {
        var actor = actors.get();
        actor.requireRoles("super_admin", "product_manager", "technician");
        List<Map<String, Object>> events = new ArrayList<>();
        String role = actor.role();

        if ("super_admin".equals(role)) {
            // Consolidated into a single UNION ALL query to eliminate 5 sequential DB network round trips
            String sql = "(SELECT 'ORDER' AS type, 'Đơn hàng mới' AS title, '/orders' AS link, id::text AS id, status::text AS status, created_at AS occurred_at FROM public.orders WHERE id::text !~ '^(11111111|22222222|33333333|44444444|55555555)' ORDER BY created_at DESC, id DESC LIMIT 15) " +
                    "UNION ALL " +
                    "(SELECT 'PO' AS type, 'PO Ticket cập nhật' AS title, '/orders/approvals' AS link, id::text AS id, status::text AS status, updated_at AS occurred_at FROM public.approval_tickets WHERE id::text !~ '^(11111111|22222222|33333333|44444444|55555555)' ORDER BY updated_at DESC, id DESC LIMIT 15) " +
                    "UNION ALL " +
                    "(SELECT 'DELIVERY' AS type, 'Công việc giao / lắp đặt' AS title, '/orders/delivery' AS link, id::text AS id, status::text AS status, updated_at AS occurred_at FROM public.delivery_installations WHERE id::text !~ '^(11111111|22222222|33333333|44444444|55555555)' ORDER BY updated_at DESC, id DESC LIMIT 15) " +
                    "UNION ALL " +
                    "(SELECT 'WARRANTY' AS type, 'Yêu cầu bảo hành' AS title, '/warranties' AS link, id::text AS id, status::text AS status, created_at AS occurred_at FROM public.warranty_claims WHERE id::text !~ '^(11111111|22222222|33333333|44444444|55555555)' ORDER BY created_at DESC, id DESC LIMIT 15) " +
                    "UNION ALL " +
                    "(SELECT 'EMAIL' AS type, 'Email gửi thất bại' AS title, '/emails' AS link, id::text AS id, status::text AS status, created_at AS occurred_at FROM public.email_outbox WHERE status='FAILED' ORDER BY created_at DESC, id DESC LIMIT 10)";
            List<Map<String, Object>> rows = db.list(sql);
            for (var row : rows) {
                addEvent(events, row);
            }
        } else if ("product_manager".equals(role)) {
            String sql = "(SELECT 'ORDER' AS type, 'Đơn hàng mới' AS title, '/orders' AS link, o.id::text AS id, o.status::text AS status, o.created_at AS occurred_at " +
                    "FROM public.orders o " +
                    "WHERE o.id::text !~ '^(11111111|22222222|33333333|44444444|55555555)' " +
                    "  AND EXISTS (SELECT 1 FROM public.order_items oi JOIN public.products pr ON pr.id = oi.product_id LEFT JOIN public.product_categories c ON c.id = pr.category_id WHERE oi.order_id = o.id AND (c.manager_id = ? OR pr.manager_id = ?)) " +
                    "ORDER BY o.created_at DESC, o.id DESC LIMIT 15) " +
                    "UNION ALL " +
                    "(SELECT 'PO' AS type, 'PO Ticket cập nhật' AS title, '/orders/approvals' AS link, t.id::text AS id, t.status::text AS status, t.updated_at AS occurred_at " +
                    "FROM public.approval_tickets t " +
                    "WHERE t.id::text !~ '^(11111111|22222222|33333333|44444444|55555555)' " +
                    "  AND (EXISTS (SELECT 1 FROM public.order_item_approvals a WHERE a.ticket_id = t.id AND a.manager_id = ?) " +
                    "       OR EXISTS (SELECT 1 FROM public.order_items oi JOIN public.products pr ON pr.id = oi.product_id LEFT JOIN public.product_categories c ON c.id = pr.category_id WHERE oi.order_id = t.order_id AND (c.manager_id = ? OR pr.manager_id = ?))) " +
                    "ORDER BY t.updated_at DESC, t.id DESC LIMIT 15) " +
                    "UNION ALL " +
                    "(SELECT type AS type, title AS title, '/orders/approvals' AS link, id::text AS id, 'NOTIFICATION' AS status, created_at AS occurred_at " +
                    "FROM public.notifications WHERE user_id=? AND id::text !~ '^(11111111|22222222|33333333|44444444|55555555)' ORDER BY created_at DESC LIMIT 15) " +
                    "UNION ALL " +
                    "(SELECT 'WARRANTY' AS type, 'Yêu cầu bảo hành' AS title, '/warranties' AS link, w.id::text AS id, w.status::text AS status, w.created_at AS occurred_at " +
                    "FROM public.warranty_claims w " +
                    "WHERE w.id::text !~ '^(11111111|22222222|33333333|44444444|55555555)' " +
                    "  AND EXISTS (SELECT 1 FROM public.products pr LEFT JOIN public.product_categories c ON c.id = pr.category_id WHERE pr.id = w.product_id AND (c.manager_id = ? OR pr.manager_id = ?)) " +
                    "ORDER BY w.created_at DESC, w.id DESC LIMIT 15)";
            List<Map<String, Object>> rows = db.list(sql, actor.id(), actor.id(), actor.id(), actor.id(), actor.id(), actor.id(), actor.id(), actor.id());
            for (var row : rows) {
                addEvent(events, row);
            }
        } else if ("technician".equals(role)) {
            String sql = "(SELECT 'TASK_ASSIGNED' AS type, 'Có công việc mới được phân công' AS title, '/technician/tasks' AS link, id::text AS id, status::text AS status, updated_at AS occurred_at FROM public.delivery_installations WHERE assigned_to=? AND status='ASSIGNED' AND id::text !~ '^(11111111|22222222|33333333|44444444|55555555)' ORDER BY updated_at DESC, id DESC LIMIT 15) " +
                    "UNION ALL " +
                    "(SELECT 'TASK_UPCOMING' AS type, 'Sắp đến giờ hẹn ca thi công' AS title, '/technician/tasks' AS link, id::text AS id, status::text AS status, scheduled_at AS occurred_at FROM public.delivery_installations WHERE assigned_to=? AND status IN ('ASSIGNED', 'IN_PROGRESS') AND id::text !~ '^(11111111|22222222|33333333|44444444|55555555)' AND scheduled_at >= (NOW() - INTERVAL '15 minutes') AND scheduled_at <= (NOW() + INTERVAL '60 minutes') ORDER BY scheduled_at ASC LIMIT 5) " +
                    "UNION ALL " +
                    "(SELECT type AS type, title AS title, '/technician/tasks' AS link, id::text AS id, 'NOTIFICATION' AS status, created_at AS occurred_at FROM public.notifications WHERE user_id=? AND id::text !~ '^(11111111|22222222|33333333|44444444|55555555)' ORDER BY created_at DESC LIMIT 15) " +
                    "UNION ALL " +
                    "(SELECT 'DELIVERY' AS type, 'Tiến độ giao lắp đơn hàng' AS title, '/technician/delivery' AS link, id::text AS id, status::text AS status, updated_at AS occurred_at FROM public.delivery_installations WHERE assigned_to=? AND status<>'ASSIGNED' AND id::text !~ '^(11111111|22222222|33333333|44444444|55555555)' ORDER BY updated_at DESC, id DESC LIMIT 15) " +
                    "UNION ALL " +
                    "(SELECT 'WARRANTY' AS type, 'Yêu cầu bảo hành' AS title, '/technician/warranties' AS link, id::text AS id, status::text AS status, created_at AS occurred_at FROM public.warranty_claims WHERE assigned_to=? AND id::text !~ '^(11111111|22222222|33333333|44444444|55555555)' ORDER BY created_at DESC, id DESC LIMIT 15)";
            List<Map<String, Object>> rows = db.list(sql, actor.id(), actor.id(), actor.id(), actor.id(), actor.id());
            for (var row : rows) {
                addEvent(events, row);
            }
        }

        events.sort(Comparator.comparing((Map<String, Object> e) -> {
            var t = time(e.get("occurredAt"));
            return t != null ? t : now();
        }).reversed().thenComparing(e -> e.get("id").toString()));

        return Map.of("events", events.stream().limit(50).toList(), "observedAt", now().toString());
    }

    private void addEvent(List<Map<String, Object>> events, Map<String, Object> row) {
        Object idObj = row.get("id");
        if (idObj == null) return;
        var t = time(row.get("occurred_at"));
        String occurred = t != null ? t.toString() : now().toString();
        String status = row.get("status") != null ? row.get("status").toString() : "UNKNOWN";
        String type = row.get("type") != null ? row.get("type").toString() : "ORDER";
        String title = row.get("title") != null ? row.get("title").toString() : "";
        String link = row.get("link") != null ? row.get("link").toString() : "";

        events.add(Map.of(
                "id", type + ":" + idObj + ":" + occurred,
                "type", type,
                "title", title,
                "referenceId", idObj.toString(),
                "status", status,
                "occurredAt", occurred,
                "link", link
        ));
    }
}
