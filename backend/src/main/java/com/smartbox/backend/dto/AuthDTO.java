package com.smartbox.backend.dto;

import lombok.*;
import java.util.UUID;

public class AuthDTO {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        private String email;
        private String password;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LoginResponse {
        private Boolean success;
        private String message;
        private UUID userId;
        private String email;
        private String fullName;
        private String role;
        private String token;
    }
}
