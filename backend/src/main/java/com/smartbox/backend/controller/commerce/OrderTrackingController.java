package com.smartbox.backend.controller.commerce;

import com.smartbox.backend.service.commerce.InstallationDashboardService;
import com.smartbox.backend.service.commerce.OrderTrackingService;
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
@Tag(name = "Order Tracking API", description = "Theo dõi tiến độ đơn hàng và tổng quan giao lắp")
public class OrderTrackingController {

    private final OrderTrackingService tracking;
    private final InstallationDashboardService dashboard;

    @GetMapping("/api/orders/{id}/timeline")
    @Operation(summary = "Lấy dòng thời gian tiến độ của đơn hàng (timeline)")
    public Map<String, Object> timeline(@PathVariable UUID id) {
        return tracking.timeline(id);
    }

    @GetMapping("/api/delivery-installations/dashboard")
    @Operation(summary = "Lấy thống kê tóm tắt dashboard giao hàng và lắp đặt")
    public Map<String, Object> dashboard() {
        return dashboard.summary();
    }
}
