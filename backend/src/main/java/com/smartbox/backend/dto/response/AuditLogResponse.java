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
@Schema(description = "Thông tin chi tiết nhật ký kiểm toán")
public class AuditLogResponse {

    @Schema(description = "ID nhật ký")
    private UUID id;

    @Schema(description = "ID người thực hiện")
    private UUID actorId;

    @Schema(description = "Tên người thực hiện", example = "Nguyễn Văn A")
    private String actorName;

    @Schema(description = "Vai trò người thực hiện", example = "ADMIN")
    private String actorRole;

    @Schema(description = "Hành động thực hiện", example = "CREATE_PRODUCT")
    private String action;

    @Schema(description = "Bảng dữ liệu", example = "products")
    private String targetTable;

    @Schema(description = "ID đối tượng mục tiêu")
    private UUID targetId;

    @Schema(description = "Dữ liệu metadata chi tiết")
    private String meta;

    @Schema(description = "Thời điểm ghi log")
    private OffsetDateTime createdAt;
}
