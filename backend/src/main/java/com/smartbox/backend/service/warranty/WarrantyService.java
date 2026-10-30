package com.smartbox.backend.service.warranty;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.common.AdminSearch;
import com.smartbox.backend.common.PaginationUtil;
import com.smartbox.backend.dto.response.warranty.ClaimResponse;
import com.smartbox.backend.dto.response.warranty.WarrantyLookupResponse;
import com.smartbox.backend.entity.Device;
import com.smartbox.backend.entity.Warranty;
import com.smartbox.backend.entity.WarrantyClaim;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ForbiddenException;
import com.smartbox.backend.exception.ResourceNotFoundException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.repository.DeviceRepository;
import com.smartbox.backend.repository.ProfileRepository;
import com.smartbox.backend.repository.WarrantyClaimRepository;
import com.smartbox.backend.repository.WarrantyRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WarrantyService {

    private final WarrantyClaimRepository claimRepository;
    private final DeviceRepository deviceRepository;
    private final WarrantyRepository warrantyRepository;
    private final ProfileRepository profiles;
    private final CurrentActor actors;
    private final CommerceRepository db;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional(readOnly = true)
    public List<Map<String, Object>> technicians() {
        actors.get().requireRoles("super_admin", "product_manager");
        return db.list(
                "SELECT id, full_name AS \"fullName\", phone FROM public.profiles " +
                "WHERE CAST(role AS text) = 'technician' AND is_locked = false " +
                "ORDER BY full_name, id"
        );
    }

    @Transactional(readOnly = true)
    public List<ClaimResponse> getClaims() {
        var actor = actors.get();
        actor.requireRoles("super_admin", "product_manager", "technician");

        var claims = "technician".equals(actor.role())
                ? claimRepository.findByAssignedToOrderByCreatedAtDesc(actor.id())
                : claimRepository.findAllByOrderByCreatedAtDesc();

        return mapClaimsToResponses(claims);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getClaimsPaged(int page, int size) {
        var actor = actors.get();
        actor.requireRoles("super_admin", "product_manager", "technician");

        Pageable pageable = AdminSearch.page(page, size);
        Page<WarrantyClaim> pageClaims = "technician".equals(actor.role())
                ? claimRepository.findByAssignedTo(actor.id(), pageable)
                : claimRepository.findAll(pageable);

        List<ClaimResponse> responses = mapClaimsToResponses(pageClaims.getContent());
        Page<ClaimResponse> pageResult = new org.springframework.data.domain.PageImpl<>(
                responses, pageClaims.getPageable(), pageClaims.getTotalElements()
        );

        return PaginationUtil.toMap(pageResult);
    }

    @Transactional(readOnly = true)
    public List<ClaimResponse> getClaimsByDeviceIds(List<UUID> deviceIds) {
        if (deviceIds == null || deviceIds.isEmpty()) {
            return Collections.emptyList();
        }
        return mapClaimsToResponses(claimRepository.findByDeviceIds(deviceIds));
    }

    @Transactional
    public ClaimResponse assignTechnician(UUID claimId, UUID technicianId) {
        actors.get().requireRoles("super_admin", "product_manager");

        if (technicianId == null) {
            throw new BadRequestException("TECHNICIAN_REQUIRED");
        }

        var technician = profiles.findById(technicianId)
                .orElseThrow(() -> new ResourceNotFoundException("Kỹ thuật viên", "id", technicianId));

        if (!"technician".equals(technician.getRole()) || Boolean.TRUE.equals(technician.getIsLocked())) {
            throw new BadRequestException("INVALID_TECHNICIAN");
        }

        WarrantyClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Khiếu nại bảo hành", "id", claimId));

        claim.setAssignedTo(technicianId);
        claim.setStatus("in_progress");
        db.audit(actors.get().id(), "WARRANTY_CLAIM_ASSIGNED", "warranty_claims", claimId, technicianId.toString());

        UUID notifId = UUID.randomUUID();
        String code = claimId.toString().substring(0, 8).toUpperCase();
        db.update(
                "INSERT INTO public.notifications(id, user_id, type, title, body, is_read, created_at) " +
                "VALUES(?, ?, ?, ?, ?, false, NOW())",
                notifId, technicianId, "TASK_ASSIGNED", "Có yêu cầu bảo hành mới!",
                "Bạn vừa được phân công xử lý phiếu bảo hành #" + code + " [claim:" + claimId + "]"
        );
        db.update(
                "INSERT INTO public.push_outbox(id, notification_id, status, attempts, next_attempt_at) " +
                "VALUES(?, ?, 'PENDING', 0, NOW())",
                UUID.randomUUID(), notifId
        );

        return mapToResponse(claimRepository.save(claim));
    }

    @Transactional
    public ClaimResponse updateClaimStatus(UUID claimId, String status) {
        if (status == null || !Set.of("new", "assigned", "in_progress", "resolved", "rejected").contains(status)) {
            throw new BadRequestException("INVALID_CLAIM_STATUS");
        }

        WarrantyClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Khiếu nại bảo hành", "id", claimId));

        authorizeClaim(claim);
        claim.setStatus(status);
        db.audit(actors.get().id(), "WARRANTY_CLAIM_STATUS_CHANGED", "warranty_claims", claimId, status);

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

        if (notes == null || notes.length() > 10000) {
            throw new BadRequestException("INVALID_CLAIM_NOTES");
        }

        claim.setInternalNotes(notes);
        db.audit(actors.get().id(), "WARRANTY_CLAIM_NOTE_CHANGED", "warranty_claims", claimId, "Internal note updated");

        return mapToResponse(claimRepository.save(claim));
    }

    public List<ClaimResponse> mapClaimsToResponses(List<WarrantyClaim> claims) {
        if (claims == null || claims.isEmpty()) {
            return Collections.emptyList();
        }

        Set<UUID> customerIds = claims.stream()
                .map(WarrantyClaim::getCustomerId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, com.smartbox.backend.entity.Profile> customerMap = customerIds.isEmpty()
                ? Collections.emptyMap()
                : profiles.findAllById(customerIds).stream()
                        .collect(Collectors.toMap(com.smartbox.backend.entity.Profile::getId, p -> p));

        return claims.stream()
                .map(c -> mapToResponse(c, customerMap.get(c.getCustomerId())))
                .collect(Collectors.toList());
    }

    public ClaimResponse mapToResponse(WarrantyClaim c) {
        com.smartbox.backend.entity.Profile customer = c.getCustomerId() != null
                ? profiles.findById(c.getCustomerId()).orElse(null)
                : null;
        return mapToResponse(c, customer);
    }

    public ClaimResponse mapToResponse(WarrantyClaim c, com.smartbox.backend.entity.Profile customer) {
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

        if (customer != null) {
            customerName = customer.getFullName();
            customerPhone = customer.getPhone();
            customerAddress = customer.getDefaultAddress();
        }

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
        var actor = actors.get();
        actor.requireRoles("super_admin", "product_manager", "technician");

        if ("technician".equals(actor.role()) && !actor.id().equals(claim.getAssignedTo())) {
            throw new ForbiddenException("CLAIM_NOT_ASSIGNED_TO_TECHNICIAN");
        }
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

            if (wOpt.isEmpty()) {
                throw new ResourceNotFoundException("Bảo hành", "serial", cleanSerial);
            }

            Warranty warranty = wOpt.get();
            LocalDate startDate = warranty.getStartDate();
            LocalDate endDate = warranty.getEndDate();
            String status = warranty.getStatus();

            LocalDate nowVietnam = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
            long remainingDays = ChronoUnit.DAYS.between(nowVietnam, endDate);
            boolean isValid = "active".equalsIgnoreCase(status) && remainingDays >= 0 && !nowVietnam.isBefore(startDate);

            String prodName = d.getProduct() != null ? d.getProduct().getName() : null;
            String ownerName = d.getOwner() != null ? maskName(d.getOwner().getFullName()) : null;
            String ownerPhone = d.getOwner() != null ? maskPhone(d.getOwner().getPhone()) : null;

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
                    .hardwareSpecs(Collections.emptyList())
                    .features(Collections.emptyList())
                    .build();
        }

        throw new ResourceNotFoundException("Thiết bị", "serial", cleanSerial);
    }

    private String maskName(String name) {
        if (name == null || name.trim().length() <= 2) {
            return "Khách hàng";
        }
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) {
            return parts[0].charAt(0) + "***";
        }
        return parts[0] + " " + parts[parts.length - 1].charAt(0) + "***";
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.trim().length() < 7) {
            return null;
        }
        String p = phone.trim();
        return p.substring(0, 3) + "****" + p.substring(p.length() - 3);
    }
}
