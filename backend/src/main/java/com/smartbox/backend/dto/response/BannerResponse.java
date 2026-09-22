package com.smartbox.backend.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Thông tin chi tiết Banner quảng cáo")
public class BannerResponse {

    @Schema(description = "ID banner")
    private UUID id;

    @Schema(description = "Tiêu đề banner", example = "Khuyến mãi mùa hè")
    private String title;

    @Schema(description = "URL ảnh")
    private String imageUrl;

    @Schema(description = "Đường dẫn đích")
    private String targetUrl;

    @Schema(description = "Vị trí hiển thị", example = "hero_home")
    private String position;

    @Schema(description = "Thứ tự hiển thị", example = "1")
    private Integer displayOrder;

    @Schema(description = "Đang kích hoạt", example = "true")
    private Boolean isActive;

    @Schema(description = "Lượt click", example = "45")
    private Integer clickCount;

    @Schema(description = "Thời điểm bắt đầu")
    private OffsetDateTime startDate;

    @Schema(description = "Thời điểm kết thúc")
    private OffsetDateTime endDate;

    @Schema(description = "Thời gian tạo")
    private OffsetDateTime createdAt;

    @Schema(description = "Thời gian cập nhật")
    private OffsetDateTime updatedAt;
}
