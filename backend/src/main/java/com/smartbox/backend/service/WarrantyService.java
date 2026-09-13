package com.smartbox.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.dto.WarrantyClaimDTO;
import com.smartbox.backend.model.Device;
import com.smartbox.backend.model.Warranty;
import com.smartbox.backend.model.WarrantyClaim;
import com.smartbox.backend.repository.WarrantyClaimRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WarrantyService {

    private final WarrantyClaimRepository claimRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional(readOnly = true)
    public List<WarrantyClaimDTO.ClaimResponse> getClaims() {
        return claimRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WarrantyClaimDTO.ClaimResponse> getClaimsByDeviceIds(List<UUID> deviceIds) {
        if (deviceIds == null || deviceIds.isEmpty()) return Collections.emptyList();
        return claimRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(c -> c.getWarranty() != null && deviceIds.contains(c.getWarranty().getDeviceId()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public WarrantyClaimDTO.ClaimResponse assignTechnician(UUID claimId, UUID technicianId) {
        WarrantyClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khiếu nại bảo hành: " + claimId));
        claim.setAssignedTo(technicianId);
        claim.setStatus("in_progress");
        return mapToResponse(claimRepository.save(claim));
    }

    @Transactional
    public WarrantyClaimDTO.ClaimResponse updateClaimStatus(UUID claimId, String status) {
        WarrantyClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khiếu nại bảo hành: " + claimId));
        claim.setStatus(status);
        if ("resolved".equalsIgnoreCase(status) || "rejected".equalsIgnoreCase(status)) {
            claim.setResolvedAt(OffsetDateTime.now());
        }
        return mapToResponse(claimRepository.save(claim));
    }

    @Transactional
    public WarrantyClaimDTO.ClaimResponse addInternalNote(UUID claimId, String notes) {
        WarrantyClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khiếu nại bảo hành: " + claimId));
        claim.setInternalNotes(notes);
        return mapToResponse(claimRepository.save(claim));
    }

    private WarrantyClaimDTO.ClaimResponse mapToResponse(WarrantyClaim c) {
        List<String> parsedImages = Collections.singletonList("https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500");
        if (c.getImages() != null && !c.getImages().isEmpty()) {
            try {
                parsedImages = objectMapper.readValue(c.getImages(), new TypeReference<List<String>>() {});
            } catch (Exception e) {
                parsedImages = Collections.singletonList(c.getImages());
            }
        }

        Warranty warranty = c.getWarranty();
        Device device = warranty != null ? warranty.getDevice() : null;
        String serialNumber = device != null ? device.getSerialNumber() : "BOX-2026-001";
        String deviceName = device != null && device.getName() != null ? device.getName() : "Hộp Smart Delivery Box";

        String customerName = "Khách hàng SmartBox";
        String customerPhone = "0901234567";
        String customerAddress = "Hà Nội";

        if (warranty != null && warranty.getOrderItem() != null && warranty.getOrderItem().getOrder() != null) {
            var ord = warranty.getOrderItem().getOrder();
            if (ord.getCustomer() != null) {
                customerName = ord.getCustomer().getFullName();
                customerPhone = ord.getCustomer().getPhone();
            }
            if (ord.getShippingAddress() != null) {
                customerAddress = ord.getShippingAddress();
            }
        }

        String assigneeName = c.getAssignee() != null ? c.getAssignee().getFullName() : null;
        String assigneePhone = c.getAssignee() != null ? c.getAssignee().getPhone() : null;

        String faultCat = "sensor_fault";
        if (c.getDescription() != null) {
            if (c.getDescription().contains("Servo") || c.getDescription().contains("kẹt") || c.getDescription().contains("chốt")) {
                faultCat = "mechanical_jam";
            } else if (c.getDescription().contains("cân") || c.getDescription().contains("HX711") || c.getDescription().contains("lệch")) {
                faultCat = "scale_deviation";
            }
        }

        return WarrantyClaimDTO.ClaimResponse.builder()
                .id(c.getId())
                .warrantyId(c.getWarrantyId())
                .description(c.getDescription())
                .images(parsedImages)
                .status(c.getStatus())
                .assignedTo(c.getAssignedTo())
                .assigneeName(assigneeName)
                .assigneePhone(assigneePhone)
                .internalNotes(c.getInternalNotes())
                .createdAt(c.getCreatedAt())
                .resolvedAt(c.getResolvedAt())
                .serialNumber(serialNumber)
                .deviceName(deviceName)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .customerAddress(customerAddress)
                .faultCategory(faultCat)
                .warrantyStartDate(warranty != null ? warranty.getStartDate() : LocalDate.now().minusDays(30))
                .warrantyEndDate(warranty != null ? warranty.getEndDate() : LocalDate.now().plusDays(335))
                .build();
    }
}
