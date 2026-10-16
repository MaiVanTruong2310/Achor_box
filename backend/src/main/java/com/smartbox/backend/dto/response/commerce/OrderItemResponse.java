package com.smartbox.backend.dto.response.commerce;

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
@Schema(description = "Chi tiết một sản phẩm trong đơn hàng")
public class OrderItemResponse {

    @Schema(description = "ID chi tiết đơn hàng")
    private UUID id;

    @Schema(description = "ID sản phẩm")
    private UUID productId;
    private UUID variantId;
    private String sku;
    private String variantName;
    private BigDecimal subtotal;

    @Schema(description = "Tên sản phẩm", example = "SmartBox Home Standard")
    private String productName;

    @Schema(description = "Số lượng đặt mua", example = "2")
    private Integer quantity;

    @Schema(description = "Đơn giá", example = "2500000")
    private BigDecimal unitPrice;
}
