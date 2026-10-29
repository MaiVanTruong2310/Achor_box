package com.smartbox.backend.controller.device;

import com.smartbox.backend.service.device.DeviceWorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequiredArgsConstructor
@Tag(name = "Device Inventory API", description = "Quản lý mã Serial và danh mục thiết bị đã xuất kho")
public class DeviceWorkflowController {
    private final DeviceWorkflowService devices;

    @PostMapping("/api/devices/register")
    @Operation(summary = "Đăng ký mã Serial thiết bị vào kho hàng", description = "Khai báo nhập kho thiết bị SmartBox IoT mới kèm mã Serial Number, phiên bản phần cứng và ngày sản xuất")
    public Map<String, Object> register(@Valid @RequestBody DeviceWorkflowService.Registration request) {
        return devices.register(request);
    }

    @PostMapping("/api/devices/register-batch")
    @Operation(summary = "Đăng ký danh sách mã Serial thiết bị vào kho (Hàng loạt)", description = "Khai báo nhập kho hàng loạt thiết bị SmartBox IoT mới kèm mã Serial Number, phiên bản phần cứng và MQTT Topic")
    public Map<String, Object> registerBatch(@Valid @RequestBody List<DeviceWorkflowService.Registration> requests) {
        return devices.registerBatch(requests);
    }
}

