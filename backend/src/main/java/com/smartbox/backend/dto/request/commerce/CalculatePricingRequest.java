package com.smartbox.backend.dto.request.commerce;

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
