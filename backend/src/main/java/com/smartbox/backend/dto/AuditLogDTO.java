package com.smartbox.backend.dto;

import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

public class AuditLogDTO {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AuditLogResponse {
        private UUID id;
        private UUID actorId;
        private String actorName;
        private String actorRole;
        private String action;
        private String targetTable;
        private UUID targetId;
        private String meta;
        private OffsetDateTime createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AuditLogRequest {
        private UUID actorId;
        private String action;
        private String targetTable;
        private UUID targetId;
        private String meta;
    }
}
