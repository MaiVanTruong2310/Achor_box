package com.smartbox.backend.controller.device;

import com.smartbox.backend.dto.response.device.DeviceResponse;
import com.smartbox.backend.entity.Warranty;
import com.smartbox.backend.exception.ResourceNotFoundException;
import com.smartbox.backend.repository.WarrantyRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.service.device.DeviceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/customer/devices")
@RequiredArgsConstructor
@Tag(name = "Customer Device API", description = "Truy xuất danh sách thiết bị AnchorBox thuộc quyền sở hữu của khách hàng")
public class CustomerDeviceController {

    private final DeviceService deviceService;
    private final CurrentActor actors;
    private final WarrantyRepository warrantyRepository;

    @GetMapping
    @Operation(summary = "Lấy danh sách thiết bị của khách hàng có phân trang", description = "Truy xuất danh sách thiết bị SmartBox đã kích hoạt kèm thông tin bảo hành của tài khoản khách hàng")
    public Map<String, Object> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        actors.get().requireRoles("customer");
        UUID ownerId = actors.get().id();
        List<DeviceResponse> devices = deviceService.getDevicesByOwnerId(ownerId);
        List<Map<String, Object>> all = devices.stream().map(this::enrichDevice).toList();

        int totalElements = all.size();
        int safeSize = Math.max(1, size);
        int totalPages = (int) Math.ceil((double) totalElements / safeSize);
        int start = Math.min(page * safeSize, totalElements);
        int end = Math.min(start + safeSize, totalElements);
        List<Map<String, Object>> paged = all.subList(start, end);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", paged);
        result.put("page", page);
        result.put("size", safeSize);
        result.put("totalElements", totalElements);
        result.put("totalPages", Math.max(1, totalPages));
        return result;
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết thiết bị của khách hàng theo ID", description = "Xem chi tiết một thiết bị SmartBox bao gồm tình trạng khóa, cửa, dung lượng pin và phiếu bảo hành liên kết")
    public ResponseEntity<Map<String, Object>> detail(@PathVariable UUID id) {
        actors.get().requireRoles("customer");
        UUID ownerId = actors.get().id();
        List<DeviceResponse> devices = deviceService.getDevicesByOwnerId(ownerId);
        Optional<DeviceResponse> match = devices.stream().filter(d -> id.equals(d.getId())).findFirst();
        if (match.isEmpty()) {
            throw new ResourceNotFoundException("Thiết bị", "id", id);
        }
        return ResponseEntity.ok(enrichDevice(match.get()));
    }

    private Map<String, Object> enrichDevice(DeviceResponse device) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", device.getId());
        map.put("productId", device.getProductId());
        map.put("productName", device.getProductName() != null ? device.getProductName() : "AnchorBox");
        map.put("serialNumber", device.getSerialNumber());
        map.put("name", device.getName());
        map.put("locationLabel", device.getLocationLabel());
        map.put("status", device.getStatus());
        map.put("batteryLevel", device.getBatteryLevel());
        map.put("firmwareVersion", device.getFirmwareVersion());
        map.put("lastSeenAt", device.getLastSeenAt());
        map.put("createdAt", device.getCreatedAt());
        map.put("doorStatus", device.getDoorStatus());
        map.put("lockStatus", device.getLockStatus());
        map.put("weightKg", device.getWeightKg());
        map.put("packageDetected", device.getPackageDetected());

        Optional<Warranty> warrantyOpt = warrantyRepository.findByDeviceId(device.getId());
        if (warrantyOpt.isPresent()) {
            Warranty w = warrantyOpt.get();
            map.put("warrantyId", w.getId());
            map.put("startDate", w.getStartDate() != null ? w.getStartDate().toString() : null);
            map.put("endDate", w.getEndDate() != null ? w.getEndDate().toString() : null);
            map.put("warrantyStatus", w.getStatus());
            map.put("acceptedAt", w.getStartDate() != null ? w.getStartDate().toString() : null);
            if (w.getOrderItem() != null) {
                map.put("orderId", w.getOrderItem().getOrderId());
                map.put("variantName", w.getOrderItem().getVariantNameSnapshot());
            } else {
                map.put("orderId", null);
                map.put("variantName", null);
            }
        } else {
            map.put("warrantyId", null);
            map.put("startDate", null);
            map.put("endDate", null);
            map.put("warrantyStatus", null);
            map.put("acceptedAt", null);
            map.put("orderId", null);
            map.put("variantName", null);
        }
        return map;
    }
}
