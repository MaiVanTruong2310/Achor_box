package com.smartbox.backend.security;

import com.smartbox.backend.exception.AppException;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.exception.UnauthorizedException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Cổng giao tiếp tích hợp dịch vụ xác thực Supabase Auth (GoTrue API).
 * Xử lý đăng ký, đăng nhập, cấp phát token JWT, xác thực recovery OTP, và quản trị tài khoản người dùng.
 */
@Component
@Slf4j
public class SupabaseAuthGateway {

    private final RestClient client;
    private final String key;
    private final String url;
    private final String serviceKey;

    public SupabaseAuthGateway(
            @Value("${smartbox.supabase.url:}") String url,
            @Value("${smartbox.supabase.anon-key:}") String key,
            @Value("${smartbox.supabase.service-role-key:}") String serviceKey
    ) {
        this.url = url;
        this.key = key;
        this.serviceKey = serviceKey;

        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_2)
                .connectTimeout(Duration.ofSeconds(3))
                .build();

        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(5));

        this.client = RestClient.builder()
                .baseUrl(url.isBlank() ? "http://localhost" : url + "/auth/v1")
                .requestFactory(factory)
                .build();
    }

    @PostConstruct
    public void initWarmUp() {
        if (!url.isBlank() && !key.isBlank()) {
            CompletableFuture.runAsync(this::keepAlivePing);
        }
    }

    @Scheduled(fixedDelay = 45000)
    public void keepAlivePing() {
        if (url.isBlank() || key.isBlank()) {
            return;
        }
        try {
            client.get()
                    .uri("/health")
                    .header("apikey", key)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ignored) {
            // Keep-alive heartbeat only
        }
    }

    private void configured() {
        if (url.isBlank() || key.isBlank()) {
            throw new AppException(503, "AUTH_PROVIDER_NOT_CONFIGURED");
        }
    }

    public Map<String, Object> password(String email, String password) {
        return exchange("password", Map.of("email", email, "password", password));
    }

    public Map<String, Object> refresh(String refreshToken) {
        return exchange("refresh_token", Map.of("refresh_token", refreshToken));
    }

    @SuppressWarnings("unchecked")
    public void register(String email, String password, String name, String phone, String redirect) {
        configured();
        // Ưu tiên tạo tài khoản qua Admin API với email_confirm = true nếu có serviceKey
        // Tránh lỗi Supabase free tier rate-limit hoặc lỗi SMTP khi gửi mail xác nhận ("Error sending confirmation email")
        if (serviceKey != null && !serviceKey.isBlank()) {
            try {
                client.post()
                        .uri("/admin/users")
                        .header("apikey", serviceKey)
                        .header("Authorization", "Bearer " + serviceKey)
                        .body(Map.of(
                                "email", email,
                                "password", password,
                                "email_confirm", true,
                                "user_metadata", Map.of("full_name", name, "phone", phone == null ? "" : phone)
                        ))
                        .retrieve()
                        .toBodilessEntity();
                log.info("Khách hàng {} đã được đăng ký thành công qua Supabase Admin API", email);
                return;
            } catch (RestClientResponseException adminEx) {
                int status = adminEx.getStatusCode().value();
                if (status == 422 || status == 409) {
                    throw new ConflictException("Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.");
                }
                if (status == 429) {
                    throw new AppException(429, "AUTH_RATE_LIMITED");
                }
                log.warn("Supabase Admin API trả về status {}, thử tiếp bằng standard signup: {}", status, adminEx.getResponseBodyAsString());
            } catch (ResourceAccessException ex) {
                throw new AppException(503, "AUTH_PROVIDER_UNAVAILABLE");
            }
        }

        try {
            client.post()
                    .uri(builder -> builder.path("/signup").queryParam("redirect_to", redirect).build())
                    .header("apikey", key)
                    .body(Map.of(
                            "email", email,
                            "password", password,
                            "data", Map.of("full_name", name, "phone", phone == null ? "" : phone)
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 429) {
                throw new AppException(429, "AUTH_RATE_LIMITED");
            }
            if (ex.getStatusCode().value() == 422 || ex.getStatusCode().value() == 409) {
                throw new ConflictException("Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.");
            }
            log.error("Supabase signup thất bại: status={}, body={}", ex.getStatusCode().value(), ex.getResponseBodyAsString());
            throw new AppException(400, "AUTH_REGISTRATION_FAILED");
        } catch (ResourceAccessException ex) {
            throw new AppException(503, "AUTH_PROVIDER_UNAVAILABLE");
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> user(String token) {
        configured();
        try {
            return client.get()
                    .uri("/user")
                    .header("apikey", key)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientResponseException ex) {
            throw new UnauthorizedException("INVALID_ACCESS_TOKEN");
        } catch (ResourceAccessException ex) {
            throw new AppException(503, "AUTH_PROVIDER_UNAVAILABLE");
        }
    }

    public void updatePassword(String token, String password) {
        configured();
        try {
            client.put()
                    .uri("/user")
                    .header("apikey", key)
                    .header("Authorization", "Bearer " + token)
                    .body(Map.of("password", password))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            throw new AppException(400, "AUTH_PASSWORD_UPDATE_FAILED");
        } catch (ResourceAccessException ex) {
            throw new AppException(503, "AUTH_PROVIDER_UNAVAILABLE");
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> verifyRecovery(String hash) {
        configured();
        try {
            return client.post()
                    .uri("/verify")
                    .header("apikey", key)
                    .body(Map.of("type", "recovery", "token_hash", hash))
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientResponseException ex) {
            throw new UnauthorizedException("RECOVERY_LINK_INVALID_OR_EXPIRED");
        } catch (ResourceAccessException ex) {
            throw new AppException(503, "AUTH_PROVIDER_UNAVAILABLE");
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> verifyRecoveryOtp(String email, String otp) {
        configured();
        try {
            return client.post()
                    .uri("/verify")
                    .header("apikey", key)
                    .body(Map.of(
                            "type", "recovery",
                            "email", email.trim().toLowerCase(Locale.ROOT),
                            "token", otp.trim()
                    ))
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientResponseException ex) {
            throw new UnauthorizedException("Mã OTP xác thực không chính xác hoặc đã hết hạn.");
        } catch (ResourceAccessException ex) {
            throw new AppException(503, "AUTH_PROVIDER_UNAVAILABLE");
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> exchange(String grant, Map<String, String> body) {
        configured();
        try {
            return client.post()
                    .uri("/token?grant_type=" + grant)
                    .header("apikey", key)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientResponseException ex) {
            if ("password".equals(grant)) {
                throw new UnauthorizedException("Sai email hoặc mật khẩu đăng nhập");
            }
            throw new UnauthorizedException("Phiên đăng nhập hoặc refresh token không hợp lệ");
        } catch (ResourceAccessException ex) {
            throw new AppException(503, "AUTH_PROVIDER_UNAVAILABLE");
        }
    }

    @SuppressWarnings("unchecked")
    public UUID identity(String token) {
        configured();
        try {
            Map<?, ?> user = client.get()
                    .uri("/user")
                    .header("apikey", key)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .body(Map.class);
            if (user == null || user.get("id") == null) {
                throw new UnauthorizedException("INVALID_ACCESS_TOKEN");
            }
            return UUID.fromString(user.get("id").toString());
        } catch (RestClientResponseException | IllegalArgumentException ex) {
            throw new UnauthorizedException("INVALID_ACCESS_TOKEN");
        } catch (ResourceAccessException ex) {
            throw new AppException(503, "AUTH_PROVIDER_UNAVAILABLE");
        }
    }

    public void logout(String token) {
        configured();
        try {
            client.post()
                    .uri("/logout")
                    .header("apikey", key)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            throw new UnauthorizedException("INVALID_ACCESS_TOKEN");
        }
    }

    public UUID createCustomer(String email, String password, String name) {
        return createStaff(email, password, name);
    }

    @SuppressWarnings("unchecked")
    public UUID createStaff(String email, String password, String name) {
        configured();
        if (serviceKey.isBlank()) {
            throw new AppException(503, "AUTH_ADMIN_NOT_CONFIGURED");
        }
        try {
            Map<?, ?> user = client.post()
                    .uri("/admin/users")
                    .header("apikey", serviceKey)
                    .header("Authorization", "Bearer " + serviceKey)
                    .body(Map.of(
                            "email", email,
                            "password", password,
                            "email_confirm", true,
                            "user_metadata", Map.of("full_name", name)
                    ))
                    .retrieve()
                    .body(Map.class);
            if (user == null || user.get("id") == null) {
                throw new IllegalStateException("AUTH_ADMIN_INVALID_RESPONSE");
            }
            return UUID.fromString(user.get("id").toString());
        } catch (RestClientResponseException ex) {
            throw new AppException(409, "AUTH_ACCOUNT_CREATION_FAILED");
        }
    }

    /**
     * Thu hồi tài khoản vừa được khởi tạo nếu tiến trình nghiệp vụ phía backend gặp lỗi.
     */
    public void deleteProvisionedUser(UUID id) {
        if (serviceKey.isBlank()) {
            throw new AppException(503, "AUTH_ADMIN_NOT_CONFIGURED");
        }
        client.delete()
                .uri("/admin/users/" + id)
                .header("apikey", serviceKey)
                .header("Authorization", "Bearer " + serviceKey)
                .retrieve()
                .toBodilessEntity();
    }

    public void updateUserPassword(UUID id, String password) {
        configured();
        if (serviceKey.isBlank()) {
            throw new AppException(503, "AUTH_ADMIN_NOT_CONFIGURED");
        }
        try {
            client.put()
                    .uri("/admin/users/" + id)
                    .header("apikey", serviceKey)
                    .header("Authorization", "Bearer " + serviceKey)
                    .body(Map.of("password", password))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            throw new AppException(400, "AUTH_PASSWORD_UPDATE_FAILED");
        } catch (ResourceAccessException ex) {
            throw new AppException(503, "AUTH_PROVIDER_UNAVAILABLE");
        }
    }

    public record RecoveryInfo(String otp, String actionLink, String hashedToken) {}

    public RecoveryInfo recovery(String email) {
        return recovery(email, null);
    }

    @SuppressWarnings("unchecked")
    public RecoveryInfo recovery(String email, String redirect) {
        configured();
        // Ưu tiên tạo recovery link và mã OTP qua Admin API nếu có serviceKey
        // Tránh lỗi Supabase SMTP ("Error sending recovery email")
        if (serviceKey != null && !serviceKey.isBlank()) {
            try {
                Map<String, Object> linkRes = client.post()
                        .uri("/admin/generate_link")
                        .header("apikey", serviceKey)
                        .header("Authorization", "Bearer " + serviceKey)
                        .body(Map.of(
                                "type", "recovery",
                                "email", email,
                                "redirect_to", redirect != null ? redirect : ""
                        ))
                        .retrieve()
                        .body(Map.class);
                if (linkRes != null) {
                    String otp = java.util.Objects.toString(linkRes.get("email_otp"), "");
                    String actionLink = java.util.Objects.toString(linkRes.get("action_link"), "");
                    String hashedToken = java.util.Objects.toString(linkRes.get("hashed_token"), "");
                    log.info("[AUTH RECOVERY] Đã tạo mã OTP khôi phục mật khẩu cho {}: [OTP: {}] - Link: {}", email, otp, actionLink);
                    return new RecoveryInfo(otp, actionLink, hashedToken);
                }
            } catch (RestClientResponseException adminEx) {
                int status = adminEx.getStatusCode().value();
                if (status == 429) {
                    throw new AppException(429, "AUTH_RATE_LIMITED");
                }
                if (status == 404 || status == 422) {
                    log.info("Yêu cầu khôi phục mật khẩu cho email không tồn tại trong hệ thống: {}", email);
                    return null;
                }
                log.warn("Supabase Admin generate_link trả về status {}, thử tiếp bằng standard recover: {}", status, adminEx.getResponseBodyAsString());
            } catch (ResourceAccessException ex) {
                throw new AppException(503, "AUTH_PROVIDER_UNAVAILABLE");
            }
        }

        try {
            client.post()
                    .uri(builder -> {
                        builder.path("/recover");
                        if (redirect != null) {
                            builder.queryParam("redirect_to", redirect);
                        }
                        return builder.build();
                    })
                    .header("apikey", key)
                    .body(Map.of("email", email))
                    .retrieve()
                    .toBodilessEntity();
            return null;
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 429) {
                throw new AppException(429, "AUTH_RATE_LIMITED");
            }
            log.error("Supabase recover thất bại: status={}, body={}", ex.getStatusCode().value(), ex.getResponseBodyAsString());
            throw new AppException(503, "AUTH_RECOVERY_UNAVAILABLE");
        } catch (ResourceAccessException ex) {
            throw new AppException(503, "AUTH_PROVIDER_UNAVAILABLE");
        }
    }
}
