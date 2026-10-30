package com.smartbox.backend.dto.request.customer;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class CustomerRequests {

    private CustomerRequests() {}

    public record Register(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotBlank @Size(max = 200) String fullName,
            @Pattern(regexp = "^$|\\+?[0-9 ()-]{8,30}") String phone
    ) {}

    public record ProfileUpdate(
            @NotBlank @Size(max = 200) String fullName,
            @Pattern(regexp = "^$|\\+?[0-9 ()-]{8,30}") String phone,
            @Size(max = 2000) String avatarUrl
    ) {
        public ProfileUpdate(String fullName, String phone) {
            this(fullName, phone, null);
        }
    }

    public record Address(
            @NotBlank @Size(max = 100) String label,
            @NotBlank @Size(max = 200) String recipientName,
            @NotBlank @Pattern(regexp = "\\+?[0-9 ()-]{8,30}") String phone,
            @NotBlank @Size(max = 2000) String addressLine,
            @Size(max = 2000) String installationNote,
            boolean isDefault
    ) {}

    public record ForgotPassword(
            @NotBlank @Email @Size(max = 254) String email
    ) {}

    public record ChangePassword(
            @NotBlank @Size(max = 72) String currentPassword,
            @NotBlank @Size(min = 8, max = 72) String newPassword
    ) {}

    public record ResetPassword(
            String tokenHash,
            String email,
            String otp,
            @NotBlank @Size(min = 8, max = 72) String newPassword
    ) {
        public ResetPassword(String tokenHash, String newPassword) {
            this(tokenHash, null, null, newPassword);
        }
    }
}

