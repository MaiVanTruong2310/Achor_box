package com.smartbox.backend.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Thông tin chi tiết sản phẩm")
public class ProductResponse {

    @Schema(description = "ID sản phẩm")
    private UUID id;

    @Schema(description = "ID danh mục")
    private UUID categoryId;

    @Schema(description = "Tên danh mục", example = "Hộp thông minh")
    private String categoryName;

    @Schema(description = "Mã SKU", example = "SBX-HOME-01")
    private String sku;

    @Schema(description = "Tên sản phẩm", example = "SmartBox Home Standard")
    private String name;

    @Schema(description = "Mô tả sản phẩm")
    private String description;

    @Schema(description = "Giá bán", example = "2500000")
    private BigDecimal price;

    @Schema(description = "Danh sách URL ảnh")
    private List<String> images;

    @Schema(description = "Số lượng tồn kho", example = "42")
    private Integer stockQuantity;

    @Schema(description = "Trạng thái đang kinh doanh", example = "true")
    private Boolean isActive;

    @Schema(description = "Ngày tạo")
    private OffsetDateTime createdAt;

    @Schema(description = "Danh sách các biến thể kích cỡ (Size S/M/L) của sản phẩm")
    private List<ProductVariantResponse> variants;
}
