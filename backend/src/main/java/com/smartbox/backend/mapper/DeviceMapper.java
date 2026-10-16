package com.smartbox.backend.mapper;

import com.smartbox.backend.dto.response.device.DeviceEventResponse;
import com.smartbox.backend.dto.response.device.DeviceResponse;
import com.smartbox.backend.entity.Device;
import com.smartbox.backend.entity.DeviceEvent;

public class DeviceMapper {

    private DeviceMapper() {}

    public static DeviceResponse toResponse(Device device) {
        if (device == null) return null;
        return DeviceResponse.builder()
                .id(device.getId())
                .productId(device.getProductId())
                .productName(device.getProduct() != null ? device.getProduct().getName() : null)
                .ownerId(device.getOwnerId())
                .ownerName(device.getOwner() != null ? device.getOwner().getFullName() : null)
                .ownerPhone(device.getOwner() != null ? device.getOwner().getPhone() : null)
                .serialNumber(device.getSerialNumber())
                .name(device.getName())
                .locationLabel(device.getLocationLabel())
                .status(device.getStatus())
                .batteryLevel(device.getBatteryLevel())
                .firmwareVersion(device.getFirmwareVersion())
                .lastSeenAt(device.getLastSeenAt())
                .createdAt(device.getCreatedAt())
                .build();
    }

    public static DeviceEventResponse toEventResponse(DeviceEvent event, String serial) {
        if (event == null) return null;
        return DeviceEventResponse.builder()
                .id(event.getId())
                .deviceId(event.getDeviceId())
                .deviceSerial(serial)
                .eventType(event.getEventType())
                .payload(event.getPayload())
                .createdAt(event.getCreatedAt())
                .build();
    }
}
