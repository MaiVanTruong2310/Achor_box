package com.smartbox.backend.dto;

import lombok.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class UserDTO {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserProfileResponse {
        private UUID id;
        private String fullName;
        private String phone;
        private String email;
        private String avatarUrl;
        private String defaultAddress;
        private String role;
        private Boolean isLocked;
        private Boolean is2faEnabled;
        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoleUpdateRequest {
        private String role;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LockUpdateRequest {
        private Boolean isLocked;
        private String reason;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Customer360Response {
        private UserProfileResponse profile;
        private List<OrderDTO.OrderResponse> orders;
        private List<DeviceDTO.DeviceResponse> devices;
        private List<WarrantyClaimDTO.ClaimResponse> warrantyClaims;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SendOtpResponse {
        private Boolean success;
        private String message;
        private String email;
        private String previewOtp;
        private Boolean emailSent;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifyResetPasswordRequest {
        private String otp;
        private String newPassword;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ResetPasswordResponse {
        private Boolean success;
        private String message;
        private String updatedPassword;
    }
}
