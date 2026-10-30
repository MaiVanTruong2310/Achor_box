package com.smartbox.backend.dto.request.auth;


import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu xác thực OTP và đổi mật khẩu mới")
public class VerifyResetPasswordRequest {

    @Schema(description = "Mã OTP 6 chữ số gửi qua email", example = "123456")
    private String otp;

    @Schema(description = "Mật khẩu mới", example = "Password@2026")
    private String newPassword;
}
