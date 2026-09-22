package com.smartbox.backend.controller;

import com.smartbox.backend.common.AppConstants;
import com.smartbox.backend.dto.request.DeviceStatusUpdateRequest;
import com.smartbox.backend.dto.response.DeviceEventResponse;
import com.smartbox.backend.dto.response.DeviceResponse;
import com.smartbox.backend.service.DeviceService;
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
@Tag(name = "Device API", description = "Quản lý thiết bị SmartBox IoT, giám sát telemetry và trạng thái trực tuyến")
public class DeviceController {

    private final DeviceService deviceService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả thiết bị IoT")
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

    @GetMapping("/events")
    @Operation(summary = "Lấy lịch sử sự kiện cảm biến telemetry")
    public ResponseEntity<List<DeviceEventResponse>> getDeviceEvents(
            @Parameter(description = "ID thiết bị (tùy chọn)") @RequestParam(required = false) UUID deviceId) {
        return ResponseEntity.ok(deviceService.getDeviceEvents(deviceId));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Cập nhật trạng thái thiết bị (online, offline, maintenance, error)")
    public ResponseEntity<DeviceResponse> updateDeviceStatus(
            @PathVariable UUID id,
            @RequestBody DeviceStatusUpdateRequest request) {
        return ResponseEntity.ok(deviceService.updateDeviceStatus(id, request.getStatus()));
    }
}
