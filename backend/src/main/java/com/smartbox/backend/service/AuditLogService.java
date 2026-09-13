package com.smartbox.backend.service;

import com.smartbox.backend.dto.AuditLogDTO;
import com.smartbox.backend.model.AuditLog;
import com.smartbox.backend.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public List<AuditLogDTO.AuditLogResponse> getRecentLogs() {
        return auditLogRepository.findTop50ByOrderByCreatedAtDesc().stream()
                .map(a -> AuditLogDTO.AuditLogResponse.builder()
                        .id(a.getId())
                        .actorId(a.getActorId())
                        .actorName(a.getActor() != null ? a.getActor().getFullName() : "Admin Hệ Thống")
                        .actorRole(a.getActor() != null ? a.getActor().getRole() : "super_admin")
                        .action(a.getAction())
                        .targetTable(a.getTargetTable())
                        .targetId(a.getTargetId())
                        .meta(a.getMeta())
                        .createdAt(a.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public AuditLogDTO.AuditLogResponse logAction(AuditLogDTO.AuditLogRequest req) {
        AuditLog log = AuditLog.builder()
                .actorId(req.getActorId())
                .action(req.getAction())
                .targetTable(req.getTargetTable())
                .targetId(req.getTargetId())
                .meta(req.getMeta())
                .build();

        AuditLog saved = auditLogRepository.save(log);
        return AuditLogDTO.AuditLogResponse.builder()
                .id(saved.getId())
                .actorId(saved.getActorId())
                .action(saved.getAction())
                .targetTable(saved.getTargetTable())
                .targetId(saved.getTargetId())
                .meta(saved.getMeta())
                .createdAt(saved.getCreatedAt())
                .build();
    }
}
