package com.smartbox.backend.controller.device;

import com.smartbox.backend.common.AppConstants;
import com.smartbox.backend.dto.request.device.DeviceStatusUpdateRequest;
import com.smartbox.backend.dto.response.device.DeviceEventResponse;
import com.smartbox.backend.dto.response.device.DeviceResponse;
import com.smartbox.backend.service.device.DeviceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
@Tag(name = "Device Inventory API", description = "Quản lý mã Serial và danh mục thiết bị đã xuất kho")
public class DeviceController {

    private final DeviceService deviceService;

    @GetMapping
    @Operation(summary = "Lấy danh sách mã Serial thiết bị trong kho")
    public ResponseEntity<List<DeviceResponse>> getAllDevices() {
        return ResponseEntity.ok(deviceService.getAllDevices());
    }

    @GetMapping("/paged")
    @Operation(summary = "Lấy danh sách thiết bị có phân trang dạng Map<String, Object>")
    public ResponseEntity<Map<String, Object>> getDevicesPaged(
            @Parameter(description = "Chỉ số trang (0-based)") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size) {
        return ResponseEntity.ok(deviceService.getDevicesPaged(page, size));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Cập nhật trạng thái bảo quản thiết bị trong kho (in_stock, maintenance, defective)")
    public ResponseEntity<DeviceResponse> updateDeviceStatus(
            @PathVariable UUID id,
            @RequestBody DeviceStatusUpdateRequest request) {
        return ResponseEntity.ok(deviceService.updateDeviceStatus(id, request.getStatus()));
    }
}
