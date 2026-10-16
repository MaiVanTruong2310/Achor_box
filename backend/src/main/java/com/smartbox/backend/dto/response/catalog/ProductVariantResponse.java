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

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Thông tin chi tiết biến thể kích cỡ sản phẩm")
public class ProductVariantResponse {

    @Schema(description = "ID biến thể")
    private UUID id;

    @Schema(description = "ID sản phẩm cha")
    private UUID productId;

    @Schema(description = "Tên biến thể kích cỡ", example = "Size S (Nhỏ - 45L)")
    private String variantName;

    @Schema(description = "Mã SKU biến thể", example = "BOX-BASE-S")
    private String sku;

    @Schema(description = "Mức giá chênh lệch so với giá gốc (VNĐ)", example = "0")
    private BigDecimal priceDelta;

    @Schema(description = "Giá bán thực tế của biến thể này (Giá gốc + PriceDelta)", example = "1290000")
    private BigDecimal calculatedPrice;

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
