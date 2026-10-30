package com.smartbox.backend.dto.request.admin;


import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu ghi nhật ký thao tác kiểm toán")
public class AuditLogRequest {

    @Schema(description = "ID người thực hiện thao tác")
    private UUID actorId;

    @Schema(description = "Hành động thực hiện", example = "UPDATE_STATUS")
    private String action;

    @Schema(description = "Bảng dữ liệu bị tác động", example = "devices")
    private String targetTable;

    @Schema(description = "ID bản ghi bị tác động")
    private UUID targetId;

    @Schema(description = "Dữ liệu metadata JSON chi tiết")
    private String meta;
}
