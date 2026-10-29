package com.smartbox.backend.dto.request.catalog;

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

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu gửi đánh giá sản phẩm từ khách hàng")
public class ProductReviewRequest {

    @Schema(description = "ID sản phẩm được đánh giá")
    private UUID productId;

    @Schema(description = "Tên sản phẩm", example = "SmartBox Home Standard")
    private String productName;

    @Schema(description = "Tên khách hàng", example = "Lê Thị Bích")
    private String customerName;

    @Schema(description = "Email khách hàng", example = "bich.le@example.com")
    private String customerEmail;

    @Schema(description = "Số điện thoại khách hàng", example = "0945678901")
    private String customerPhone;

    @Schema(description = "Số sao đánh giá (1 đến 5)", example = "5")
    private Integer rating;

    @Schema(description = "Tiêu đề đánh giá", example = "Sản phẩm dùng rất tiện lợi!")
    private String title;

    @Schema(description = "Nội dung nhận xét chi tiết")
    private String comment;

    @Schema(description = "Danh sách URL ảnh đính kèm")
    private List<String> images;
}
