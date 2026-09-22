package com.smartbox.backend.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu cập nhật trạng thái thiết bị IoT")
public class DeviceStatusUpdateRequest {

    @Schema(description = "Trạng thái mới của thiết bị (online, offline, maintenance, error)", example = "online")
    private String status;
}
