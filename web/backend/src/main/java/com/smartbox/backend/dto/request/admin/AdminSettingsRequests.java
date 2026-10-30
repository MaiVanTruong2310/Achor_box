package com.smartbox.backend.dto.request.admin;


import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public final class AdminSettingsRequests {

    public record Category(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Pattern(regexp = "[a-z0-9]+(?:-[a-z0-9]+)*") @Size(max = 120) String slug,
            @Size(max = 1000) String description,
            java.util.UUID managerId
    ) {}

    public record Payment(
            @NotBlank @Size(max = 120) String name,
            @NotNull Boolean isActive
    ) {}

    public record Shipping(
            @NotBlank @Size(max = 120) String name,
            @NotNull @DecimalMin("0") @DecimalMax("100000000") @Digits(integer = 9, fraction = 2) BigDecimal fee,
            @NotNull Boolean isActive
    ) {}
}
