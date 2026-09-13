package com.smartbox.backend.controller;

import com.smartbox.backend.dto.SettingsDTO;
import com.smartbox.backend.model.MessageTemplate;
import com.smartbox.backend.service.SettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@Tag(name = "Settings API", description = "Cấu hình hệ thống, mẫu tin nhắn email/SMS, phương thức vận chuyển và thanh toán")
public class SettingsController {

    private final SettingsService settingsService;

    @GetMapping
    @Operation(summary = "Lấy tất cả cài đặt hệ thống")
    public ResponseEntity<SettingsDTO.SystemSettingsResponse> getSettings() {
        return ResponseEntity.ok(settingsService.getSettings());
    }

    @GetMapping("/templates")
    @Operation(summary = "Lấy danh sách tất cả các mẫu thông báo (Templates)")
    public ResponseEntity<List<MessageTemplate>> getAllTemplates() {
        return ResponseEntity.ok(settingsService.getAllTemplates());
    }

    @GetMapping("/templates/{code}")
    @Operation(summary = "Lấy chi tiết một mẫu thông báo theo mã code")
    public ResponseEntity<MessageTemplate> getTemplateByCode(@PathVariable String code) {
        return ResponseEntity.ok(settingsService.getTemplateByCode(code));
    }

    @PostMapping("/templates")
    @Operation(summary = "Tạo mới hoặc cập nhật mẫu thông báo Email/SMS/Push")
    public ResponseEntity<MessageTemplate> saveTemplate(@RequestBody SettingsDTO.TemplateUpdateRequest request) {
        return ResponseEntity.ok(settingsService.saveTemplate(request));
    }

    @PostMapping("/templates/{code}/reset-default")
    @Operation(summary = "Khôi phục mẫu thông báo về mặc định chuẩn của hệ thống")
    public ResponseEntity<MessageTemplate> resetTemplateToDefault(@PathVariable String code) {
        return ResponseEntity.ok(settingsService.resetToDefault(code));
    }

    @PostMapping("/templates/{code}/test-send")
    @Operation(summary = "Gửi thử nghiệm mẫu thông báo (Test Send via SMTP / Simulation)")
    public ResponseEntity<SettingsDTO.TestSendResponse> testSendTemplate(
            @PathVariable String code,
            @RequestBody SettingsDTO.TestSendTemplateRequest request) {
        request.setTemplateCode(code);
        return ResponseEntity.ok(settingsService.testSendTemplate(request));
    }
}
