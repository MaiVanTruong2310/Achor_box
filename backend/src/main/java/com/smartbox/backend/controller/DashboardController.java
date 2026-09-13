package com.smartbox.backend.controller;

import com.smartbox.backend.dto.DashboardStatsDTO;
import com.smartbox.backend.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard API", description = "Các API tổng hợp số liệu báo cáo, KPI và biểu đồ doanh thu")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @Operation(summary = "Lấy dữ liệu thống kê tổng quan Dashboard", description = "Trả về tổng doanh thu, số đơn hàng, số thiết bị online, ticket bảo hành và biểu đồ doanh thu theo khoảng thời gian (7d, 30d, 6m). Hỗ trợ cache tự động.")
    public ResponseEntity<DashboardStatsDTO> getDashboardStats(
            @Parameter(description = "Khoảng thời gian: 7d (7 ngày), 30d (30 ngày), 6m (6 tháng)")
            @RequestParam(defaultValue = "6m", required = false) String range) {
        return ResponseEntity.ok(dashboardService.getDashboardStats(range));
    }
}

