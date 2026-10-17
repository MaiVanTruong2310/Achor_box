package com.smartbox.backend.controller.commerce;

import com.smartbox.backend.common.AppConstants;
import com.smartbox.backend.dto.request.commerce.OrderStatusUpdateRequest;
import com.smartbox.backend.dto.request.commerce.TrackingUpdateRequest;
import com.smartbox.backend.dto.response.commerce.OrderResponse;
import com.smartbox.backend.service.commerce.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "Order API", description = "Quản lý đơn đặt hàng, trạng thái giao vận và thanh toán")
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả đơn hàng")
    public ResponseEntity<List<OrderResponse>> getOrders() {
        return ResponseEntity.ok(orderService.getOrders());
    }

    @GetMapping("/paged")
    @Operation(summary = "Lấy danh sách đơn hàng có phân trang dạng Map<String, Object>")
    public ResponseEntity<Map<String, Object>> getOrdersPaged(
            @Parameter(description = "Chỉ số trang (0-based)") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size,
            @RequestParam(required=false) String search,@RequestParam(required=false) String status,@RequestParam(required=false) String payment) {
        return ResponseEntity.ok(orderService.getOrdersPaged(page, size,search,status,payment));
    }

    @GetMapping("/counts")
    @Operation(summary = "Lấy thống kê số lượng đơn hàng theo từng trạng thái")
    public ResponseEntity<Map<String, Long>> getOrderCounts() {
        return ResponseEntity.ok(orderService.getOrderCounts());
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Cập nhật trạng thái đơn hàng")
    public ResponseEntity<OrderResponse> updateOrderStatus(
            @PathVariable UUID id,
            @RequestBody OrderStatusUpdateRequest request) {
        return ResponseEntity.ok(orderService.updateOrderStatus(id, request.getStatus()));
    }

    @PatchMapping("/{id}/tracking")
    @Operation(summary = "Cập nhật mã vận đơn")
    public ResponseEntity<OrderResponse> updateTrackingNumber(
            @PathVariable UUID id,
            @RequestBody TrackingUpdateRequest request) {
        return ResponseEntity.ok(orderService.updateTrackingNumber(id, request.getTrackingNumber()));
    }
}
