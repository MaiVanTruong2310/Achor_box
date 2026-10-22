package com.smartbox.backend.dto.request.admin;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu Admin đặt lại mật khẩu cho nhân viên nội bộ")
public class AdminResetPasswordRequest {

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Size(min = 8, max = 72, message = "Mật khẩu phải từ 8 đến 72 ký tự")
    @Schema(description = "Mật khẩu mới tạm thời cấp cho nhân viên", example = "Temp-Passw0rd!")
    private String newPassword;
}
