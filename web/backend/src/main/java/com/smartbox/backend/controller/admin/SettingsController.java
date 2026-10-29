package com.smartbox.backend.controller.admin;

import com.smartbox.backend.dto.request.admin.TemplateUpdateRequest;
import com.smartbox.backend.dto.request.admin.TestSendTemplateRequest;
import com.smartbox.backend.dto.response.admin.SystemSettingsResponse;
import com.smartbox.backend.dto.response.admin.TestSendResponse;
import com.smartbox.backend.entity.MessageTemplate;
import com.smartbox.backend.service.admin.SettingsService;
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
    @Operation(summary = "Lấy tất cả cài đặt hệ thống", description = "Truy xuất thông tin cấu hình chung của toàn bộ hệ thống SmartBox")
    public ResponseEntity<SystemSettingsResponse> getSettings() {
        return ResponseEntity.ok(settingsService.getSettings());
    }

    @GetMapping("/templates")
    @Operation(summary = "Lấy danh sách tất cả các mẫu thông báo (Templates)", description = "Lấy toàn bộ mẫu tin nhắn thông báo Email, SMS và Push Notification đang hoạt động")
    public ResponseEntity<List<MessageTemplate>> getAllTemplates() {
        return ResponseEntity.ok(settingsService.getAllTemplates());
    }

    @GetMapping("/templates/{code}")
    @Operation(summary = "Lấy chi tiết một mẫu thông báo theo mã code", description = "Xem tiêu đề, nội dung mẫu và danh sách biến động của một mẫu thông báo cụ thể")
    public ResponseEntity<MessageTemplate> getTemplateByCode(@PathVariable String code) {
        return ResponseEntity.ok(settingsService.getTemplateByCode(code));
    }

    @PostMapping("/templates")
    @Operation(summary = "Tạo mới hoặc cập nhật mẫu thông báo Email/SMS/Push", description = "Lưu nội dung cấu hình mẫu thông báo gửi khách hàng và nhân viên khi có sự kiện hệ thống")
    public ResponseEntity<MessageTemplate> saveTemplate(@RequestBody TemplateUpdateRequest request) {
        return ResponseEntity.ok(settingsService.saveTemplate(request));
    }

    @PostMapping("/templates/{code}/reset-default")
    @Operation(summary = "Khôi phục mẫu thông báo về mặc định chuẩn của hệ thống", description = "Khôi phục lại nội dung và tiêu đề mẫu thông báo về giá trị mặc định ban đầu do hệ thống cung cấp")
    public ResponseEntity<MessageTemplate> resetTemplateToDefault(@PathVariable String code) {
        return ResponseEntity.ok(settingsService.resetToDefault(code));
    }

    @PostMapping("/templates/{code}/test-send")
    @Operation(summary = "Gửi thử nghiệm mẫu thông báo (Test Send via SMTP / Simulation)", description = "Gửi email hoặc tin nhắn kiểm thử với dữ liệu giả lập đến địa chỉ nhận chỉ định để kiểm tra giao diện và nội dung")
    public ResponseEntity<TestSendResponse> testSendTemplate(
            @PathVariable String code,
            @RequestBody TestSendTemplateRequest request) {
        request.setTemplateCode(code);
        return ResponseEntity.ok(settingsService.testSendTemplate(request));
    }
}
