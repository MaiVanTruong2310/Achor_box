package com.smartbox.backend.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Số liệu thống kê tổng hợp phân hệ Content & CMS")
public class ContentSummaryStatsResponse {

    @Schema(description = "Tổng số bài viết", example = "12")
    private long totalArticles;

    @Schema(description = "Số bài viết đã xuất bản", example = "8")
    private long publishedArticles;

    @Schema(description = "Tổng số banner", example = "6")
    private long totalBanners;

    @Schema(description = "Số banner đang hiển thị", example = "4")
    private long activeBanners;

    @Schema(description = "Tổng số đánh giá sản phẩm", example = "25")
    private long totalReviews;

    @Schema(description = "Số đánh giá chờ duyệt", example = "3")
    private long pendingReviews;

    @Schema(description = "Tổng số câu hỏi FAQ", example = "15")
    private long totalFaqs;
}
