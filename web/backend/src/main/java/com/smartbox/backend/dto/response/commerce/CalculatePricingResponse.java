package com.smartbox.backend.dto.response.commerce;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalculatePricingResponse {

    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal shippingFee;
    private BigDecimal finalTotal;
    private String voucherCode;
    private boolean voucherApplied;
    private String voucherMessage;
    private List<PricingItemDetail> itemDetails;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PricingItemDetail {
        private UUID variantId;
        private UUID productId;
        private String productName;
        private String variantName;
        private String sku;
        private BigDecimal unitPrice;
        private int quantity;
        private BigDecimal itemTotal;
        private String size;
        private Integer capacityLiter;
        private Integer warrantyMonths;
        private boolean inStock;
    }
}
