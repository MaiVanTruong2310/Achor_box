package com.smartbox.backend.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class OrderDTO {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderResponse {
        private UUID id;
        private UUID userId;
        private String customerName;
        private String customerPhone;
        private String shippingAddress;
        private String trackingNumber;
        private String status;
        private BigDecimal total;
        private String paymentMethod;
        private String paymentStatus;
        private String transactionRef;
        private String itemsSummary;
        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;
        private List<OrderItemResponse> items;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderItemResponse {
        private UUID id;
        private UUID productId;
        private String productName;
        private Integer quantity;
        private BigDecimal unitPrice;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusUpdateRequest {
        private String status;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrackingUpdateRequest {
        private String trackingNumber;
    }
}
