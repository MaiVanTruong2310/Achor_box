package com.smartbox.backend.controller.commerce;

import com.smartbox.backend.dto.request.commerce.CommerceRequests;
import com.smartbox.backend.service.commerce.PaymentService;
import com.smartbox.backend.service.commerce.OrderWorkflowService;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.exception.BadRequestException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.*;

/** Authenticated simulation only. Never enable the demo profile for real payments. */
@RestController
@Profile("demo")
@RequiredArgsConstructor
@RequestMapping({"/mock-payment/payments","/api/mock-payment/payments"})
@Tag(name = "Payment API", description = "Kiểm toán, đối soát và tích hợp cổng thanh toán trực tuyến (VNPAY Sandbox & Simulation)")
public class MockPaymentController {
    private final CommerceRepository db;
    private final OrderWorkflowService orders;
    private final CurrentActor actors;
    private final PaymentService payments;

    @GetMapping("/{id}")
    @Transactional(readOnly=true)
    @Operation(summary = "Xem chi tiết giao dịch thanh toán mô phỏng", description = "Truy vấn thông tin giao dịch thanh toán trong môi trường mô phỏng demo")
    public Map<String,Object> detail(@PathVariable UUID id) {
        var payment=db.one("SELECT * FROM public.payments WHERE id=?",id);
        orders.owned(uuid(payment.get("order_id")),actors.get(),false);
        if(!"mock".equals(payment.get("provider")))throw new com.smartbox.backend.exception.ForbiddenException("MOCK_CALLBACK_PROVIDER_MISMATCH");
        return payment;
    }

    @PostMapping("/{id}/complete")
    @Transactional
    @Operation(summary = "Mô phỏng hoàn tất thanh toán", description = "Giả lập phản hồi kết quả thanh toán SUCCESS/FAILED từ phía người dùng trong môi trường demo")
    public Map<String,Object> complete(@PathVariable UUID id,@RequestParam String result) {
        if(!Set.of("SUCCESS","FAILED").contains(result))throw new BadRequestException("INVALID_PAYMENT_RESULT");
        var payment=detail(id);UUID order=uuid(payment.get("order_id"));var amount=money(payment.get("amount"));
        return payments.callback(new CommerceRequests.Callback(id,order,amount,result,payments.sign(id,order,amount,result)));
    }
}
