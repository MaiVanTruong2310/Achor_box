package com.smartbox.backend.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu cập nhật mã vận đơn theo dõi")
public class TrackingUpdateRequest {

    @Schema(description = "Mã vận đơn giao hàng", example = "VNPOST-987654321")
    private String trackingNumber;
}
