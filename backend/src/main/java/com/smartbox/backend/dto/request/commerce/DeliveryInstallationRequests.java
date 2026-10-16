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
