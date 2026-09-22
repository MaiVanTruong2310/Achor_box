package com.smartbox.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarrantyLookupResponse {
    private String serialNumber;
    private String productName;
    private String variantName;
    private String status;
    private String statusLabel;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long remainingDays;
    private Boolean isValid;
    private String ownerNameMasked;
    private String ownerPhoneMasked;
    private String locationLabel;
    private String deviceStatus;
    private List<String> features;
    private List<String> hardwareSpecs;
}
