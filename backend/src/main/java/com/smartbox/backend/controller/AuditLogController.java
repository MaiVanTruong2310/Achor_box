package com.smartbox.backend.controller;

import com.smartbox.backend.common.AppConstants;
import com.smartbox.backend.dto.request.AuditLogRequest;
import com.smartbox.backend.dto.response.AuditLogResponse;
import com.smartbox.backend.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit Log API", description = "Truy vết nhật ký thao tác và hành động của nhân viên quản trị")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @Operation(summary = "Lấy 50 nhật ký thao tác gần nhất")
    public ResponseEntity<List<AuditLogResponse>> getLogs() {
        return ResponseEntity.ok(auditLogService.getRecentLogs());
    }

    @GetMapping("/paged")
    @Operation(summary = "Lấy danh sách nhật ký kiểm toán có phân trang dạng Map<String, Object>")
    public ResponseEntity<Map<String, Object>> getLogsPaged(
            @Parameter(description = "Chỉ số trang (0-based)") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size) {
        return ResponseEntity.ok(auditLogService.getLogsPaged(page, size));
    }

    @PostMapping
    @Operation(summary = "Ghi nhận một hành động mới vào nhật ký")
    public ResponseEntity<AuditLogResponse> logAction(@RequestBody AuditLogRequest request) {
        return ResponseEntity.ok(auditLogService.logAction(request));
    }
}
