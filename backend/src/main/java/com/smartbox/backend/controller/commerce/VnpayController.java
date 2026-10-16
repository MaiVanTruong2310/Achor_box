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
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments/vnpay")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "VNPAY Payment Gateway API", description = "Tích hợp cổng thanh toán trực tuyến VNPAY Sandbox (NCB Test Card)")
public class VnpayController {

    private final VnpayService vnpayService;
    private final PaymentService payments;
    private final VnpayGateway gateway;

    @PostMapping("/create-url")
    @Operation(summary = "Tạo đường link thanh toán VNPAY cho đơn hàng")
    public ResponseEntity<VnpayPaymentResponse> createPaymentUrl(
            @Valid @RequestBody VnpayCreatePaymentRequest request,
            HttpServletRequest servletRequest) {
        String clientIp = servletRequest.getRemoteAddr();
        return ResponseEntity.ok(vnpayService.createPaymentUrlForOrder(request.getOrderId(), clientIp));
    }

    @GetMapping("/ipn")
    @Operation(summary = "Webhook IPN nhận thông báo giao dịch từ server VNPAY")
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
    @Operation(summary = "Xác thực kết quả thanh toán khi khách hàng được redirect về từ VNPAY")
    public Map<String, Object> returned(@RequestParam MultiValueMap<String, String> query) {
        var notification = gateway.verify(query);
        return Map.of(
                "paymentId", VnpayGateway.paymentId(notification.reference()).toString(),
                "signatureValid", true,
                "gatewayResult", notification.success() ? "SUCCESS" : "FAILED",
                "responseCode", notification.responseCode(),
                "transactionStatus", notification.transactionStatus(),
                "transactionNo", notification.transactionNo() != null ? notification.transactionNo() : "",
                "environment", "sandbox",
                "awaitingIpnConfirmation", true
        );
    }

    @ExceptionHandler(VnpayGateway.InvalidNotification.class)
    public ResponseEntity<Map<String, String>> invalidReturn(VnpayGateway.InvalidNotification ex) {
        log.warn("VNPAY Return hoặc IPN không hợp lệ: code={}", ex.code());
        return ResponseEntity.badRequest().body(Map.of("message", "VNPAY_RETURN_INVALID", "code", ex.code()));
    }
}
