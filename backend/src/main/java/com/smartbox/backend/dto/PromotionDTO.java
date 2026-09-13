package com.smartbox.backend.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public class PromotionDTO {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PromotionRequest {
        private String code;
        private String description;
        private String discountType; // "percentage" or "fixed_amount"
        private BigDecimal discountValue;
        private BigDecimal minOrderValue;
        private BigDecimal maxDiscount;
        private String startDate; // ISO String or YYYY-MM-DD
        private String endDate;   // ISO String or YYYY-MM-DD
        private Integer usageLimit;
        private Integer usedCount;
        private Boolean isActive;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PromotionResponse {
        private UUID id;
        private String code;
        private String description;
        private String discountType;
        private BigDecimal discountValue;
        private BigDecimal minOrderValue;
        private BigDecimal maxDiscount;
        private String startDate;
        private String endDate;
        private Integer usageLimit;
        private Integer usedCount;
        private Boolean isActive;
        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ValidateCouponRequest {
        private String code;
        private BigDecimal orderTotal;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ValidateCouponResponse {
        @com.fasterxml.jackson.annotation.JsonProperty("isValid")
        private boolean isValid;
        private String message;
        private String code;
        private String discountType;
        private BigDecimal discountValue;
        private BigDecimal discountAmount;
        private BigDecimal originalTotal;
        private BigDecimal finalTotal;
        private UUID promotionId;
    }
}
