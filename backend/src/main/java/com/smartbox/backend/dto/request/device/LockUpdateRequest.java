package com.smartbox.backend.dto.request.device;


import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu khóa hoặc mở khóa tài khoản")
public class LockUpdateRequest {

    @Schema(description = "Trạng thái khóa (true: khóa, false: mở khóa)", example = "true")
    private Boolean isLocked;

    @Schema(description = "Lý do thao tác", example = "Vi phạm chính sách bảo mật hệ thống")
    private String reason;
}
