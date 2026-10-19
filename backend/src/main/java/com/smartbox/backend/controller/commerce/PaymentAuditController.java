package com.smartbox.backend.controller.commerce;

import com.smartbox.backend.service.commerce.PaymentAuditService;
import com.smartbox.backend.service.commerce.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Payment API", description = "Kiểm toán và đối soát thanh toán đơn hàng")
public class PaymentAuditController {

    private final PaymentService payments;
    private final PaymentAuditService audit;

    @GetMapping("/api/payments/mode")
    @Operation(summary = "Lấy chế độ thanh toán hiện tại của hệ thống (VNPAY_SANDBOX / DEMO_MOCK)", description = "Kiểm tra chế độ thanh toán đang được cấu hình kích hoạt trên hệ thống (VNPAY_SANDBOX hoặc DEMO_MOCK)")
    public Map<String, Object> mode() {
        return payments.mode();
    }

    @GetMapping("/api/orders/{id}/payment-reconciliation")
    @Operation(summary = "Đối soát trạng thái thanh toán và bản ghi giao dịch của đơn hàng", description = "Đối soát dữ liệu giao dịch giữa hệ thống SmartBox và cổng thanh toán đối tác để phát hiện sai lệch")
    public Map<String, Object> reconcile(@PathVariable UUID id) {
        return audit.reconcile(id);
    }
}
