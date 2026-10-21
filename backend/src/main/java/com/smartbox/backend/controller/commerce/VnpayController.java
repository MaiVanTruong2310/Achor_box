package com.smartbox.backend.controller.commerce;

import com.smartbox.backend.dto.request.commerce.VnpayCreatePaymentRequest;
import com.smartbox.backend.dto.response.commerce.VnpayPaymentResponse;
import com.smartbox.backend.dto.response.commerce.VnpayReturnResponse;
import com.smartbox.backend.service.commerce.PaymentService;
import com.smartbox.backend.service.commerce.VnpayGateway;
import com.smartbox.backend.service.commerce.VnpayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments/vnpay")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Payment API", description = "Tích hợp cổng thanh toán trực tuyến VNPAY Sandbox (NCB Test Card)")
public class VnpayController {

    private final VnpayService vnpayService;
    private final PaymentService payments;
    private final VnpayGateway gateway;

    @Value("${smartbox.vnpay.return-auto-confirm:false}")
    private boolean returnAutoConfirm;

    @PostMapping("/create-url")
    @Operation(summary = "Tạo đường link thanh toán VNPAY cho đơn hàng", description = "Tạo URL chuyển hướng sang cổng thanh toán VNPAY Sandbox cho đơn hàng chỉ định")
    public ResponseEntity<VnpayPaymentResponse> createPaymentUrl(
            @Valid @RequestBody VnpayCreatePaymentRequest request,
            HttpServletRequest servletRequest) {
        String clientIp = servletRequest.getRemoteAddr();
        return ResponseEntity.ok(vnpayService.createPaymentUrlForOrder(request.getOrderId(), clientIp));
    }

    @GetMapping("/ipn")
    @Operation(summary = "Webhook IPN nhận thông báo giao dịch từ server VNPAY", description = "Điểm tiếp nhận thông báo kết quả giao dịch thanh toán tự động (IPN) server-to-server từ VNPAY")
    public Map<String, String> ipn(@RequestParam MultiValueMap<String, String> query) {
        try {
            return payments.vnpayIpn(query);
        } catch (VnpayGateway.InvalidNotification ex) {
            log.warn("VNPAY IPN từ chối: code={}", ex.code());
            return PaymentService.ipnResponse(ex.code());
        } catch (Exception ex) {
            log.warn("VNPAY IPN lỗi xử lý: {}", ex.getMessage());
            return PaymentService.ipnResponse("99");
        }
    }

    @GetMapping("/return")
    @Operation(summary = "Xác thực kết quả thanh toán khi khách hàng được redirect về từ VNPAY", description = "Kiểm tra chữ ký số checksum và đối soát mã phản hồi sau khi khách hàng hoàn tất giao dịch và quay về từ website VNPAY")
    public Map<String, Object> returned(@RequestParam MultiValueMap<String, String> query) {
        var notification = gateway.verify(query);
        boolean confirmed = false;
        if ((returnAutoConfirm || "true".equalsIgnoreCase(query.getFirst("autoConfirm"))) && notification.success()) {
            try {
                var ipnResult = payments.vnpayIpn(query);
                confirmed = "00".equals(ipnResult.get("RspCode")) || "02".equals(ipnResult.get("RspCode"));
                log.info("Xử lý xác nhận thanh toán trực tiếp tại Return URL cho paymentId={}: code={}",
                        notification.reference(), ipnResult.get("RspCode"));
            } catch (Exception ex) {
                log.warn("Không thể xác nhận đơn từ Return URL: {}", ex.getMessage());
            }
        }
        return Map.of(
                "paymentId", VnpayGateway.paymentId(notification.reference()).toString(),
                "signatureValid", true,
                "gatewayResult", notification.success() ? "SUCCESS" : "FAILED",
                "responseCode", notification.responseCode(),
                "transactionStatus", notification.transactionStatus(),
                "transactionNo", notification.transactionNo() != null ? notification.transactionNo() : "",
                "environment", "sandbox",
                "awaitingIpnConfirmation", !confirmed
        );
    }

    @ExceptionHandler(VnpayGateway.InvalidNotification.class)
    public ResponseEntity<Map<String, String>> invalidReturn(VnpayGateway.InvalidNotification ex) {
        log.warn("VNPAY Return hoặc IPN không hợp lệ: code={}", ex.code());
        return ResponseEntity.badRequest().body(Map.of("message", "VNPAY_RETURN_INVALID", "code", ex.code()));
    }
}
