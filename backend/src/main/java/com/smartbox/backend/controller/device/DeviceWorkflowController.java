package com.smartbox.backend.controller.device;

import com.smartbox.backend.service.device.DeviceWorkflowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequiredArgsConstructor
public class DeviceWorkflowController {
    private final DeviceWorkflowService devices;
    @PostMapping("/api/devices/register") public Map<String,Object> register(@Valid @RequestBody DeviceWorkflowService.Registration request){return devices.register(request);}
    @GetMapping("/api/devices/my-devices") public List<Map<String,Object>> mine(){return devices.myDevices();}
    @PostMapping("/api/devices/{id}/activate") public Map<String,Object> activate(@PathVariable UUID id){return devices.activate(id);}
    @PostMapping("/api/devices/{id}/commands") public Map<String,Object> command(@PathVariable UUID id,@Valid @RequestBody DeviceWorkflowService.Control request){return devices.command(id,request);}
    @GetMapping("/api/devices/{id}/commands/{commandId}") public Map<String,Object> command(@PathVariable UUID id,@PathVariable UUID commandId){return devices.command(id,commandId);}
    @GetMapping("/api/devices/{id}/packages") public List<Map<String,Object>> packages(@PathVariable UUID id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return devices.packages(id,page,size);}
    @GetMapping("/api/devices/{id}/readings") public List<Map<String,Object>> readings(@PathVariable UUID id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return devices.readings(id,page,size);}
}
