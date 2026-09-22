package com.smartbox.backend.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu phản hồi nhận xét của khách hàng từ Quản trị viên")
public class ReviewReplyRequest {

    @Schema(description = "Nội dung phản hồi từ admin", example = "Cảm ơn quý khách đã tin dùng sản phẩm của SmartBox!")
    private String adminReply;
}
