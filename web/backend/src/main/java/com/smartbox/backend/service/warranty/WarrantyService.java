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
import com.smartbox.backend.exception.ConflictException;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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

    public static final String REJECTION_REASON_PREFIX = "[Lý do từ chối]";
    private static final Set<String> VALID_CLAIM_STATUSES = Set.of("new", "assigned", "in_progress", "resolved", "rejected");

    /** Allowed next statuses per role. Assignment (new/assigned/in_progress -> assigned) goes through assignTechnician. */
    private static final Map<String, Set<String>> MANAGER_NEXT = Map.of(
            "new", Set.of("rejected"),
            "assigned", Set.of("in_progress", "rejected"),
            "in_progress", Set.of("resolved", "rejected"),
            "resolved", Set.of(),
            "rejected", Set.of());
    private static final Map<String, Set<String>> TECHNICIAN_NEXT = Map.of(
            "new", Set.of(),
            "assigned", Set.of("in_progress"),
            "in_progress", Set.of("resolved"),
            "resolved", Set.of(),
            "rejected", Set.of());
    private static final Set<String> CLOSED = Set.of("resolved", "rejected");
    private static final Map<String, String> CUSTOMER_STATUS_TEXT = Map.of(
            "assigned", "đã được phân công kỹ thuật viên",
            "in_progress", "đang được kỹ thuật viên xử lý",
            "resolved", "đã xử lý xong",
            "rejected", "không được chấp nhận bảo hành");

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
        return getClaimsPaged(page, size, null, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getClaimsPaged(int page, int size, String status, String search) {
        var actor = actors.get();
        actor.requireRoles("super_admin", "product_manager", "technician");

        AdminSearch.page(page, size);
        String filter = status == null ? "" : status.trim().toLowerCase(Locale.ROOT);
        if ("all".equals(filter)) {
            filter = "";
        }
        if (!filter.isEmpty() && !VALID_CLAIM_STATUSES.contains(filter)) {
            throw new BadRequestException("INVALID_CLAIM_STATUS");
        }
        String term = AdminSearch.term(search);
        boolean isTech = "technician".equals(actor.role());
        UUID techId = isTech ? actor.id() : new UUID(0L, 0L);

        Page<WarrantyClaim> pageClaims = claimRepository.search(
                term,
                AdminSearch.like(term),
                filter,
                isTech,
                techId,
                PageRequest.of(page, size)
        );

        List<ClaimResponse> responses = mapClaimsToResponses(pageClaims.getContent());
        Page<ClaimResponse> pageResult = new PageImpl<>(
                responses, pageClaims.getPageable(), pageClaims.getTotalElements()
        );

        return PaginationUtil.toMap(pageResult);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getClaimCounts() {
        var actor = actors.get();
        actor.requireRoles("super_admin", "product_manager", "technician");

        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("all", 0L);
        counts.put("new", 0L);
        counts.put("assigned", 0L);
        counts.put("in_progress", 0L);
        counts.put("resolved", 0L);
        counts.put("rejected", 0L);

        List<Object[]> rows = "technician".equals(actor.role())
                ? claimRepository.countGroupByStatusForAssignee(actor.id())
                : claimRepository.countGroupByStatus();

        long total = 0L;
        for (Object[] r : rows) {
            if (r != null && r.length >= 2 && r[0] != null && r[1] != null) {
                String st = r[0].toString();
                long cnt = ((Number) r[1]).longValue();
                counts.put(st, cnt);
                total += cnt;
            }
        }
        counts.put("all", total);
        return counts;
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
        if (CLOSED.contains(claim.getStatus())) {
            throw new ConflictException("CLAIM_CLOSED");
        }

        claim.setAssignedTo(technicianId);
        claim.setStatus("assigned");
        claim.setResolvedAt(null);
        notifyCustomer(claim, "assigned");
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
        return updateClaimStatus(claimId, status, null);
    }

    @Transactional
    public ClaimResponse updateClaimStatus(UUID claimId, String status, String reason) {
        if (status == null || !VALID_CLAIM_STATUSES.contains(status)) {
            throw new BadRequestException("INVALID_CLAIM_STATUS");
        }

        WarrantyClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Khiếu nại bảo hành", "id", claimId));

        authorizeClaim(claim);
        String current = claim.getStatus();
        if (status.equals(current)) {
            return mapToResponse(claim);
        }
        var allowed = ("technician".equals(actors.get().role()) ? TECHNICIAN_NEXT : MANAGER_NEXT).getOrDefault(current, Set.of());
        if (!allowed.contains(status)) {
            throw new ConflictException("INVALID_CLAIM_TRANSITION: " + current + " -> " + status);
        }
        if (Set.of("in_progress", "resolved").contains(status) && claim.getAssignedTo() == null) {
            throw new ConflictException("CLAIM_NOT_ASSIGNED");
        }
        if ("rejected".equals(status)) {
            String cleanReason = reason == null ? "" : reason.replaceAll("[\\r\\n]+", " ").trim();
            if (cleanReason.isEmpty()) {
                String existingReason = extractRejectionReason("rejected", claim.getInternalNotes());
                if (existingReason == null || existingReason.isBlank()) {
                    throw new BadRequestException("REJECTION_REASON_REQUIRED");
                }
            } else {
                if (cleanReason.length() > 2000) {
                    throw new BadRequestException("INVALID_REJECTION_REASON");
                }
                String stamp = REJECTION_REASON_PREFIX + " " + cleanReason;
                String existing = claim.getInternalNotes();
                String merged = existing == null || existing.isBlank() ? stamp : existing + System.lineSeparator() + stamp;
                if (merged.length() > 10000) {
                    throw new BadRequestException("INVALID_CLAIM_NOTES");
                }
                claim.setInternalNotes(merged);
            }
        }
        claim.setStatus(status);
        db.audit(actors.get().id(), "WARRANTY_CLAIM_STATUS_CHANGED", "warranty_claims", claimId, current + " -> " + status);
        claim.setResolvedAt(CLOSED.contains(status) ? OffsetDateTime.now() : null);
        notifyCustomer(claim, status);

        return mapToResponse(claimRepository.save(claim));
    }

    /**
     * Technician finishes a warranty task card: must be the assignee (or a manager), the claim must be in progress,
     * the completion note is appended to internal notes and proof photos are kept with the claim images.
     */
    @Transactional
    public ClaimResponse completeFromTask(UUID claimId, String note, List<String> proofPhotos) {
        WarrantyClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Khiếu nại bảo hành", "id", claimId));
        authorizeClaim(claim);
        if (proofPhotos == null || proofPhotos.stream().noneMatch(p -> p != null && !p.isBlank())) {
            throw new BadRequestException("COMPLETION_PROOF_REQUIRED");
        }
        String cleanNote = note == null ? "" : note.trim();
        if (!cleanNote.isEmpty()) {
            String stamp = "[Hoàn tất " + LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")) + "] " + cleanNote;
            String existing = claim.getInternalNotes();
            String merged = existing == null || existing.isBlank() ? stamp : existing + System.lineSeparator() + stamp;
            if (merged.length() > 10000) {
                throw new BadRequestException("INVALID_CLAIM_NOTES");
            }
            claim.setInternalNotes(merged);
        }
        List<String> images = new java.util.ArrayList<>();
        if (claim.getImages() != null && !claim.getImages().isBlank()) {
            try {
                images.addAll(objectMapper.readValue(claim.getImages(), new TypeReference<List<String>>() {}));
            } catch (Exception ignored) {
                // keep only the new proof photos when legacy data is not a JSON array
            }
        }
        proofPhotos.stream().filter(p -> p != null && !p.isBlank()).map(String::trim).filter(p -> !images.contains(p)).forEach(images::add);
        try {
            claim.setImages(objectMapper.writeValueAsString(images));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
        claimRepository.save(claim);
        return updateClaimStatus(claimId, "resolved");
    }

    @Transactional
    public ClaimResponse addInternalNote(UUID claimId, String notes) {
        WarrantyClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Khiếu nại bảo hành", "id", claimId));

        authorizeClaim(claim);

        if (notes == null || notes.length() > 10000) {
            throw new BadRequestException("INVALID_CLAIM_NOTES");
        }

        String existingReason = extractRejectionReason(claim.getStatus(), claim.getInternalNotes());
        String updatedNotes = notes;
        if (existingReason != null && extractRejectionReason("rejected", notes) == null) {
            String stamp = REJECTION_REASON_PREFIX + " " + existingReason;
            updatedNotes = notes.isBlank() ? stamp : notes + System.lineSeparator() + stamp;
            if (updatedNotes.length() > 10000) {
                throw new BadRequestException("INVALID_CLAIM_NOTES");
            }
        }

        claim.setInternalNotes(updatedNotes);
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

        String faultCat = classifyFaultCategory(c.getDescription());
        String rejectionReason = extractRejectionReason(c.getStatus(), c.getInternalNotes());

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
                .rejectionReason(rejectionReason)
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

    public static String extractRejectionReason(String status, String internalNotes) {
        if (!"rejected".equalsIgnoreCase(status) || internalNotes == null || internalNotes.isBlank()) {
            return null;
        }
        String found = null;
        for (String line : internalNotes.split("\\r?\\n")) {
            String trimmed = line.trim();
            if (trimmed.startsWith(REJECTION_REASON_PREFIX)) {
                String candidate = trimmed.substring(REJECTION_REASON_PREFIX.length()).trim();
                if (!candidate.isEmpty()) {
                    found = candidate;
                }
            }
        }
        return found;
    }

    public static String classifyFaultCategory(String description) {
        if (description == null || description.isBlank()) {
            return "other";
        }
        String trimmed = description.trim();
        if (trimmed.startsWith("[")) {
            int closeIdx = trimmed.indexOf(']');
            if (closeIdx > 1) {
                String tag = trimmed.substring(1, closeIdx).trim().toLowerCase(Locale.ROOT);
                switch (tag) {
                    case "khóa / cửa hộp":
                    case "khoa / cua hop":
                    case "mechanical_jam":
                        return "mechanical_jam";
                    case "cảm biến cân":
                    case "cam bien can":
                    case "scale_deviation":
                        return "scale_deviation";
                    case "nguồn điện":
                    case "nguon dien":
                    case "power_supply":
                        return "power_supply";
                    case "wi-fi & ứng dụng":
                    case "wifi & ứng dụng":
                    case "connectivity":
                        return "connectivity";
                    case "bàn phím / màn hình":
                    case "ban phim / man hinh":
                    case "keypad_display":
                        return "keypad_display";
                    case "khác":
                    case "khac":
                    case "other":
                        return "other";
                    default:
                        break;
                }
            }
        }
        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (lower.contains("servo") || lower.contains("kẹt") || lower.contains("chốt") || lower.contains("khóa") || lower.contains("cửa hộp")) {
            return "mechanical_jam";
        }
        if (lower.contains("cảm biến cân") || lower.contains("hx711") || lower.contains("lệch cân") || lower.contains("loadcell") || lower.contains("sai số cân")) {
            return "scale_deviation";
        }
        if (lower.contains("nguồn điện") || lower.contains("mất nguồn") || lower.contains("adapter") || lower.contains("sạc")) {
            return "power_supply";
        }
        if (lower.contains("wi-fi") || lower.contains("wifi") || lower.contains("kết nối") || lower.contains("ứng dụng") || lower.contains("mqtt")) {
            return "connectivity";
        }
        if (lower.contains("bàn phím") || lower.contains("màn hình") || lower.contains("oled") || lower.contains("nút bấm")) {
            return "keypad_display";
        }
        return "other";
    }

    /** Tells the customer their claim moved; uses the app's stable 'system' notification type. */
    private void notifyCustomer(WarrantyClaim claim, String status) {
        String text = CUSTOMER_STATUS_TEXT.get(status);
        if (claim.getCustomerId() == null || text == null) {
            return;
        }
        String code = claim.getId().toString().substring(0, 8).toUpperCase();
        String body = "Yêu cầu bảo hành #" + code + " " + text + ".";
        if ("rejected".equals(status)) {
            String reason = extractRejectionReason("rejected", claim.getInternalNotes());
            if (reason != null && !reason.isBlank()) {
                body += " Lý do: " + reason;
            }
        }
        db.update(
                "INSERT INTO public.notifications(id, user_id, type, title, body, is_read, created_at) VALUES(?, ?, 'system', ?, ?, false, NOW())",
                UUID.randomUUID(), claim.getCustomerId(), "Cập nhật yêu cầu bảo hành",
                body);
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

    private static final java.util.regex.Pattern PUBLIC_SERIAL = java.util.regex.Pattern.compile("[A-Z0-9][A-Z0-9-]{3,63}");

    @Transactional(readOnly = true)
    public java.util.Map<String, Object> publicLookup(String serialNumber) {
        String serial = serialNumber == null ? "" : serialNumber.trim().toUpperCase();
        if (!PUBLIC_SERIAL.matcher(serial).matches()) {
            throw new BadRequestException("INVALID_SERIAL");
        }
        WarrantyLookupResponse found;
        try {
            found = lookupWarrantyBySerial(serial);
        } catch (ResourceNotFoundException ex) {
            throw new ResourceNotFoundException("WARRANTY_NOT_FOUND");
        }
        var result = new java.util.LinkedHashMap<String, Object>();
        result.put("serialNumber", found.getSerialNumber());
        result.put("productName", found.getProductName());
        result.put("valid", Boolean.TRUE.equals(found.getIsValid()));
        result.put("startDate", found.getStartDate() == null ? null : found.getStartDate().toString());
        result.put("endDate", found.getEndDate() == null ? null : found.getEndDate().toString());
        result.put("remainingDays", found.getRemainingDays());
        return result;
    }
}
