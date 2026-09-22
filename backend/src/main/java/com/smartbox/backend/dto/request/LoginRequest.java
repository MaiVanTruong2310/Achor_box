package com.smartbox.backend.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu đăng nhập hệ thống")
public class LoginRequest {

    @Schema(description = "Email đăng nhập", example = "admin@smartbox.vn")
    private String email;

    @Schema(description = "Mật khẩu tài khoản", example = "Admin@123")
    private String password;
}
