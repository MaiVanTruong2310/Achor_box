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

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu gửi thử nghiệm mẫu thông báo")
public class TestSendTemplateRequest {

    @Schema(description = "Mã mẫu cần test", example = "OTP_VERIFY")
    private String templateCode;

    @Schema(description = "Email người nhận thử nghiệm", example = "tester@smartbox.vn")
    private String recipientEmail;

    @Schema(description = "Số điện thoại người nhận thử nghiệm", example = "0987654321")
    private String recipientPhone;

    @Schema(description = "Tiêu đề tùy chỉnh ghi đè (nếu có)")
    private String customSubject;

    @Schema(description = "Nội dung tùy chỉnh ghi đè (nếu có)")
    private String customBody;

    @Schema(description = "Dữ liệu biến giả lập để render")
    private Map<String, String> mockVariables;
}
