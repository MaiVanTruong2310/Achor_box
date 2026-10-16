package com.smartbox.backend.controller.admin;

import com.smartbox.backend.service.admin.ConcurrentDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ConcurrentDashboardController {
    private final ConcurrentDashboardService dashboard;
    @GetMapping("/api/admin/dashboard")
    public Map<String,Object> dashboard(@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date,@RequestParam(defaultValue="parallel") String mode) {
        return dashboard.dashboard(date==null?LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")):date,mode);
    }
}
