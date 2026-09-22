package com.smartbox.backend.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Kết quả đặt lại mật khẩu")
public class ResetPasswordResponse {

    @Schema(description = "Thành công hay không", example = "true")
    private Boolean success;

    @Schema(description = "Thông báo kết quả", example = "Mật khẩu đã được cập nhật thành công")
    private String message;

    @Schema(description = "Mật khẩu mới đã cập nhật (che hoặc hiển thị theo thiết kế)")
    private String updatedPassword;
}
