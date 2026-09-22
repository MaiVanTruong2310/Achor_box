package com.smartbox.backend.mapper;

import com.smartbox.backend.dto.response.ProductVariantResponse;
import com.smartbox.backend.entity.ProductVariant;

import java.math.BigDecimal;

public class ProductVariantMapper {

    private ProductVariantMapper() {}

    public static ProductVariantResponse toResponse(ProductVariant v, BigDecimal basePrice) {
        if (v == null) return null;
        BigDecimal delta = v.getPriceDelta() != null ? v.getPriceDelta() : BigDecimal.ZERO;
        BigDecimal calculatedPrice = (basePrice != null ? basePrice : BigDecimal.ZERO).add(delta);

        return ProductVariantResponse.builder()
                .id(v.getId())
                .productId(v.getProductId())
                .variantName(v.getVariantName())
                .sku(v.getSku())
                .priceDelta(delta)
                .calculatedPrice(calculatedPrice)
                .stockQuantity(v.getStockQuantity() != null ? v.getStockQuantity() : 0)
                .build();
    }
}
