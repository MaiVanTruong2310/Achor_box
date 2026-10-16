package com.smartbox.backend.dto.request.auth;

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
@Schema(description = "Yêu cầu đăng nhập hệ thống")
public class LoginRequest {

    @Schema(description = "Email đăng nhập", example = "admin@smartbox.vn")
    @jakarta.validation.constraints.NotBlank
    @jakarta.validation.constraints.Size(max=254)
    private String email;

    @Schema(description = "Mật khẩu tài khoản", example = "Admin@123")
    @jakarta.validation.constraints.NotBlank
    @jakarta.validation.constraints.Size(max=128)
    private String password;
}
