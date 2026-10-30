package com.smartbox.backend.dto.response.commerce;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VnpayPaymentResponse {
    private UUID orderId;
    private UUID paymentId;
    private BigDecimal amount;
    private String status;
    private String paymentUrl;
    private String provider;
    private String environment;
    private OffsetDateTime expiresAt;
    private String message;
}
