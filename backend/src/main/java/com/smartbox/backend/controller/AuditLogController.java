package com.smartbox.backend.controller;

import com.smartbox.backend.dto.AuditLogDTO;
import com.smartbox.backend.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit Log API", description = "Truy vết nhật ký thao tác và hành động của nhân viên quản trị")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @Operation(summary = "Lấy 50 nhật ký thao tác gần nhất")
    public ResponseEntity<List<AuditLogDTO.AuditLogResponse>> getLogs() {
        return ResponseEntity.ok(auditLogService.getRecentLogs());
    }

    @PostMapping
    @Operation(summary = "Ghi nhận một hành động mới vào nhật ký")
    public ResponseEntity<AuditLogDTO.AuditLogResponse> logAction(@RequestBody AuditLogDTO.AuditLogRequest request) {
        return ResponseEntity.ok(auditLogService.logAction(request));
    }
}
