package com.smartbox.backend.controller;
import com.smartbox.backend.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequiredArgsConstructor
public class OrderTrackingController {
    private final OrderTrackingService tracking;private final InstallationDashboardService dashboard;
    @GetMapping("/api/orders/{id}/timeline") public Map<String,Object> timeline(@PathVariable UUID id){return tracking.timeline(id);}
    @GetMapping("/api/delivery-installations/dashboard") public Map<String,Object> dashboard(){return dashboard.summary();}
}
