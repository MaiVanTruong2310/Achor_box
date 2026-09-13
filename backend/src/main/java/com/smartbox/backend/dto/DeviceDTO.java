package com.smartbox.backend.dto;

import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

public class DeviceDTO {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DeviceResponse {
        private UUID id;
        private UUID productId;
        private String productName;
        private UUID ownerId;
        private String ownerName;
        private String ownerPhone;
        private String serialNumber;
        private String name;
        private String locationLabel;
        private String status;
        private Integer batteryLevel;
        private String firmwareVersion;
        private OffsetDateTime lastSeenAt;
        private OffsetDateTime createdAt;
        private String macAddress;
        private String chipModel;
        private String publicIp;
        private String localIp;
        private String geoCity;
        private Integer mapX;
        private Integer mapY;
        private String lockStatus;
        private Integer wifiRssi;
        private Integer pingMs;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusUpdateRequest {
        private String status;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DeviceEventResponse {
        private UUID id;
        private UUID deviceId;
        private String deviceSerial;
        private String eventType;
        private String payload;
        private OffsetDateTime createdAt;
    }
}
