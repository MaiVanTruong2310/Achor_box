package com.smartbox.backend.service;

import com.smartbox.backend.common.PaginationUtil;
import com.smartbox.backend.dto.request.AuditLogRequest;
import com.smartbox.backend.dto.response.AuditLogResponse;
import com.smartbox.backend.entity.AuditLog;
import com.smartbox.backend.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getRecentLogs() {
        return auditLogRepository.findTop50ByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getLogsPaged(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AuditLogResponse> pageResult = auditLogRepository.findAll(pageable).map(this::mapToResponse);
        return PaginationUtil.toMap(pageResult);
    }

    @Transactional
    public AuditLogResponse logAction(AuditLogRequest req) {
        AuditLog log = AuditLog.builder()
                .actorId(req.getActorId())
                .action(req.getAction())
                .targetTable(req.getTargetTable())
                .targetId(req.getTargetId())
                .meta(req.getMeta())
                .build();

        AuditLog saved = auditLogRepository.save(log);
        return mapToResponse(saved);
    }

    private AuditLogResponse mapToResponse(AuditLog a) {
        return AuditLogResponse.builder()
                .id(a.getId())
                .actorId(a.getActorId())
                .actorName(a.getActor() != null ? a.getActor().getFullName() : "Admin Hệ Thống")
                .actorRole(a.getActor() != null ? a.getActor().getRole() : "super_admin")
                .action(a.getAction())
                .targetTable(a.getTargetTable())
                .targetId(a.getTargetId())
                .meta(a.getMeta())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
