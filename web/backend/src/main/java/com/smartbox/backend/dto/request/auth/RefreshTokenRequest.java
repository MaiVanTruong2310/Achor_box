package com.smartbox.backend.dto.request.auth;


import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu cấp lại Access Token qua Refresh Token")
public class RefreshTokenRequest {

    @NotBlank(message = "Refresh token không được để trống")
    @Schema(description = "Refresh token đã được cấp khi đăng nhập", example = "eyJhbGciOiJIUzI1NiJ9...")
    private String refreshToken;
}
