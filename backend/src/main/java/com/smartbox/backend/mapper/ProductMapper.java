package com.smartbox.backend.mapper;

import com.smartbox.backend.dto.response.ProductResponse;
import com.smartbox.backend.entity.Product;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class ProductMapper {

    private ProductMapper() {}

    public static ProductResponse toResponse(Product p) {
        if (p == null) return null;
        List<String> images = Collections.emptyList();
        if (p.getImages() != null && !p.getImages().isBlank()) {
            images = Arrays.stream(p.getImages().replace("[", "").replace("]", "").replace("\"", "").split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }

        List<com.smartbox.backend.dto.response.ProductVariantResponse> variantResponses = Collections.emptyList();
        if (p.getVariants() != null && !p.getVariants().isEmpty()) {
            variantResponses = p.getVariants().stream()
                    .map(v -> ProductVariantMapper.toResponse(v, p.getPrice()))
                    .toList();
        }

        return ProductResponse.builder()
                .id(p.getId())
                .categoryId(p.getCategoryId())
                .categoryName(p.getCategory() != null ? p.getCategory().getName() : null)
                .sku(p.getSku())
                .name(p.getName())
                .description(p.getDescription())
                .price(p.getPrice())
                .images(images)
                .stockQuantity(p.getStockQuantity())
                .isActive(p.getIsActive()).hasWeightSensor(p.getHasWeightSensor())
                .createdAt(p.getCreatedAt())
                .variants(variantResponses)
                .build();
    }
}
