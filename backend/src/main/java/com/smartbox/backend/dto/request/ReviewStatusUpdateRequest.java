package com.smartbox.backend.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu duyệt hoặc từ chối đánh giá sản phẩm")
public class ReviewStatusUpdateRequest {

    @Schema(description = "Trạng thái mới (approved, rejected, pending)", example = "approved")
    private String status;

    @Schema(description = "Lý do từ chối (nếu rejected)")
    private String rejectReason;
}
