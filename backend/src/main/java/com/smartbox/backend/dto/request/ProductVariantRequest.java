package com.smartbox.backend.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu tạo mới hoặc cập nhật biến thể sản phẩm (Size S/M/L)")
public class ProductVariantRequest {

    @Schema(description = "ID biến thể (nếu cập nhật)")
    private UUID id;

    @Schema(description = "Tên biến thể kích cỡ", example = "Size S (Nhỏ - 45L)")
    private String variantName;

    @Schema(description = "Mã SKU biến thể", example = "BOX-BASE-S")
    private String sku;

    @Schema(description = "Mức giá chênh lệch so với giá gốc (VNĐ)", example = "0")
    private BigDecimal priceDelta;

    @Schema(description = "Số lượng tồn kho của kích cỡ này", example = "20")
    private Integer stockQuantity;
    private Boolean isActive;
    private String size;
    private Integer capacityLiter;
    private String modelTier;
    private BigDecimal widthCm;
    private BigDecimal heightCm;
    private BigDecimal depthCm;
    private BigDecimal weightKg;
    private BigDecimal maxLoadKg;
    private Boolean hasWeightSensor;
    private Integer warrantyMonths;
    private java.util.List<String> images;
}
