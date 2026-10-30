package com.smartbox.backend.controller.commerce;

import com.smartbox.backend.dto.request.commerce.OrderLookupRequest;
import com.smartbox.backend.dto.response.commerce.OrderLookupResponse;
import com.smartbox.backend.service.commerce.OrderLookupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders/lookup")
@RequiredArgsConstructor
@Tag(name = "Order Tracking & Lookup API", description = "Tra cứu nhanh tiến độ đơn hàng công khai theo mã đơn hoặc số điện thoại")
public class OrderLookupController {

    private final OrderLookupService orderLookupService;

    @PostMapping
    @Operation(
            summary = "Tra cứu tiến độ đơn hàng công khai (POST Body)",
            description = "Cho phép khách hàng tra cứu chi tiết tiến trình đơn hàng bằng mã đơn và/hoặc số điện thoại"
    )
    public ResponseEntity<OrderLookupResponse> lookup(@RequestBody(required = false) OrderLookupRequest request) {
        return ResponseEntity.ok(orderLookupService.lookup(request));
    }

    @GetMapping
    @Operation(
            summary = "Tra cứu tiến độ đơn hàng công khai qua Query Params (GET)",
            description = "Hỗ trợ tra cứu nhanh qua GET query param ?orderId=...&phone=..."
    )
    public ResponseEntity<OrderLookupResponse> lookupGet(
            @Parameter(description = "Mã đơn hàng UUID hoặc tiền tố mã đơn")
            @RequestParam(required = false) String orderId,

            @Parameter(description = "Số điện thoại nhận hàng")
            @RequestParam(required = false) String phone
    ) {
        return ResponseEntity.ok(orderLookupService.lookup(new OrderLookupRequest(orderId, phone)));
    }
}
