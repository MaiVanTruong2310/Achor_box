package com.smartbox.backend.controller.commerce;

import com.smartbox.backend.service.commerce.CustomerOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/customer/orders")
@RequiredArgsConstructor
@Tag(name = "Customer Orders API", description = "Xem danh sách và chi tiết đơn hàng dành cho tài khoản khách hàng")
public class CustomerOrderController {

    private final CustomerOrderService orders;

    @GetMapping
    @Operation(summary = "Lấy danh sách đơn hàng của khách hàng hiện tại có phân trang")
    public Map<String, Object> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return orders.list(page, size);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết đơn hàng của khách hàng")
    public Map<String, Object> detail(@PathVariable UUID id) {
        return orders.detail(id);
    }

    @GetMapping("/by-payment/{paymentId}")
    @Operation(summary = "Tra cứu đơn hàng gắn liền với mã giao dịch thanh toán")
    public Map<String, Object> paymentOrder(@PathVariable UUID paymentId) {
        return orders.paymentOrder(paymentId);
    }
}
