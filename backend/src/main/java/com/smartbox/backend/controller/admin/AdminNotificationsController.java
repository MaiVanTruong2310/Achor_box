package com.smartbox.backend.controller.admin;

import com.smartbox.backend.service.admin.AdminNotificationsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "Admin Notifications API", description = "Thông báo hệ thống dành cho quản trị viên")
public class AdminNotificationsController {

    private final AdminNotificationsService notifications;

    @GetMapping("/api/admin/notifications")
    @Operation(summary = "Lấy danh sách thông báo quản trị (feed)")
    public ResponseEntity<Map<String, Object>> feed() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(notifications.feed());
    }
}
