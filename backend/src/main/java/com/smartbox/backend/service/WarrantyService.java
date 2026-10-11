package com.smartbox.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.common.PaginationUtil;
import com.smartbox.backend.dto.response.ClaimResponse;
import com.smartbox.backend.entity.Device;
import com.smartbox.backend.entity.Warranty;
import com.smartbox.backend.entity.WarrantyClaim;
import com.smartbox.backend.exception.ResourceNotFoundException;
import com.smartbox.backend.dto.response.WarrantyLookupResponse;
import com.smartbox.backend.repository.DeviceRepository;
import com.smartbox.backend.repository.WarrantyClaimRepository;
import com.smartbox.backend.repository.WarrantyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WarrantyService {

    private final WarrantyClaimRepository claimRepository;
    private final DeviceRepository deviceRepository;
    private final WarrantyRepository warrantyRepository;
    private final com.smartbox.backend.repository.ProfileRepository profiles;
    private final com.smartbox.backend.security.CurrentActor actors;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional(readOnly = true)
    public List<ClaimResponse> getClaims() {
        return claimRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getClaimsPaged(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ClaimResponse> pageResult = claimRepository.findAll(pageable).map(this::mapToResponse);
        return PaginationUtil.toMap(pageResult);
    }

    @Transactional(readOnly = true)
    public List<ClaimResponse> getClaimsByDeviceIds(List<UUID> deviceIds) {
        if (deviceIds == null || deviceIds.isEmpty()) return Collections.emptyList();
        return claimRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(c -> c.getWarranty() != null && deviceIds.contains(c.getWarranty().getDeviceId()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ClaimResponse assignTechnician(UUID claimId, UUID technicianId) {
        actors.get().requireRoles("super_admin","support_agent");
        if(technicianId==null)throw new com.smartbox.backend.exception.BadRequestException("TECHNICIAN_REQUIRED");
        var technician=profiles.findById(technicianId).orElseThrow(()->new ResourceNotFoundException("Kỹ thuật viên","id",technicianId));
        if(!"technician".equals(technician.getRole())||Boolean.TRUE.equals(technician.getIsLocked()))throw new com.smartbox.backend.exception.BadRequestException("INVALID_TECHNICIAN");
        WarrantyClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Khiếu nại bảo hành", "id", claimId));
        claim.setAssignedTo(technicianId);
        claim.setStatus("in_progress");
        return mapToResponse(claimRepository.save(claim));
    }

    @Transactional
    public ClaimResponse updateClaimStatus(UUID claimId, String status) {
        if(status==null||!java.util.Set.of("new","assigned","in_progress","resolved","rejected").contains(status))throw new com.smartbox.backend.exception.BadRequestException("INVALID_CLAIM_STATUS");
        WarrantyClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Khiếu nại bảo hành", "id", claimId));
        authorizeClaim(claim);
        claim.setStatus(status);
        claim.setResolvedAt(null);
        if ("resolved".equalsIgnoreCase(status) || "rejected".equalsIgnoreCase(status)) {
            claim.setResolvedAt(OffsetDateTime.now());
        }
        return mapToResponse(claimRepository.save(claim));
    }

    @Transactional
    public ClaimResponse addInternalNote(UUID claimId, String notes) {
        WarrantyClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Khiếu nại bảo hành", "id", claimId));
        authorizeClaim(claim);
        claim.setInternalNotes(notes);
        return mapToResponse(claimRepository.save(claim));
    }

    public ClaimResponse mapToResponse(WarrantyClaim c) {
        List<String> parsedImages = Collections.emptyList();
        if (c.getImages() != null && !c.getImages().isEmpty()) {
            try {
                parsedImages = objectMapper.readValue(c.getImages(), new TypeReference<List<String>>() {});
            } catch (Exception e) {
                parsedImages = Collections.singletonList(c.getImages());
            }
        }

        Warranty warranty = c.getWarranty();
        Device device = warranty != null ? warranty.getDevice() : null;
        String serialNumber = device != null ? device.getSerialNumber() : null;
        String deviceName = device != null ? device.getName() : null;

        String customerName = null;
        String customerPhone = null;
        String customerAddress = null;

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

        return ClaimResponse.builder()
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
                .warrantyStartDate(warranty != null ? warranty.getStartDate() : null)
                .warrantyEndDate(warranty != null ? warranty.getEndDate() : null)
                .build();
    }

    private void authorizeClaim(WarrantyClaim claim) {
        var actor=actors.get();actor.requireRoles("super_admin","support_agent","technician");
        if("technician".equals(actor.role())&&!actor.id().equals(claim.getAssignedTo()))throw new com.smartbox.backend.exception.ForbiddenException("CLAIM_NOT_ASSIGNED_TO_TECHNICIAN");
    }

    @Transactional(readOnly = true)
    public WarrantyLookupResponse lookupWarrantyBySerial(String serialNumber) {
        if (serialNumber == null || serialNumber.trim().isEmpty()) {
            throw new IllegalArgumentException("Mã Serial thiết bị không được để trống");
        }
        String cleanSerial = serialNumber.trim().toUpperCase();
        Optional<Device> deviceOpt = deviceRepository.findBySerialNumber(cleanSerial);

        if (deviceOpt.isPresent()) {
            Device d = deviceOpt.get();
            Optional<Warranty> wOpt = warrantyRepository.findByDeviceId(d.getId());

            if(wOpt.isEmpty()) throw new ResourceNotFoundException("Bảo hành", "serial", cleanSerial);
            LocalDate startDate = wOpt.orElseThrow().getStartDate();
            LocalDate endDate = wOpt.orElseThrow().getEndDate();
            String status = wOpt.orElseThrow().getStatus();

            long remainingDays = ChronoUnit.DAYS.between(LocalDate.now(), endDate);
            boolean isValid = "active".equalsIgnoreCase(status) && remainingDays >= 0 && !LocalDate.now().isBefore(startDate);

            String prodName = d.getProduct() != null ? d.getProduct().getName() : null;
            String ownerName = d.getOwner() != null ? maskName(d.getOwner().getFullName()) : null;
            String ownerPhone = d.getOwner() != null ? maskPhone(d.getOwner().getPhone()) : null;

            List<String> specs = Collections.emptyList();
            return WarrantyLookupResponse.builder()
                    .serialNumber(d.getSerialNumber())
                    .productName(prodName)
                    .variantName(null)
                    .status(isValid ? "active" : "expired")
                    .statusLabel(isValid ? "Bảo hành chính hãng hợp lệ" : "Hết hạn bảo hành")
                    .startDate(startDate)
                    .endDate(endDate)
                    .remainingDays(Math.max(0, remainingDays))
                    .isValid(isValid)
                    .ownerNameMasked(ownerName)
                    .ownerPhoneMasked(ownerPhone)
                    .locationLabel(d.getLocationLabel())
                    .deviceStatus(d.getStatus())
                    .hardwareSpecs(specs)
                    .features(Collections.emptyList())
                    .build();
        }

        throw new ResourceNotFoundException("Thiết bị", "serial", cleanSerial);
    }

    private String maskName(String name) {
        if (name == null || name.trim().length() <= 2) return "Khách hàng";
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) return parts[0].charAt(0) + "***";
        return parts[0] + " " + parts[parts.length - 1].charAt(0) + "***";
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.trim().length() < 7) return null;
        String p = phone.trim();
        return p.substring(0, 3) + "****" + p.substring(p.length() - 3);
    }
}
