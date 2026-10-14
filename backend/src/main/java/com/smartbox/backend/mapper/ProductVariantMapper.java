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
                .isActive(v.getIsActive()).size(v.getSize()).capacityLiter(v.getCapacityLiter())
                .modelTier(v.getModelTier())
                .widthCm(v.getWidthCm())
                .heightCm(v.getHeightCm())
                .depthCm(v.getDepthCm())
                .weightKg(v.getWeightKg())
                .maxLoadKg(v.getMaxLoadKg())
                .hasWeightSensor(v.getHasWeightSensor())
                .warrantyMonths(v.getWarrantyMonths())
                .images(com.smartbox.backend.service.VariantSpecifications.images(v.getVariantImages()))
                .priceDelta(delta)
                .calculatedPrice(calculatedPrice)
                .stockQuantity(v.getStockQuantity() != null ? v.getStockQuantity() : 0)
                .build();
    }
}
