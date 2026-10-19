package com.smartbox.backend.service.commerce;

import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.service.admin.OutboxService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.money;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.time;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.uuid;

/**
 * Service quản lý vòng đời Payment Timeout & Graceful Cancellation:
 * 1. Thiết lập Bộ đếm ngược (TTL) theo loại đơn hàng (Flash Sale 3-5m, Thường 15m-24h).
 * 2. Kích hoạt hủy đơn tự động qua Delayed Queue (Redis ZSet).
 * 3. Quy trình 4 bước Graceful Cancellation (Optimistic Locking & Compensating Saga).
 * 4. Xử lý ngoại lệ thanh toán muộn (Late Payment Auto-Refund).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentTimeoutService {

    private final CommerceRepository db;
    private final OrderWorkflowService orders;
    private final OutboxService outbox;
    private final OrderDelayedExpiryQueue delayedQueue;

    @Value("${smartbox.payment.timeout-minutes:15}")
    private int standardTimeoutMinutes;

    @Value("${smartbox.payment.flashsale-timeout-minutes:5}")
    private int flashSaleTimeoutMinutes;

    /**
     * Xác định TTL (phút) theo loại đơn hàng:
     * - Flash sale / Giật cô hồn: 3 - 5 phút (tránh đầu cơ giữ kho).
     * - Đơn thông thường: 15 phút.
     */
    public int determineTtlMinutes(Map<String, Object> order) {
        if (order == null) return standardTimeoutMinutes;

        // 1. Kiểm tra mã giảm giá có tiền tố hoặc chứa FLASH
        Object voucherObj = order.get("voucher_code");
        if (voucherObj != null && voucherObj.toString().toUpperCase(Locale.ROOT).contains("FLASH")) {
            return flashSaleTimeoutMinutes;
        }

        // 2. Kiểm tra thông tin promotion liên kết
        Object promoIdObj = order.get("promotion_id");
        if (promoIdObj != null) {
            var promoList = db.list("SELECT code, description FROM public.promotions WHERE id = ?", uuid(promoIdObj));
            if (!promoList.isEmpty()) {
                var p = promoList.getFirst();
                String code = Objects.toString(p.get("code"), "").toUpperCase(Locale.ROOT);
                String desc = Objects.toString(p.get("description"), "").toUpperCase(Locale.ROOT);
                if (code.contains("FLASH") || desc.contains("FLASH")) {
                    return flashSaleTimeoutMinutes;
                }
            }
        }

        // 3. Kiểm tra cancel_reason hoặc shipping_address chứa cờ flash_sale
        String reason = Objects.toString(order.get("cancel_reason"), "");
        if (reason.toLowerCase(Locale.ROOT).contains("flash_sale")) {
            return flashSaleTimeoutMinutes;
        }

        return standardTimeoutMinutes;
    }

    /**
     * Gắn mốc expires_at và đẩy vào Message Queue có độ trễ (Delayed Queue).
     */
    public OffsetDateTime scheduleOrderPaymentExpiry(UUID orderId, Map<String, Object> order) {
        int ttlMinutes = determineTtlMinutes(order);
        OffsetDateTime expiresAt = now().plusMinutes(ttlMinutes);

        db.update("UPDATE public.orders SET expires_at = ? WHERE id = ?", expiresAt, orderId);
        db.update("UPDATE public.payments SET expires_at = ? WHERE order_id = ? AND status = 'pending'", expiresAt, orderId);

        delayedQueue.scheduleExpiry(orderId, expiresAt);
        log.info("Đã lên lịch hết hạn thanh toán cho đơn {} vào lúc {} (TTL: {} phút)", orderId, expiresAt, ttlMinutes);
        return expiresAt;
    }

    /**
     * Hủy mốc đếm ngược khi khách đã thanh toán hoặc đơn bị hủy trước.
     */
    public void cancelScheduledExpiry(UUID orderId) {
        delayedQueue.cancelExpiry(orderId);
    }

    /**
     * Quy trình 4 bước khi sự kiện "Hết hạn" nổ ra (Graceful Cancellation):
     * Bước 1: Kiểm tra trạng thái đơn hiện tại (bỏ qua nếu đã PAID/CONFIRMED).
     * Bước 2: Chốt chặn an toàn với Cổng thanh toán (Final Inquiry + Close Transaction).
     * Bước 3: Cập nhật trạng thái đơn sang CANCELLED bằng Optimistic Locking.
     * Bước 4: Hoàn trả toàn bộ tài nguyên (Inventory, Voucher, Lịch thi công, Outbox Event).
     */
    @Transactional
    public void processExpiredOrder(UUID orderId) {
        log.info("Bắt đầu xử lý hủy đơn hết hạn thanh toán: {}", orderId);

        // BƯỚC 1: Kiểm tra trạng thái đơn hàng hiện tại
        var orderList = db.list("SELECT * FROM public.orders WHERE id = ? FOR UPDATE", orderId);
        if (orderList.isEmpty()) {
            delayedQueue.cancelExpiry(orderId);
            return;
        }
        var order = orderList.getFirst();
        String currentStatus = order.get("status").toString();

        // Nếu trạng thái đã là PAID, CONFIRMED, COMPLETED, CANCELLED -> No-op (bỏ qua sự kiện)
        if (Set.of("paid", "confirmed", "processing", "shipping", "delivered", "completed", "cancelled", "refunded").contains(currentStatus)) {
            log.info("Đơn hàng {} hiện ở trạng thái '{}', bỏ qua sự kiện hủy hết hạn.", orderId, currentStatus);
            delayedQueue.cancelExpiry(orderId);
            return;
        }

        // Nếu đơn chưa đến thời điểm expires_at trong DB -> chưa hủy
        OffsetDateTime expiresAt = time(order.get("expires_at"));
        if (expiresAt != null && expiresAt.isAfter(now())) {
            log.debug("Đơn hàng {} chưa đến giờ hết hạn thực tế ({}), bỏ qua.", orderId, expiresAt);
            return;
        }

        // BƯỚC 2: Chốt chặn an toàn với Cổng thanh toán (Final Inquiry + Close Transaction)
        var paymentList = db.list("SELECT * FROM public.payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1 FOR UPDATE", orderId);
        if (!paymentList.isEmpty()) {
            var payment = paymentList.getFirst();
            UUID paymentId = uuid(payment.get("id"));
            String paymentStatus = Objects.toString(payment.get("status"), "pending");

            // Final Inquiry: Kiểm tra xem đã có giao dịch thành công được ghi nhận chưa
            var successNotifications = db.list(
                    "SELECT id, created_at FROM public.payment_provider_notifications WHERE payment_id = ? AND response_code = '00' AND transaction_status = '00'",
                    paymentId
            );

            if (!successNotifications.isEmpty() || "success".equals(paymentStatus)) {
                // Khách đã trả tiền phút 14s59 -> Không hủy đơn, chuyển sang luồng PAID / CONFIRMED
                log.info("Chốt chặn an toàn: Cổng thanh toán xác nhận đơn {} đã thanh toán thành công. Không hủy đơn!", orderId);
                OffsetDateTime paidAt = payment.get("paid_at") != null ? time(payment.get("paid_at")) :
                        (!successNotifications.isEmpty() && successNotifications.getFirst().get("created_at") != null ? time(successNotifications.getFirst().get("created_at")) : now());
                db.update("UPDATE public.payments SET status = 'success', paid_at = ? WHERE id = ?", paidAt, paymentId);
                db.update("UPDATE public.orders SET paid_at = ? WHERE id = ?", paidAt, orderId);
                orders.transition(order, "paid", "SYSTEM", "FINAL_INQUIRY_SUCCESS");
                orders.transition(order, "confirmed", "SYSTEM", "FINAL_INQUIRY_CONFIRMED");
                db.update("INSERT INTO public.shipments(id, order_id, status, created_at) VALUES (?, ?, 'PREPARING', ?) ON CONFLICT (order_id) DO NOTHING",
                        UUID.randomUUID(), orderId, now());
                outbox.enqueue("ORDER_PAID", orderId, "paid:" + paymentId, "Thanh toán thành công xác nhận qua Final Inquiry");
                delayedQueue.cancelExpiry(orderId);
                return;
            }

            // Nếu cổng xác nhận chưa thanh toán: Close / Vô hiệu hóa giao dịch trên hệ thống ngay lập tức
            db.update("UPDATE public.payments SET status = 'expired' WHERE id = ?", paymentId);
            log.info("Đã đóng/vô hiệu hóa giao dịch thanh toán {} của đơn hàng {}", paymentId, orderId);
        }

        // BƯỚC 3: Chuyển trạng thái đơn sang CANCELLED bằng Optimistic Locking
        int affectedRows = db.update(
                "UPDATE public.orders SET status = CAST('cancelled' AS public.order_status), updated_at = ? " +
                "WHERE id = ? AND status = CAST(? AS public.order_status)",
                now(), orderId, currentStatus
        );

        if (affectedRows == 0) {
            // Optimistic lock conflict: Đơn vừa được thanh toán thành công hoặc cập nhật ở luồng khác song song
            log.warn("Optimistic Locking: Đơn hàng {} đã bị thay đổi ở luồng khác cùng lúc. Dừng quy trình hủy!", orderId);
            delayedQueue.cancelExpiry(orderId);
            return;
        }

        order.put("status", "cancelled");
        db.update("INSERT INTO public.order_status_history VALUES(?,?,?,?,?,?,?)",
                UUID.randomUUID(), orderId, currentStatus, "cancelled", "SYSTEM", "PAYMENT_TIMEOUT", now());
        db.audit(null, "ORDER_CANCELLED", "orders", orderId, "PAYMENT_TIMEOUT");

        // BƯỚC 4: Hoàn trả toàn bộ tài nguyên đã giữ (Compensating Transactions - Saga Pattern)
        // 4.1. Inventory Service (Kho hàng): Hoàn trả tồn kho từ reserved_stock về available_stock
        orders.release(order, null, "PAYMENT_TIMEOUT");

        // 4.2. Promotion / Voucher Service: Mở khóa mã giảm giá, giảm used_count
        if (order.get("promotion_id") != null) {
            try {
                UUID promoId = uuid(order.get("promotion_id"));
                db.update("UPDATE public.promotions SET used_count = GREATEST(0, used_count - 1), updated_at = ? WHERE id = ?", now(), promoId);
                log.info("Đã hoàn trả mã giảm giá {} cho đơn hàng {}", promoId, orderId);
            } catch (Exception ex) {
                log.warn("Không thể hoàn trả used_count voucher đơn {}: {}", orderId, ex.getMessage());
            }
        }

        // 4.3. Approval Ticket & Items: Đóng phiếu PO thẩm định
        try {
            db.update("UPDATE public.approval_tickets SET status = 'CANCELLED', reason = 'PAYMENT_TIMEOUT', updated_at = ? WHERE order_id = ? AND status NOT IN ('APPROVED', 'CANCELLED')", now(), orderId);
            db.update("UPDATE public.order_item_approvals SET status = 'REJECTED', reason = 'PAYMENT_TIMEOUT' WHERE order_id = ? AND status = 'PENDING'", orderId);
        } catch (Exception ex) {
            log.warn("Lỗi cập nhật ticket PO khi hủy đơn: {}", ex.getMessage());
        }

        // 4.4. Delivery & Installation Service: Hủy lịch thi công nếu có
        try {
            for (var job : db.list("SELECT * FROM public.delivery_installations WHERE order_id = ? FOR UPDATE", orderId)) {
                long version = ((Number) job.get("version")).longValue() + 1;
                db.update("UPDATE public.delivery_installations SET status = 'FAILED', failure_reason = 'ORDER_CANCELLED', version = ?, updated_at = ? WHERE id = ?",
                        version, now(), job.get("id"));
                db.update("INSERT INTO public.delivery_installation_history VALUES(?,?,?,?,?,?,?,?,?,?)",
                        UUID.randomUUID(), job.get("id"), null, "ORDER_CANCELLED", job.get("status"), "FAILED", "Đơn hàng hủy do quá hạn thanh toán", job.get("attempt"), version, now());
            }
        } catch (Exception ex) {
            log.warn("Lỗi hủy job delivery khi timeout đơn: {}", ex.getMessage());
        }

        // 4.5. Bắn sự kiện OrderExpiredEvent qua Outbox
        outbox.enqueue("ORDER_EXPIRED", orderId, "expired:" + orderId, "Quá thời hạn thanh toán (PAYMENT_TIMEOUT)");
        delayedQueue.cancelExpiry(orderId);

        // 4.6. Gửi thông báo đến tài khoản khách hàng
        try {
            UUID userId = uuid(order.get("user_id"));
            if (userId != null) {
                String code = orderId.toString().substring(0, 8).toUpperCase(Locale.ROOT);
                db.update("INSERT INTO public.notifications(id, user_id, type, title, body, is_read, created_at) VALUES(?,?,?,'Đơn hàng đã hết hạn thanh toán',?,false,?)",
                        UUID.randomUUID(), userId, "ORDER_PAYMENT_TIMEOUT",
                        "Đơn hàng #" + code + " đã tự động hủy do quá thời gian thanh toán quy định. Tồn kho sản phẩm và ưu đãi của bạn đã được giải phóng.", now());
            }
        } catch (Exception ignored) {}

        log.info("Hoàn tất quy trình 4 bước hủy đơn hết hạn thanh toán cho đơn {}", orderId);
    }

    /**
     * Xử lý trường hợp ngoại lệ: Khách cố tình chuyển khoản sau khi đơn đã hủy.
     * Khi cổng thanh toán nhận được tiền và gọi Webhook báo về sàn, sàn thấy đơn đã ở trạng thái CANCELLED.
     * Hệ thống tự động chuyển giao dịch sang luồng Auto-Refund (Hoàn tiền tự động).
     */
    public void handleLatePaymentRefund(Map<String, Object> order, Map<String, Object> payment, OffsetDateTime paidAt) {
        UUID paymentId = uuid(payment.get("id"));
        UUID orderId = uuid(order.get("id"));
        UUID userId = uuid(order.get("user_id"));
        BigDecimal amount = money(payment.get("amount"));

        db.update("UPDATE public.payments SET status = 'refund_required', paid_at = ? WHERE id = ?", paidAt, paymentId);
        orders.requestRefund(order, "LATE_PAYMENT_SUCCESS");
        log.warn("Phát hiện khách thanh toán muộn cho đơn đã hủy {}. Đã chuyển sang luồng Auto-Refund.", orderId);

        // Gửi thông báo hoàn tiền tự động cho khách
        if (userId != null) {
            try {
                String code = orderId.toString().substring(0, 8).toUpperCase(Locale.ROOT);
                db.update("INSERT INTO public.notifications(id, user_id, type, title, body, is_read, created_at) VALUES(?,?,?,'Hoàn tiền đơn hàng do thanh toán muộn',?,false,?)",
                        UUID.randomUUID(), userId, "PAYMENT_REFUND_REQUIRED",
                        "Đơn hàng #" + code + " đã quá hạn thanh toán và đã bị hủy trước đó. Số tiền " + amount.toPlainString() + " VNĐ của bạn đã được tự động chuyển vào quy trình hoàn tiền (Auto-Refund).", now());
            } catch (Exception ignored) {}
        }
    }
}
