package com.smartbox.backend.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class ProductDTO {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProductRequest {
        private UUID categoryId;
        private String sku;
        private String name;
        private String description;
        private BigDecimal price;
        private List<String> images;
        private Integer stockQuantity;
        private Boolean isActive;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProductResponse {
        private UUID id;
        private UUID categoryId;
        private String categoryName;
        private String sku;
        private String name;
        private String description;
        private BigDecimal price;
        private List<String> images;
        private Integer stockQuantity;
        private Boolean isActive;
        private OffsetDateTime createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockAdjustRequest {
        private Integer delta;
    }
}
