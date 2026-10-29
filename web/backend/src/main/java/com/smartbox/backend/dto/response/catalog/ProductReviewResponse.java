package com.smartbox.backend.dto.response.catalog;

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

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Thông tin chi tiết đánh giá sản phẩm")
public class ProductReviewResponse {

    @Schema(description = "ID đánh giá")
    private UUID id;

    @Schema(description = "ID sản phẩm")
    private UUID productId;

    @Schema(description = "Tên sản phẩm", example = "SmartBox Home Standard")
    private String productName;

    @Schema(description = "Tên khách hàng", example = "Lê Thị Bích")
    private String customerName;

    @Schema(description = "Email khách hàng", example = "bich.le@example.com")
    private String customerEmail;

    @Schema(description = "Số điện thoại khách hàng", example = "0945678901")
    private String customerPhone;

    @Schema(description = "Số sao đánh giá (1-5)", example = "5")
    private Integer rating;

    @Schema(description = "Tiêu đề đánh giá")
    private String title;

    @Schema(description = "Nội dung nhận xét")
    private String comment;

    @Schema(description = "Danh sách URL ảnh đính kèm")
    private List<String> images;

    @Schema(description = "Trạng thái (pending, approved, rejected)", example = "approved")
    private String status;

    @Schema(description = "Lý do từ chối nếu có")
    private String rejectReason;

    @Schema(description = "Nội dung admin phản hồi")
    private String adminReply;

    @Schema(description = "Thời điểm admin phản hồi")
    private OffsetDateTime adminRepliedAt;

    @Schema(description = "Thời điểm gửi đánh giá")
    private OffsetDateTime createdAt;
}
