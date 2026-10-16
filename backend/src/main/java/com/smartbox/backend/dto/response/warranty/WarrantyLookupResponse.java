package com.smartbox.backend.dto.response.warranty;

import com.smartbox.backend.dto.request.admin.*;
import com.smartbox.backend.dto.request.auth.*;
import com.smartbox.backend.dto.request.catalog.*;
import com.smartbox.backend.dto.request.commerce.*;
import com.smartbox.backend.dto.request.customer.*;
import com.smartbox.backend.dto.request.device.*;
import com.smartbox.backend.dto.request.warranty.*;
import com.smartbox.backend.dto.response.admin.*;
import com.smartbox.backend.dto.response.auth.*;
import com.smartbox.backend.dto.response.catalog.*;
import com.smartbox.backend.dto.response.commerce.*;
import com.smartbox.backend.dto.response.customer.*;
import com.smartbox.backend.dto.response.device.*;
import com.smartbox.backend.dto.response.warranty.*;

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
