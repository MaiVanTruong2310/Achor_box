package com.smartbox.backend.dto.request.commerce;


import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VnpayCreatePaymentRequest {
    @NotNull(message = "Order ID không được để trống")
    private UUID orderId;

    private String returnUrl;
}
