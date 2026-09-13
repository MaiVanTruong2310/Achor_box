package com.smartbox.backend.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class WarrantyClaimDTO {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ClaimResponse {
        private UUID id;
        private UUID warrantyId;
        private String description;
        private List<String> images;
        private String status;
        private UUID assignedTo;
        private String assigneeName;
        private String assigneePhone;
        private String internalNotes;
        private OffsetDateTime createdAt;
        private OffsetDateTime resolvedAt;
        private String serialNumber;
        private String deviceName;
        private String customerName;
        private String customerPhone;
        private String customerAddress;
        private String faultCategory;
        private LocalDate warrantyStartDate;
        private LocalDate warrantyEndDate;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignTechnicianRequest {
        private UUID technicianId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusUpdateRequest {
        private String status;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NotesUpdateRequest {
        private String notes;
    }
}
