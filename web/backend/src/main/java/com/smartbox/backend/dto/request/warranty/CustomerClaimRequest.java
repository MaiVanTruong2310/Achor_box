package com.smartbox.backend.dto.request.warranty;

import jakarta.validation.constraints.*;
import java.util.*;
public record CustomerClaimRequest(@NotNull UUID warrantyId,@NotBlank @Size(min=10,max=5000) String description,
                                  @NotNull @Size(max=5) List<@NotNull UUID> imageIds) {}
