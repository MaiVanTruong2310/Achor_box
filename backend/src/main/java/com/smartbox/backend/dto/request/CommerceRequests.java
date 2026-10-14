package com.smartbox.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public final class CommerceRequests {
    private CommerceRequests() {}
    public record Item(@NotNull UUID variantId, @Min(1) @Max(99) int quantity) {}
    public record Quantity(@Min(1) @Max(99) int quantity) {}
    public record CreateOrder(@Size(max=2000) String shippingAddress,
                              @NotEmpty @Size(max=100) List<@Valid Item> items,
                              UUID addressId, @Valid CustomerRequests.Address shippingDetails) {
        public CreateOrder(String shippingAddress,List<Item> items){this(shippingAddress,items,null,null);}
    }
    public record Callback(@NotNull UUID paymentId, @NotNull UUID orderId,
                           @NotNull @DecimalMin("0") BigDecimal amount,
                           @Pattern(regexp="SUCCESS|FAILED") @NotNull String result,
                           @NotBlank String signature) {}
    public record Reason(@NotBlank @Size(max=2000) String reason) {}
    public record Shipment(@NotBlank @Size(max=200) String carrier,
                           @NotBlank @Size(max=200) String trackingNumber) {}
    public record DeviceAssignment(@NotNull UUID orderItemId, @NotNull UUID deviceId) {}
    public record RefundCompletion(@NotBlank @Size(max=200) String providerRef) {}
}
