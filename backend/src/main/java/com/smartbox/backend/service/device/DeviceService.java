package com.smartbox.backend.service.device;

import com.smartbox.backend.common.PaginationUtil;
import com.smartbox.backend.dto.response.device.DeviceEventResponse;
import com.smartbox.backend.dto.response.device.DeviceResponse;
import com.smartbox.backend.entity.Device;
import com.smartbox.backend.entity.DeviceEvent;
import com.smartbox.backend.exception.ResourceNotFoundException;
import com.smartbox.backend.repository.DeviceEventRepository;
import com.smartbox.backend.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final DeviceEventRepository deviceEventRepository;

    @Transactional(readOnly = true)
    public List<DeviceResponse> getAllDevices() {
        List<Device> devices = deviceRepository.findAllByOrderByCreatedAtDesc();
        return devices.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDevicesPaged(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<DeviceResponse> pageResult = deviceRepository.findAll(pageable).map(this::mapToResponse);
        return PaginationUtil.toMap(pageResult);
    }

    @Transactional(readOnly = true)
    public List<DeviceResponse> getDevicesByOwnerId(UUID ownerId) {
        List<Device> devices = deviceRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId);
        return devices.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DeviceEventResponse> getDeviceEvents(UUID deviceId) {
        List<DeviceEvent> events = (deviceId != null)
                ? deviceEventRepository.findByDeviceIdOrderByCreatedAtDesc(deviceId)
                : deviceEventRepository.findTop50ByOrderByCreatedAtDesc();

        return events.stream().map(e -> DeviceEventResponse.builder()
                .id(e.getId())
                .deviceId(e.getDeviceId())
                .deviceSerial(e.getDevice() != null ? e.getDevice().getSerialNumber() : null)
                .eventType(e.getEventType())
                .payload(e.getPayload())
                .createdAt(e.getCreatedAt())
                .build()
        ).collect(Collectors.toList());
    }

    @Transactional
    public DeviceResponse updateDeviceStatus(UUID id, String status) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Thiết bị", "id", id));
        if(!java.util.Set.of("online","offline","maintenance","error").contains(status))
            throw new com.smartbox.backend.exception.BadRequestException("INVALID_DEVICE_STATUS");
        device.setStatus(status);

        return mapToResponse(deviceRepository.save(device));
    }

    public DeviceResponse mapToResponse(Device d) {
        String ownerName = d.getOwner() != null ? d.getOwner().getFullName() : null;
        String ownerPhone = d.getOwner() != null ? d.getOwner().getPhone() : null;
        String productName = d.getProduct() != null ? d.getProduct().getName() : null;
        return DeviceResponse.builder()
                .id(d.getId())
                .productId(d.getProductId())
                .productName(productName)
                .ownerId(d.getOwnerId())
                .ownerName(ownerName)
                .ownerPhone(ownerPhone)
                .serialNumber(d.getSerialNumber())
                .name(d.getName())
                .locationLabel(d.getLocationLabel())
                .status(d.getStatus())
                .batteryLevel(d.getBatteryLevel())
                .firmwareVersion(d.getFirmwareVersion())
                .lastSeenAt(d.getLastSeenAt())
                .createdAt(d.getCreatedAt())
                .macAddress(null)
                .chipModel(null)
                .publicIp(null)
                .localIp(null)
                .geoCity(d.getLocationLabel())
                .mapX(null)
                .mapY(null)
                .lockStatus(d.getLockStatus() != null ? d.getLockStatus() : "locked")
                .doorStatus(d.getDoorStatus() != null ? d.getDoorStatus() : "closed")
                .weightKg(d.getWeightKg() != null ? d.getWeightKg() : 0.0)
                .packageDetected(d.getPackageDetected() != null ? d.getPackageDetected() : false)
                .scaleReady(d.getScaleReady() != null ? d.getScaleReady() : false)
                .deviceState(d.getDeviceState() != null ? d.getDeviceState() : "starting")
                .mqttTopicId(d.getMqttTopicId())
                .wifiRssi(null)
                .pingMs(null)
                .build();
    }
}
