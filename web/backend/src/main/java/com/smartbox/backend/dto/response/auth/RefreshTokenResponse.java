package com.smartbox.backend.dto.response.auth;

import com.smartbox.backend.dto.request.admin.*;
import com.smartbox.backend.dto.request.auth.*;
import com.smartbox.backend.dto.request.catalog.*;
import com.smartbox.backend.dto.request.commerce.*;
import com.smartbox.backend.dto.request.customer.*;
import com.smartbox.backend.dto.request.device.*;
import com.smartbox.backend.dto.request.warranty.*;
import com.smartbox.backend.dto.response.admin.*;
import com.smartbox.backend.dto.response.auth.*;
import com.smartbox.backend.dto.response.catalog.*;
import com.smartbox.backend.dto.response.commerce.*;
import com.smartbox.backend.dto.response.customer.*;
import com.smartbox.backend.dto.response.device.*;
import com.smartbox.backend.dto.response.warranty.*;

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
