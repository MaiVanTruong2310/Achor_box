package com.smartbox.backend.dto.request.warranty;


import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu phân công kỹ thuật viên xử lý bảo hành")
public class AssignTechnicianRequest {

    @Schema(description = "ID kỹ thuật viên được phân công")
    private UUID technicianId;
}
