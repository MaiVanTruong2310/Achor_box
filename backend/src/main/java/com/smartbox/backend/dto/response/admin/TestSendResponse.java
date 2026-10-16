package com.smartbox.backend.dto.response.admin;

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
@Schema(description = "Kết quả gửi thử nghiệm tin nhắn / email")
public class TestSendResponse {

    @Schema(description = "Thành công hay không", example = "true")
    private Boolean success;

    @Schema(description = "Kênh gửi (EMAIL, SMS, PUSH)", example = "EMAIL")
    private String channel;

    @Schema(description = "Địa chỉ người nhận", example = "tester@smartbox.vn")
    private String recipient;

    @Schema(description = "Tiêu đề sau khi đã thay thế biến")
    private String renderedSubject;

    @Schema(description = "Nội dung sau khi đã thay thế biến")
    private String renderedBody;

    @Schema(description = "Thông điệp kết quả", example = "Đã gửi email thật thành công qua SMTP")
    private String message;

    @Schema(description = "Đã gửi qua SMTP thật hay chỉ mô phỏng", example = "true")
    private Boolean isRealSent;
}
