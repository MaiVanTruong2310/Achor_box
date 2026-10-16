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
@Schema(description = "Kết quả yêu cầu gửi mã OTP khôi phục mật khẩu")
public class SendOtpResponse {

    @Schema(description = "Thành công hay không", example = "true")
    private Boolean success;

    @Schema(description = "Thông báo kết quả", example = "Mã OTP đã được gửi đến email của bạn")
    private String message;

    @Schema(description = "Email người nhận", example = "user@example.com")
    private String email;

    @Schema(description = "Mã OTP xem trước (cho môi trường dev/demo)", example = "849201")
    private String previewOtp;

    @Schema(description = "Trạng thái email đã thực sự gửi qua SMTP hay chưa", example = "true")
    private Boolean emailSent;
}
