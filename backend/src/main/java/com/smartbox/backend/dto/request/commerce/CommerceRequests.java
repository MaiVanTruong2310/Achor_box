package com.smartbox.backend.dto.request.commerce;

import com.smartbox.backend.dto.request.customer.CustomerRequests;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public final class CommerceRequests {

    private CommerceRequests() {}

    public record Item(@NotNull UUID variantId, @Min(1) @Max(99) int quantity) {}

    public record Quantity(@Min(1) @Max(99) int quantity) {}

    public record CreateOrder(
            @Size(max = 2000) String shippingAddress,
            @NotEmpty @Size(max = 100) List<@Valid Item> items,
            UUID addressId,
            @Valid CustomerRequests.Address shippingDetails,
            String couponCode,
            UUID customerId
    ) {
        public CreateOrder(String shippingAddress, List<Item> items) {
            this(shippingAddress, items, null, null, null, null);
        }

        public CreateOrder(String shippingAddress, List<Item> items, UUID addressId, CustomerRequests.Address shippingDetails) {
            this(shippingAddress, items, addressId, shippingDetails, null, null);
        }

        public CreateOrder(String shippingAddress, List<Item> items, UUID addressId, CustomerRequests.Address shippingDetails, String couponCode) {
            this(shippingAddress, items, addressId, shippingDetails, couponCode, null);
        }
    }

    public record Callback(
            @NotNull UUID paymentId,
            @NotNull UUID orderId,
            @NotNull @DecimalMin("0") BigDecimal amount,
            @Pattern(regexp = "SUCCESS|FAILED") @NotNull String result,
            @NotBlank String signature
    ) {}

    public record Reason(@NotBlank @Size(max = 2000) String reason) {}

    public record CustomerDecision(boolean accept) {}

    public record Shipment(
            @NotBlank @Size(max = 200) String carrier,
            @NotBlank @Size(max = 200) String trackingNumber
    ) {}

    public record DeviceAssignment(@NotNull UUID orderItemId, @NotNull UUID deviceId) {}

    public record RefundCompletion(@NotBlank @Size(max = 200) String providerRef) {}
}
