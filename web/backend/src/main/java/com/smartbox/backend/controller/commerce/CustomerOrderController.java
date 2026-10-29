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
@Tag(name = "Order API", description = "Quản lý đơn đặt hàng, giỏ hàng, phê duyệt PO và xử lý giao vận")
public class CustomerOrderController {

    private final CustomerOrderService orders;

    @GetMapping
    @Operation(summary = "Lấy danh sách đơn hàng của khách hàng hiện tại có phân trang", description = "Truy xuất lịch sử mua hàng của tài khoản khách hàng đang đăng nhập kèm phân trang")
    public Map<String, Object> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return orders.list(page, size);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết đơn hàng của khách hàng", description = "Xem chi tiết các mặt hàng, giá trị, địa chỉ giao hàng và thông tin thanh toán của đơn hàng cá nhân")
    public Map<String, Object> detail(@PathVariable UUID id) {
        return orders.detail(id);
    }

    @GetMapping("/by-payment/{paymentId}")
    @Operation(summary = "Tra cứu đơn hàng gắn liền với mã giao dịch thanh toán", description = "Tìm kiếm thông tin đơn hàng dựa trên mã thanh toán giao dịch tương ứng sau khi hoàn tất thanh toán")
    public Map<String, Object> paymentOrder(@PathVariable UUID paymentId) {
        return orders.paymentOrder(paymentId);
    }
}
