package com.smartbox.backend.service.commerce;

import com.smartbox.backend.dto.response.commerce.VnpayPaymentResponse;
import com.smartbox.backend.dto.response.commerce.VnpayReturnResponse;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.service.admin.OutboxService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MultiValueMap;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.money;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.time;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.uuid;

/**
 * Service xử lý tích hợp cổng thanh toán VNPAY (Phiên bản 2.1.0 Sandbox).
 * Cấu hình:
 * - Terminal ID: 42XKU6R7
 * - Secret Key: UYVDLJLIWBEQKOBFNTKPEASXIJXSXJIW
 * - Gateway URL: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VnpayService {

    private final CommerceRepository db;
    private final OrderWorkflowService orders;
    private final CurrentActor actors;
    private final OutboxService outbox;
    private final VnpayGateway gateway;

    @Value("${smartbox.vnpay.tmn-code:42XKU6R7}")
    private String terminalCode;

    @Value("${smartbox.vnpay.hash-secret:UYVDLJLIWBEQKOBFNTKPEASXIJXSXJIW}")
    private String hashSecret;

    @Value("${smartbox.vnpay.url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String vnpayUrl;

    @Value("${smartbox.vnpay.return-url:http://localhost:5173/payments/vnpay/return}")
    private String returnUrl;

    @Value("${smartbox.vnpay.environment:sandbox}")
    private String environment;

    @Value("${smartbox.payment.timeout-minutes:15}")
    private int timeoutMinutes;

    /**
     * Kiểm tra cấu hình môi trường Sandbox của VNPAY.
     */
    public void validateConfiguration() {
        gateway.configured();
    }

    /**
     * Tạo URL thanh toán VNPAY cho đơn hàng đang chờ thanh toán.
     *
     * @param orderId ID của đơn hàng
     * @param clientIp Địa chỉ IP của khách hàng
     * @return Thông tin thanh toán bao gồm URL chuyển hướng sang VNPAY
     */
    @Transactional
    public VnpayPaymentResponse createPaymentUrlForOrder(UUID orderId, String clientIp) {
        validateConfiguration();
        var actor = actors.get();
        var order = orders.owned(orderId, actor, true);

        if (!"awaiting_payment".equals(order.get("status")) && !"pending".equals(order.get("status"))) {
            throw new ConflictException("Đơn hàng không ở trạng thái chờ thanh toán");
        }

        BigDecimal total = money(order.get("total"));
        if (total.signum() <= 0) {
            throw new BadRequestException("Tổng tiền đơn hàng phải lớn hơn 0");
        }

        UUID paymentId = UUID.randomUUID();
        OffsetDateTime created = now();
        OffsetDateTime expires = created.plusMinutes(Math.max(5, timeoutMinutes));

        String ip = (clientIp == null || clientIp.isBlank() || "0:0:0:0:0:0:0:1".equals(clientIp) || "::1".equals(clientIp))
                ? "127.0.0.1" : clientIp;

        String paymentUrl = gateway.paymentUrl(paymentId, total, created, expires, ip);

        // Lưu thông tin bản ghi thanh toán
        db.update("INSERT INTO public.payments(" +
                        "id, order_id, amount, status, provider, expires_at, created_at, " +
                        "provider_environment, provider_terminal, gateway_reference) " +
                        "VALUES (?, ?, ?, 'pending', 'vnpay', ?, ?, 'sandbox', ?, ?)",
                paymentId, orderId, total, expires, created, terminalCode, paymentId.toString().replace("-", ""));

        if ("pending".equals(order.get("status"))) {
            orders.transition(order, "awaiting_payment", actor.id().toString(), "VNPAY_CHECKOUT");
        }
        db.update("UPDATE public.orders SET expires_at=? WHERE id=?", expires, orderId);

        log.info("Đã tạo liên kết thanh toán VNPAY cho đơn hàng {}: paymentId={}", orderId, paymentId);

        return VnpayPaymentResponse.builder()
                .orderId(orderId)
                .paymentId(paymentId)
                .amount(total)
                .status("awaiting_payment")
                .paymentUrl(paymentUrl)
                .provider("vnpay")
                .environment(environment)
                .expiresAt(expires)
                .message("Tạo link thanh toán VNPAY thành công")
                .build();
    }

    /**
     * Xử lý IPN (Instant Payment Notification) từ máy chủ VNPAY gọi đến.
     *
     * @param queryParams Các tham số VNPAY gửi sang
     * @return Bản đồ mã phản hồi chuẩn VNPAY (RspCode, Message)
     */
    @Transactional
    public Map<String, String> handleIpn(MultiValueMap<String, String> queryParams) {
        try {
            VnpayGateway.Notification notification = gateway.verify(queryParams);
            UUID paymentId = VnpayGateway.paymentId(notification.reference());

            var paymentList = db.list(
                    "SELECT * FROM public.payments WHERE id=? AND gateway_reference=? " +
                            "AND provider='vnpay' AND provider_environment='sandbox' AND provider_terminal=?",
                    paymentId, notification.reference(), notification.terminal());

            if (paymentList.isEmpty()) {
                return buildIpnResponse("01"); // Order not found
            }

            var payment = paymentList.getFirst();
            UUID orderId = uuid(payment.get("order_id"));
            var order = db.order(orderId, true);
            orders.requireNewWorkflow(order);

            // Kiểm tra số tiền
            if (notification.amount().compareTo(money(payment.get("amount"))) != 0
                    || notification.amount().compareTo(money(order.get("total"))) != 0) {
                return buildIpnResponse("04"); // Invalid amount
            }

            // Kiểm tra trùng lặp thông báo (Idempotency)
            if (!db.list("SELECT id FROM public.payment_provider_notifications WHERE payment_id=? AND fingerprint=?",
                    paymentId, notification.fingerprint()).isEmpty()) {
                return buildIpnResponse("02"); // Order already confirmed
            }

            String currentStatus = payment.get("status").toString();
            if (Set.of("success", "refund_required", "refunded").contains(currentStatus)
                    || (!notification.success() && Set.of("failed", "expired").contains(currentStatus))) {
                return buildIpnResponse("02"); // Already processed
            }

            if (notification.success() && notification.paidAt() != null
                    && notification.paidAt().isAfter(now().plusMinutes(5))) {
                return buildIpnResponse("99");
            }

            // Cập nhật kết quả giao dịch
            if (notification.success()) {
                db.update("UPDATE public.payments SET transaction_ref=?, gateway_paid_at=? WHERE id=?",
                        notification.transactionNo(), notification.paidAt(), paymentId);
            }
            db.update("UPDATE public.payments SET gateway_response_code=?, gateway_transaction_status=? WHERE id=?",
                    notification.responseCode(), notification.transactionStatus(), paymentId);

            applyPaymentResult(order, payment, notification.success() ? "SUCCESS" : "FAILED",
                    notification.success() && notification.paidAt() != null ? notification.paidAt() : now());

            db.update("INSERT INTO public.payment_provider_notifications(" +
                            "id, payment_id, fingerprint, response_code, transaction_status, created_at) " +
                            "VALUES (?, ?, ?, ?, ?, ?)",
                    UUID.randomUUID(), paymentId, notification.fingerprint(),
                    notification.responseCode(), notification.transactionStatus(), now());

            db.audit(null, "VNPAY_IPN_RECORDED", "payments", paymentId,
                    notification.responseCode() + "/" + notification.transactionStatus());

            log.info("Xử lý IPN VNPAY thành công cho paymentId={}: kết quả={}", paymentId, notification.responseCode());
            return buildIpnResponse("00"); // Confirm Success

        } catch (VnpayGateway.InvalidNotification ex) {
            log.warn("VNPAY IPN không hợp lệ: code={}", ex.code());
            return buildIpnResponse(ex.code());
        } catch (Exception ex) {
            log.error("Lỗi khi xử lý IPN VNPAY", ex);
            return buildIpnResponse("99");
        }
    }

    /**
     * Xử lý xác thực dữ liệu khi khách hàng được VNPAY redirect về Return URL.
     * Chú ý: Trang này chỉ mang tính hiển thị kết quả cho khách, trạng thái đơn hàng
     * được cập nhật chính thức qua IPN.
     */
    public VnpayReturnResponse handleReturn(MultiValueMap<String, String> queryParams) {
        var notification = gateway.verify(queryParams);
        UUID paymentId = VnpayGateway.paymentId(notification.reference());

        var paymentList = db.list("SELECT order_id, amount FROM public.payments WHERE id=?", paymentId);
        UUID orderId = paymentList.isEmpty() ? null : uuid(paymentList.getFirst().get("order_id"));
        BigDecimal amount = paymentList.isEmpty() ? notification.amount() : money(paymentList.getFirst().get("amount"));

        return VnpayReturnResponse.builder()
                .paymentId(paymentId)
                .orderId(orderId)
                .amount(amount)
                .signatureValid(true)
                .gatewayResult(notification.success() ? "SUCCESS" : "FAILED")
                .responseCode(notification.responseCode())
                .transactionStatus(notification.transactionStatus())
                .transactionNo(notification.transactionNo())
                .bankCode(queryParams.getFirst("vnp_BankCode"))
                .payDate(queryParams.getFirst("vnp_PayDate"))
                .environment("sandbox")
                .awaitingIpnConfirmation(true)
                .message(notification.success()
                        ? "Giao dịch thanh toán VNPAY thành công!"
                        : "Giao dịch thanh toán VNPAY không thành công hoặc bị hủy bỏ.")
                .build();
    }

    /**
     * Áp dụng kết quả thanh toán lên đơn hàng và kho.
     */
    private void applyPaymentResult(Map<String, Object> order, Map<String, Object> payment,
                                    String result, OffsetDateTime paidAt) {
        UUID paymentId = uuid(payment.get("id"));
        UUID orderId = uuid(order.get("id"));
        String status = payment.get("status").toString();

        if (Set.of("success", "refund_required", "refunded").contains(status)) {
            return;
        }

        if ("SUCCESS".equals(result)) {
            if ("cancelled".equals(order.get("status"))) {
                db.update("UPDATE public.payments SET status='refund_required', paid_at=? WHERE id=?", paidAt, paymentId);
                orders.requestRefund(order, "LATE_PAYMENT_SUCCESS");
                log.warn("Thanh toán muộn cho đơn hàng đã hủy {}, yêu cầu hoàn tiền", paymentId);
            } else if ("awaiting_payment".equals(order.get("status"))) {
                if (!time(payment.get("expires_at")).isAfter(now())) {
                    db.update("UPDATE public.payments SET status='expired' WHERE id=?", paymentId);
                    orders.transition(order, "cancelled", "SYSTEM", "PAYMENT_TIMEOUT");
                    orders.release(order, null, "PAYMENT_TIMEOUT");
                    db.update("UPDATE public.payments SET status='refund_required', paid_at=? WHERE id=?", paidAt, paymentId);
                    orders.requestRefund(order, "LATE_PAYMENT_SUCCESS");
                } else {
                    db.update("UPDATE public.payments SET status='success', paid_at=? WHERE id=?", paidAt, paymentId);
                    db.update("UPDATE public.orders SET paid_at=? WHERE id=?", paidAt, orderId);
                    orders.transition(order, "paid", "SYSTEM", "PAYMENT_SUCCESS");
                    orders.transition(order, "confirmed", "SYSTEM", "PAYMENT_CONFIRMED");
                    db.update("INSERT INTO public.shipments(id, order_id, status, created_at) VALUES (?, ?, 'PREPARING', ?) ON CONFLICT (order_id) DO NOTHING",
                            UUID.randomUUID(), orderId, now());
                    outbox.enqueue("ORDER_PAID", orderId, "paid:" + paymentId, "Thanh toán thành công qua VNPAY");
                }
            } else {
                throw new ConflictException("PAYMENT_ORDER_STATE_MISMATCH");
            }
        } else if ("pending".equals(status) && "awaiting_payment".equals(order.get("status"))) {
            db.update("UPDATE public.payments SET status='failed' WHERE id=?", paymentId);
            orders.transition(order, "cancelled", "SYSTEM", "PAYMENT_FAILED");
            orders.release(order, null, "PAYMENT_FAILED");
            outbox.enqueue("ORDER_CANCELLED", orderId, "cancelled:" + orderId, "Thanh toán VNPAY thất bại");
        }
    }

    public static Map<String, String> buildIpnResponse(String code) {
        String message = switch (code) {
            case "00" -> "Confirm Success";
            case "01" -> "Order not found";
            case "02" -> "Order already confirmed";
            case "04" -> "Invalid amount";
            case "97" -> "Invalid signature";
            default -> "Processing error";
        };
        return Map.of("RspCode", code, "Message", message);
    }
}
