package com.smartbox.backend.controller.admin;

import com.smartbox.backend.service.admin.ConcurrentDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "Dashboard API", description = "Các API tổng hợp số liệu báo cáo, KPI và biểu đồ doanh thu")
public class ConcurrentDashboardController {
    private final ConcurrentDashboardService dashboard;

    @GetMapping("/api/admin/dashboard")
    @Operation(summary = "Tổng hợp số liệu Dashboard Admin đồng thời (Concurrent)", description = "Tính toán song song các chỉ số vận hành, doanh thu, đơn hàng và thiết bị theo ngày chỉ định nhằm tối ưu tốc độ phản hồi")
    public Map<String,Object> dashboard(@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date,@RequestParam(defaultValue="parallel") String mode) {
        return dashboard.dashboard(date==null?LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")):date,mode);
    }
}
