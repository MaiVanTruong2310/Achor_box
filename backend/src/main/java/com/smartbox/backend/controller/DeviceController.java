package com.smartbox.backend.controller;

import com.smartbox.backend.dto.DeviceDTO;
import com.smartbox.backend.service.DeviceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
@Tag(name = "Device API", description = "Quản lý thiết bị SmartBox IoT, giám sát telemetry và trạng thái trực tuyến")
public class DeviceController {

    private final DeviceService deviceService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả thiết bị IoT")
    public ResponseEntity<List<DeviceDTO.DeviceResponse>> getAllDevices() {
        return ResponseEntity.ok(deviceService.getAllDevices());
    }

    @GetMapping("/events")
    @Operation(summary = "Lấy lịch sử sự kiện cảm biến telemetry")
    public ResponseEntity<List<DeviceDTO.DeviceEventResponse>> getDeviceEvents(
            @RequestParam(required = false) UUID deviceId) {
        return ResponseEntity.ok(deviceService.getDeviceEvents(deviceId));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Cập nhật trạng thái thiết bị (online, offline, maintenance, error)")
    public ResponseEntity<DeviceDTO.DeviceResponse> updateDeviceStatus(
            @PathVariable UUID id,
            @RequestBody DeviceDTO.StatusUpdateRequest request) {
        return ResponseEntity.ok(deviceService.updateDeviceStatus(id, request.getStatus()));
    }
}
