package com.smartbox.backend.dto.response;

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

    @Schema(description = "Tên sản phẩm", example = "SmartBox Home Standard")
    private String productName;

    @Schema(description = "Số lượng đặt mua", example = "2")
    private Integer quantity;

    @Schema(description = "Đơn giá", example = "2500000")
    private BigDecimal unitPrice;
}
