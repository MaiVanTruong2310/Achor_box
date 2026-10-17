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
@Tag(name = "Device Inventory API", description = "Đăng ký mã Serial và thiết bị vào kho phân phối")
public class DeviceWorkflowController {
    private final DeviceWorkflowService devices;

    @PostMapping("/api/devices/register")
    @Operation(summary = "Đăng ký mã Serial thiết bị vào kho hàng")
    public Map<String, Object> register(@Valid @RequestBody DeviceWorkflowService.Registration request) {
        return devices.register(request);
    }
}

