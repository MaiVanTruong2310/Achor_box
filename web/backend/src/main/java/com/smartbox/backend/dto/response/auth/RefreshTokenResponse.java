package com.smartbox.backend.dto.response.auth;


import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Kết quả làm mới Access Token")
public class RefreshTokenResponse {

    @Schema(description = "Trạng thái thành công hay thất bại", example = "true")
    private Boolean success;

    @Schema(description = "Thông báo kết quả", example = "Làm mới token thành công")
    private String message;

    @Schema(description = "Access Token mới")
    private String accessToken;

    @Schema(description = "Refresh Token mới")
    private String refreshToken;

    @Schema(description = "Loại token", example = "Bearer")
    @Builder.Default
    private String tokenType = "Bearer";

    @Schema(description = "Thời gian sống của Access Token tính theo giây", example = "86400")
    private Long expiresIn;
}
