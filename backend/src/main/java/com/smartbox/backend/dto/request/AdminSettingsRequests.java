package com.smartbox.backend.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public final class AdminSettingsRequests {
    public record Category(@NotBlank @Size(max=120) String name,
                           @NotBlank @Pattern(regexp="[a-z0-9]+(?:-[a-z0-9]+)*") @Size(max=120) String slug) {}
    public record Payment(@NotBlank @Size(max=120) String name, @NotNull Boolean isActive) {}
    public record Shipping(@NotBlank @Size(max=120) String name,
                           @NotNull @DecimalMin("0") @DecimalMax("100000000") @Digits(integer=9,fraction=2) BigDecimal fee,
                           @NotNull Boolean isActive) {}
}
