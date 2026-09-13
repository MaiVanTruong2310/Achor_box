package com.smartbox.backend.service;

import com.smartbox.backend.dto.DeviceDTO;
import com.smartbox.backend.model.Device;
import com.smartbox.backend.model.DeviceEvent;
import com.smartbox.backend.repository.DeviceEventRepository;
import com.smartbox.backend.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final DeviceEventRepository deviceEventRepository;

    @Transactional(readOnly = true)
    public List<DeviceDTO.DeviceResponse> getAllDevices() {
        List<Device> devices = deviceRepository.findAllByOrderByCreatedAtDesc();
        return devices.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DeviceDTO.DeviceResponse> getDevicesByOwnerId(UUID ownerId) {
        List<Device> devices = deviceRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId);
        return devices.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DeviceDTO.DeviceEventResponse> getDeviceEvents(UUID deviceId) {
        List<DeviceEvent> events = (deviceId != null)
                ? deviceEventRepository.findByDeviceIdOrderByCreatedAtDesc(deviceId)
                : deviceEventRepository.findTop50ByOrderByCreatedAtDesc();

        return events.stream().map(e -> DeviceDTO.DeviceEventResponse.builder()
                .id(e.getId())
                .deviceId(e.getDeviceId())
                .deviceSerial(e.getDevice() != null ? e.getDevice().getSerialNumber() : "BOX-2026-001")
                .eventType(e.getEventType())
                .payload(e.getPayload())
                .createdAt(e.getCreatedAt())
                .build()
        ).collect(Collectors.toList());
    }

    @Transactional
    public DeviceDTO.DeviceResponse updateDeviceStatus(UUID id, String status) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Thiết bị không tồn tại: " + id));
        device.setStatus(status);
        device.setLastSeenAt(OffsetDateTime.now());
        return mapToResponse(deviceRepository.save(device));
    }

    private DeviceDTO.DeviceResponse mapToResponse(Device d) {
        int hash = Math.abs(d.getId().hashCode());
        int idx = hash % 10;

        String macAddress = String.format("24:6F:28:B4:7A:%02X", idx + 1);
        String publicIp = "113.190.234." + (10 + idx);
        String localIp = "192.168.1." + (100 + idx);
        int mapX = (idx % 2 == 0) ? (35 + idx * 4) : (65 + idx * 3);
        int mapY = (idx % 2 == 0) ? (22 + idx * 5) : (75 + idx * 2);

        String ownerName = d.getOwner() != null ? d.getOwner().getFullName() : "Admin SmartBox";
        String ownerPhone = d.getOwner() != null ? d.getOwner().getPhone() : "0901234567";
        String productName = d.getProduct() != null ? d.getProduct().getName() : "SmartBox Pro IoT";

        return DeviceDTO.DeviceResponse.builder()
                .id(d.getId())
                .productId(d.getProductId())
                .productName(productName)
                .ownerId(d.getOwnerId())
                .ownerName(ownerName)
                .ownerPhone(ownerPhone)
                .serialNumber(d.getSerialNumber())
                .name(d.getName())
                .locationLabel(d.getLocationLabel() != null ? d.getLocationLabel() : "Hà Nội")
                .status(d.getStatus())
                .batteryLevel(d.getBatteryLevel() != null ? d.getBatteryLevel() : 85)
                .firmwareVersion(d.getFirmwareVersion() != null ? d.getFirmwareVersion() : "v1.2.0")
                .lastSeenAt(d.getLastSeenAt())
                .createdAt(d.getCreatedAt())
                .macAddress(macAddress)
                .chipModel("ESP32-S3 (Dual Core 240MHz)")
                .publicIp(publicIp)
                .localIp(localIp)
                .geoCity(d.getLocationLabel() != null ? d.getLocationLabel() : "Hà Nội")
                .mapX(mapX)
                .mapY(mapY)
                .lockStatus("locked")
                .wifiRssi(-60)
                .pingMs(22)
                .build();
    }
}
