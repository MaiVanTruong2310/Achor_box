package com.smartbox.backend.dto.request.admin;

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
@Schema(description = "Yêu cầu cập nhật mẫu thông báo email / sms")
public class TemplateUpdateRequest {

    @Schema(description = "Mã định danh mẫu", example = "OTP_VERIFY")
    private String code;

    @Schema(description = "Tên mẫu thông báo", example = "Xác thực mã OTP")
    private String name;

    @Schema(description = "Mô tả mục đích sử dụng mẫu")
    private String description;

    @Schema(description = "Kênh gửi (EMAIL, SMS, PUSH)", example = "EMAIL")
    private String channel;

    @Schema(description = "Tiêu đề thư", example = "[SmartBox] Mã xác thực đăng nhập")
    private String subject;

    @Schema(description = "Nội dung mẫu (hỗ trợ biến {{otp}}, {{fullName}},...)")
    private String body;

    @Schema(description = "Danh sách biến sử dụng trong mẫu")
    private String variables;

    @Schema(description = "Trạng thái kích hoạt", example = "true")
    private Boolean isActive;
}
