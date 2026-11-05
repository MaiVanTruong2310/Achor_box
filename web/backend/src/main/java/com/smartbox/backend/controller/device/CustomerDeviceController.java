package com.smartbox.backend.controller.device;

import com.smartbox.backend.dto.response.device.DeviceResponse;
import com.smartbox.backend.exception.ResourceNotFoundException;
import com.smartbox.backend.repository.OrderItemRepository;
import com.smartbox.backend.repository.WarrantyRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.service.device.DeviceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
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
    private final OrderItemRepository orderItemRepository;
    private final JdbcTemplate jdbc;

    @GetMapping
    @Transactional(readOnly = true)
    @Operation(summary = "Lấy danh sách thiết bị của khách hàng có phân trang", description = "Truy xuất danh sách thiết bị SmartBox đã kích hoạt kèm thông tin bảo hành của tài khoản khách hàng")
    public Map<String, Object> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        actors.get().requireRoles("customer");
        UUID ownerId = actors.get().id();
        List<DeviceResponse> devices = deviceService.getDevicesByOwnerId(ownerId);
        List<Map<String, Object>> all = batchEnrichDevices(devices);

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
    @Transactional(readOnly = true)
    @Operation(summary = "Lấy chi tiết thiết bị của khách hàng theo ID", description = "Xem chi tiết một thiết bị SmartBox bao gồm tình trạng khóa, cửa, dung lượng pin và phiếu bảo hành liên kết")
    public ResponseEntity<Map<String, Object>> detail(@PathVariable UUID id) {
        actors.get().requireRoles("customer");
        UUID ownerId = actors.get().id();
        List<DeviceResponse> devices = deviceService.getDevicesByOwnerId(ownerId);
        Optional<DeviceResponse> match = devices.stream().filter(d -> id.equals(d.getId())).findFirst();
        if (match.isEmpty()) {
            throw new ResourceNotFoundException("Thiết bị", "id", id);
        }
        List<Map<String, Object>> enriched = batchEnrichDevices(List.of(match.get()));
        return ResponseEntity.ok(enriched.getFirst());
    }

    /**
     * Batch enrichment giải quyết triệt để vấn đề N+1 query:
     * Gom tất cả DeviceId để truy vấn bảo hành, order item và phân quyền chia sẻ thiết bị
     * chỉ trong tối đa 3 câu truy vấn SQL gom nhóm, sau đó ghép nối dữ liệu trong bộ nhớ (O(1)).
     */
    private List<Map<String, Object>> batchEnrichDevices(List<DeviceResponse> devices) {
        if (devices.isEmpty()) return Collections.emptyList();

        List<UUID> deviceIds = devices.stream().map(DeviceResponse::getId).toList();

        // 1. Batch query warranties
        Map<UUID, Map<String, Object>> warrantyMap = new HashMap<>();
        List<UUID> orderItemIds = new ArrayList<>();
        try {
            String inSql = String.join(",", Collections.nCopies(deviceIds.size(), "?"));
            List<Map<String, Object>> wRows = jdbc.queryForList(
                "SELECT id, device_id, order_item_id, start_date, end_date, status, created_at " +
                "FROM public.warranties WHERE device_id IN (" + inSql + ")",
                deviceIds.toArray()
            );
            for (var row : wRows) {
                UUID devId = (UUID) row.get("device_id");
                warrantyMap.put(devId, row);
                UUID oiId = (UUID) row.get("order_item_id");
                if (oiId != null) orderItemIds.add(oiId);
            }
        } catch (Exception ignored) {}

        // 2. Batch query order items for variant name & orderId
        Map<UUID, Map<String, Object>> orderItemMap = new HashMap<>();
        if (!orderItemIds.isEmpty()) {
            try {
                String inSql = String.join(",", Collections.nCopies(orderItemIds.size(), "?"));
                List<Map<String, Object>> oiRows = jdbc.queryForList(
                    "SELECT id, order_id, variant_name_snapshot FROM public.order_items WHERE id IN (" + inSql + ")",
                    orderItemIds.toArray()
                );
                for (var row : oiRows) {
                    orderItemMap.put((UUID) row.get("id"), row);
                }
            } catch (Exception ignored) {}
        }

        // 3. Batch query shared members
        Map<UUID, List<Map<String, Object>>> sharedMap = new HashMap<>();
        try {
            String inSql = String.join(",", Collections.nCopies(deviceIds.size(), "?"));
            List<Map<String, Object>> daRows = jdbc.queryForList(
                "SELECT da.device_id, da.user_id AS \"userId\", p.full_name AS \"fullName\", p.email, p.avatar_url AS \"avatarUrl\", " +
                "da.level::text AS \"accessLevel\", da.created_at AS \"grantedAt\" " +
                "FROM public.device_access da " +
                "JOIN public.profiles p ON p.id = da.user_id " +
                "WHERE da.device_id IN (" + inSql + ") " +
                "ORDER BY da.created_at ASC",
                deviceIds.toArray()
            );
            for (var row : daRows) {
                UUID devId = (UUID) row.get("device_id");
                sharedMap.computeIfAbsent(devId, k -> new ArrayList<>()).add(row);
            }
        } catch (Exception ignored) {}

        // 4. Assemble in-memory
        List<Map<String, Object>> result = new ArrayList<>(devices.size());
        for (DeviceResponse device : devices) {
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

            var w = warrantyMap.get(device.getId());
            if (w != null) {
                map.put("warrantyId", w.get("id"));
                map.put("startDate", w.get("start_date") != null ? w.get("start_date").toString() : null);
                map.put("endDate", w.get("end_date") != null ? w.get("end_date").toString() : null);
                map.put("warrantyStatus", w.get("status"));
                map.put("acceptedAt", w.get("start_date") != null ? w.get("start_date").toString() : null);

                UUID oiId = (UUID) w.get("order_item_id");
                var oi = oiId != null ? orderItemMap.get(oiId) : null;
                if (oi != null) {
                    map.put("orderId", oi.get("order_id"));
                    map.put("variantName", oi.get("variant_name_snapshot"));
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

            map.put("sharedMembers", sharedMap.getOrDefault(device.getId(), Collections.emptyList()));
            result.add(map);
        }
        return result;
    }
}
