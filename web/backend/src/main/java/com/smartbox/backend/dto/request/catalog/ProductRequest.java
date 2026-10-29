package com.smartbox.backend.dto.request.catalog;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu tạo mới hoặc cập nhật thông tin sản phẩm")
public class ProductRequest {

    @Schema(description = "ID danh mục sản phẩm")
    private UUID categoryId;

    @Schema(description = "ID của Product Manager (PO) phụ trách sản phẩm")
    private UUID managerId;

    @Schema(description = "Mã SKU định danh sản phẩm", example = "SBX-HOME-01")
    private String sku;

    @Schema(description = "Tên sản phẩm", example = "Hộp nhận hàng thông minh SmartBox Home")
    private String name;

    @Schema(description = "Mô tả chi tiết sản phẩm")
    private String description;

    @Schema(description = "Giá bán niêm yết (VNĐ)", example = "2500000")
    private BigDecimal price;

    @Schema(description = "Danh sách URL hình ảnh sản phẩm")
    private List<String> images;

    @Schema(description = "Số lượng tồn kho ban đầu", example = "50")
    private Integer stockQuantity;

    @Schema(description = "Trạng thái kinh doanh", example = "true")
    private Boolean isActive;

    private Boolean hasWeightSensor;

    @Schema(description = "Danh sách các biến thể kích cỡ sản phẩm (Size S/M/L)")
    private List<ProductVariantRequest> variants;
}
