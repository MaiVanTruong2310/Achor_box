package com.smartbox.backend.dto.request.commerce;


import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalculatePricingRequest {

    @NotEmpty(message = "Danh sách sản phẩm không được rỗng")
    @Valid
    private List<PricingItem> items;

    private String voucherCode;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PricingItem {
        @NotNull(message = "variantId không được để trống")
        private UUID variantId;

        @Min(value = 1, message = "Số lượng tối thiểu là 1")
        @Max(value = 99, message = "Số lượng tối đa là 99")
        private int quantity;
    }
}
