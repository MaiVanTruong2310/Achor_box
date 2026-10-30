package com.smartbox.backend.dto.request.warranty;


import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu cập nhật trạng thái hồ sơ khiếu nại bảo hành")
public class ClaimStatusUpdateRequest {

    @Schema(description = "Trạng thái mới (new, assigned, in_progress, resolved, rejected)", example = "in_progress")
    private String status;
}
