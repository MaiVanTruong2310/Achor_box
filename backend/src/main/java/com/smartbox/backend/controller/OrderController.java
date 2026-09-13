package com.smartbox.backend.controller;

import com.smartbox.backend.dto.OrderDTO;
import com.smartbox.backend.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "Order API", description = "Quản lý đơn đặt hàng, trạng thái giao vận và thanh toán")
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả đơn hàng")
    public ResponseEntity<List<OrderDTO.OrderResponse>> getOrders() {
        return ResponseEntity.ok(orderService.getOrders());
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Cập nhật trạng thái đơn hàng")
    public ResponseEntity<OrderDTO.OrderResponse> updateOrderStatus(
            @PathVariable UUID id,
            @RequestBody OrderDTO.StatusUpdateRequest request) {
        return ResponseEntity.ok(orderService.updateOrderStatus(id, request.getStatus()));
    }

    @PatchMapping("/{id}/tracking")
    @Operation(summary = "Cập nhật mã vận đơn")
    public ResponseEntity<OrderDTO.OrderResponse> updateTrackingNumber(
            @PathVariable UUID id,
            @RequestBody OrderDTO.TrackingUpdateRequest request) {
        return ResponseEntity.ok(orderService.updateTrackingNumber(id, request.getTrackingNumber()));
    }
}
