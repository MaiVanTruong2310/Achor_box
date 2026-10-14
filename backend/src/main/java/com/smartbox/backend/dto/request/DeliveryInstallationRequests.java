package com.smartbox.backend.dto.request;

import jakarta.validation.constraints.*;
import java.time.OffsetDateTime;
import java.util.UUID;

public final class DeliveryInstallationRequests {
    private DeliveryInstallationRequests() {}
    public record Assignment(@NotNull UUID assignedTo, @NotNull @Future OffsetDateTime scheduledAt,
                             @Size(max=2000) String installationNote) {}
    public record Note(@Size(max=2000) String note) {}
    public record Installation(@NotBlank @Size(max=2000) String installationNote) {}
    public record Serial(@NotNull UUID orderItemId, @NotBlank @Size(max=100) String serialNumber) {}
    public record Command(@NotNull UUID deviceId, @NotBlank @Pattern(regexp="LOCK|UNLOCK|TARE") String action) {}
    public record Acceptance(@NotNull Boolean customerAccepted, @Size(max=2000) String note) {}
    public record Failure(@NotBlank @Size(max=2000) String failureReason) {}
    public record Reassignment(@NotNull UUID assignedTo, @NotNull @Future OffsetDateTime scheduledAt,
                               @NotBlank @Size(max=2000) String reason) {}
}
