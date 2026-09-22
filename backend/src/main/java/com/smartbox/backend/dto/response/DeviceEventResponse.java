package com.smartbox.backend.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Sự kiện telemetry cảm biến từ thiết bị IoT")
public class DeviceEventResponse {

    @Schema(description = "ID sự kiện")
    private UUID id;

    @Schema(description = "ID thiết bị")
    private UUID deviceId;

    @Schema(description = "Serial thiết bị", example = "SBX-2026-0001")
    private String deviceSerial;

    @Schema(description = "Loại sự kiện (door_opened, package_delivered, tampered, low_battery)", example = "package_delivered")
    private String eventType;

    @Schema(description = "Payload chi tiết dưới dạng JSON")
    private String payload;

    @Schema(description = "Thời điểm xảy ra sự kiện")
    private OffsetDateTime createdAt;
}
