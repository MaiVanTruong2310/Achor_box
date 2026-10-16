package com.smartbox.backend.dto.request.customer;

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

public final class CustomerRequests {
    private CustomerRequests() {}
    public record Register(@NotBlank @Email @Size(max=254) String email,
                           @NotBlank @Size(min=8,max=72) String password,
                           @NotBlank @Size(max=200) String fullName,
                           @Pattern(regexp="^$|\\+?[0-9 ()-]{8,30}") String phone) {}
    public record ProfileUpdate(@NotBlank @Size(max=200) String fullName,
                                @Pattern(regexp="^$|\\+?[0-9 ()-]{8,30}") String phone) {}
    public record Address(@NotBlank @Size(max=100) String label,
                          @NotBlank @Size(max=200) String recipientName,
                          @NotBlank @Pattern(regexp="\\+?[0-9 ()-]{8,30}") String phone,
                          @NotBlank @Size(max=2000) String addressLine,
                          @Size(max=2000) String installationNote,
                          boolean isDefault) {}
    public record ForgotPassword(@NotBlank @Email @Size(max=254) String email) {}
    public record ChangePassword(@NotBlank @Size(max=72) String currentPassword,
                                 @NotBlank @Size(min=8,max=72) String newPassword) {}
    public record ResetPassword(@NotBlank @Size(max=512) String tokenHash,
                                @NotBlank @Size(min=8,max=72) String newPassword) {}
}
