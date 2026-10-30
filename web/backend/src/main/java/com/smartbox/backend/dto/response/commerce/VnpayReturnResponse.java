package com.smartbox.backend.dto.response.commerce;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VnpayReturnResponse {
    private UUID paymentId;
    private UUID orderId;
    private BigDecimal amount;
    private boolean signatureValid;
    private String gatewayResult;
    private String responseCode;
    private String transactionStatus;
    private String transactionNo;
    private String bankCode;
    private String payDate;
    private String environment;
    private boolean awaitingIpnConfirmation;
    private String message;
}
