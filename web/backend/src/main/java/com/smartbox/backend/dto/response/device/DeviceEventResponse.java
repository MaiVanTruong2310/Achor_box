package com.smartbox.backend.dto.response.device;

import com.smartbox.backend.dto.request.admin.*;
import com.smartbox.backend.dto.request.auth.*;
import com.smartbox.backend.dto.request.catalog.*;
import com.smartbox.backend.dto.request.commerce.*;
import com.smartbox.backend.dto.request.customer.*;
import com.smartbox.backend.dto.request.device.*;
import com.smartbox.backend.dto.request.warranty.*;
import com.smartbox.backend.dto.response.admin.*;
import com.smartbox.backend.dto.response.auth.*;
import com.smartbox.backend.dto.response.catalog.*;
import com.smartbox.backend.dto.response.commerce.*;
import com.smartbox.backend.dto.response.customer.*;
import com.smartbox.backend.dto.response.device.*;
import com.smartbox.backend.dto.response.warranty.*;

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
