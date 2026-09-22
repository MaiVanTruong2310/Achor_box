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
        WarrantyClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Khiếu nại bảo hành", "id", claimId));
        claim.setAssignedTo(technicianId);
        claim.setStatus("in_progress");
        return mapToResponse(claimRepository.save(claim));
    }

    @Transactional
    public ClaimResponse updateClaimStatus(UUID claimId, String status) {
        WarrantyClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Khiếu nại bảo hành", "id", claimId));
        claim.setStatus(status);
        if ("resolved".equalsIgnoreCase(status) || "rejected".equalsIgnoreCase(status)) {
            claim.setResolvedAt(OffsetDateTime.now());
        }
        return mapToResponse(claimRepository.save(claim));
    }

    @Transactional
    public ClaimResponse addInternalNote(UUID claimId, String notes) {
        WarrantyClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Khiếu nại bảo hành", "id", claimId));
        claim.setInternalNotes(notes);
        return mapToResponse(claimRepository.save(claim));
    }

    public ClaimResponse mapToResponse(WarrantyClaim c) {
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
                .warrantyStartDate(warranty != null ? warranty.getStartDate() : LocalDate.now().minusDays(30))
                .warrantyEndDate(warranty != null ? warranty.getEndDate() : LocalDate.now().plusDays(335))
                .build();
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

            LocalDate startDate = wOpt.map(Warranty::getStartDate)
                    .orElse(d.getCreatedAt() != null ? d.getCreatedAt().toLocalDate() : LocalDate.of(2026, 1, 15));
            LocalDate endDate = wOpt.map(Warranty::getEndDate)
                    .orElse(startDate.plusMonths(12));
            String status = wOpt.map(Warranty::getStatus).orElse("active");

            long remainingDays = ChronoUnit.DAYS.between(LocalDate.now(), endDate);
            boolean isValid = !"expired".equalsIgnoreCase(status) && remainingDays >= 0;

            String prodName = d.getProduct() != null ? d.getProduct().getName() : "Anchor Box Pro IoT (Bản Cao Cấp)";
            String ownerName = d.getOwner() != null ? maskName(d.getOwner().getFullName()) : "Nguyễn V***";
            String ownerPhone = d.getOwner() != null ? maskPhone(d.getOwner().getPhone()) : "090****567";

            List<String> specs = new ArrayList<>(Arrays.asList(
                    "Chip vi điều khiển: ESP32-S3 Dual-Core 240MHz Wi-Fi/BLE",
                    "Cơ cấu chốt khóa: Solenoid 12V DC trợ lực Servo 90°",
                    "Cảm biến cửa: Cảm biến từ MC-38 chống cạy phá",
                    "Bàn phím: Ma trận 4x4 I2C PCF8574 bọc kim loại",
                    "Màn hình: LCD 1602 I2C Backlight xanh",
                    "Chuẩn kháng nước: IP54 ngoài trời có mái che",
                    "Nguồn cấp: Adapter 12V 2A DC Jack 5.5x2.1mm"
            ));
            if (prodName.toLowerCase().contains("pro") || (d.getWeightKg() != null && d.getWeightKg() > 0)) {
                specs.add("Cảm biến tải trọng: LoadCell HX711 24-bit chống tráo bưu phẩm");
            }

            return WarrantyLookupResponse.builder()
                    .serialNumber(d.getSerialNumber())
                    .productName(prodName)
                    .variantName("Size M (Tiêu chuẩn 85L)")
                    .status(isValid ? "active" : "expired")
                    .statusLabel(isValid ? "Bảo hành chính hãng hợp lệ" : "Hết hạn bảo hành")
                    .startDate(startDate)
                    .endDate(endDate)
                    .remainingDays(Math.max(0, remainingDays))
                    .isValid(isValid)
                    .ownerNameMasked(ownerName)
                    .ownerPhoneMasked(ownerPhone)
                    .locationLabel(d.getLocationLabel() != null ? d.getLocationLabel() : "Hà Nội")
                    .deviceStatus(d.getStatus() != null ? d.getStatus() : "online")
                    .hardwareSpecs(specs)
                    .features(Arrays.asList(
                            "Đổi mới 1-1 trong 30 ngày nếu lỗi do nhà sản xuất",
                            "Miễn phí bảo dưỡng và thay thế Servo/Solenoid chính hãng",
                            "Hỗ trợ cập nhật Firmware OTA từ xa trọn đời",
                            "Kỹ thuật viên hỗ trợ tận nơi trong 24h (Hà Nội & TP.HCM)"
                    ))
                    .build();
        }

        // Demo fallback cho các mã serial hợp lệ trong đồ án (ví dụ DBX-98C377AD9D60, BOX_001)
        LocalDate demoStart = LocalDate.of(2026, 1, 10);
        LocalDate demoEnd = demoStart.plusMonths(12);
        long remainingDays = ChronoUnit.DAYS.between(LocalDate.now(), demoEnd);
        boolean isValid = remainingDays >= 0;

        return WarrantyLookupResponse.builder()
                .serialNumber(cleanSerial)
                .productName("Anchor Box Pro IoT (Bản Cao Cấp)")
                .variantName("Size M (Tiêu chuẩn 85L)")
                .status(isValid ? "active" : "expired")
                .statusLabel(isValid ? "Bảo hành chính hãng hợp lệ" : "Hết hạn bảo hành")
                .startDate(demoStart)
                .endDate(demoEnd)
                .remainingDays(Math.max(0, remainingDays))
                .isValid(isValid)
                .ownerNameMasked("Trần V***")
                .ownerPhoneMasked("098****312")
                .locationLabel("Hà Nội, Việt Nam")
                .deviceStatus("online")
                .hardwareSpecs(Arrays.asList(
                        "Chip vi điều khiển: ESP32-S3 Dual-Core 240MHz Wi-Fi/BLE",
                        "Cơ cấu chốt khóa: Solenoid 12V DC trợ lực Servo 90°",
                        "Cảm biến cửa: Cảm biến từ MC-38 chống cạy phá",
                        "Cảm biến tải trọng: LoadCell HX711 24-bit chống tráo bưu phẩm",
                        "Bàn phím: Ma trận 4x4 I2C PCF8574 bọc kim loại",
                        "Màn hình: LCD 1602 I2C Backlight xanh",
                        "Chuẩn kháng nước: IP54 ngoài trời có mái che",
                        "Nguồn cấp: Adapter 12V 2A DC Jack 5.5x2.1mm"
                ))
                .features(Arrays.asList(
                        "Đổi mới 1-1 trong 30 ngày nếu lỗi phần cứng",
                        "Bảo hành điện tử chính hãng Anchor Box 12 tháng",
                        "Hỗ trợ kỹ thuật qua Hotline và ứng dụng di động",
                        "Cập nhật Firmware hệ thống tự động"
                ))
                .build();
    }

    private String maskName(String name) {
        if (name == null || name.trim().length() <= 2) return "Khách hàng";
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) return parts[0].charAt(0) + "***";
        return parts[0] + " " + parts[parts.length - 1].charAt(0) + "***";
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.trim().length() < 7) return "090****567";
        String p = phone.trim();
        return p.substring(0, 3) + "****" + p.substring(p.length() - 3);
    }
}
