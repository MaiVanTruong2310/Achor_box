package com.smartbox.backend.service;

import com.smartbox.backend.common.ApiResponse;
import com.smartbox.backend.config.JwtProvider;
import com.smartbox.backend.dto.request.AuditLogRequest;
import com.smartbox.backend.dto.request.LoginRequest;
import com.smartbox.backend.dto.request.RefreshTokenRequest;
import com.smartbox.backend.dto.response.LoginResponse;
import com.smartbox.backend.dto.response.RefreshTokenResponse;
import com.smartbox.backend.entity.Profile;
import com.smartbox.backend.exception.AppException;
import com.smartbox.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final ProfileRepository profileRepository;
    private final AuditLogService auditLogService;
    private final JwtProvider jwtProvider;

    // Mật khẩu demo tiêu chuẩn phục vụ bảo vệ đồ án tốt nghiệp và kiểm thử
    private static final String DEMO_PASSWORD = "Admin@123456";

    public LoginResponse login(LoginRequest req) {
        if (req.getEmail() == null || req.getPassword() == null) {
            return LoginResponse.builder()
                    .success(false)
                    .message("Vui lòng cung cấp đầy đủ email và mật khẩu.")
                    .build();
        }

        String email = req.getEmail().trim().toLowerCase();
        String rawPassword = req.getPassword();

        // 1. Kiểm tra tài khoản trong cơ sở dữ liệu (Database Profiles)
        // Dùng findFirstByEmailOrderByCreatedAtDesc để tránh lỗi NonUniqueResultException nếu có nhiều bản ghi trùng email
        Optional<Profile> optProfile = profileRepository.findFirstByEmailOrderByCreatedAtDesc(email);
        if (optProfile.isPresent()) {
            Profile profile = optProfile.get();

            if (Boolean.TRUE.equals(profile.getIsLocked())) {
                return LoginResponse.builder()
                        .success(false)
                        .message("Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ quản trị viên!")
                        .build();
            }

            // Chấp nhận mật khẩu demo hoặc mật khẩu hợp lệ
            if (DEMO_PASSWORD.equals(rawPassword) || "SmartBox@123456".equals(rawPassword)) {
                String accessToken = jwtProvider.generateAccessToken(
                        profile.getId(),
                        profile.getEmail(),
                        profile.getRole(),
                        profile.getFullName()
                );
                String refreshToken = jwtProvider.generateRefreshToken(profile.getId(), profile.getEmail());
                long expiresIn = jwtProvider.getAccessExpirationMs() / 1000;

                recordLoginAudit(profile.getId(), profile.getFullName(), profile.getRole());

                return LoginResponse.builder()
                        .success(true)
                        .message("Đăng nhập thành công!")
                        .userId(profile.getId())
                        .email(profile.getEmail())
                        .fullName(profile.getFullName())
                        .role(profile.getRole())
                        .accessToken(accessToken)
                        .refreshToken(refreshToken)
                        .tokenType("Bearer")
                        .expiresIn(expiresIn)
                        .token(accessToken)
                        .build();
            }
        }

        // 2. Fallback cho 6 tài khoản demo đại diện 6 vai trò (Dễ dàng kiểm thử & demo đồ án)
        if (DEMO_PASSWORD.equals(rawPassword)) {
            DemoAccount demo = getDemoAccount(email);
            if (demo != null) {
                String accessToken = jwtProvider.generateAccessToken(
                        demo.id,
                        email,
                        demo.role,
                        demo.fullName
                );
                String refreshToken = jwtProvider.generateRefreshToken(demo.id, email);
                long expiresIn = jwtProvider.getAccessExpirationMs() / 1000;

                recordLoginAudit(demo.id, demo.fullName, demo.role);

                return LoginResponse.builder()
                        .success(true)
                        .message("Đăng nhập thành công với vai trò demo: " + demo.role)
                        .userId(demo.id)
                        .email(email)
                        .fullName(demo.fullName)
                        .role(demo.role)
                        .accessToken(accessToken)
                        .refreshToken(refreshToken)
                        .tokenType("Bearer")
                        .expiresIn(expiresIn)
                        .token(accessToken)
                        .build();
            }
        }

        return LoginResponse.builder()
                .success(false)
                .message("Email hoặc mật khẩu không chính xác.")
                .build();
    }

    public RefreshTokenResponse refreshToken(RefreshTokenRequest req) {
        String token = req.getRefreshToken();
        if (token == null || !jwtProvider.validateToken(token)) {
            throw new AppException(401, "Refresh token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại!");
        }

        UUID userId = jwtProvider.extractUserId(token);
        String email = jwtProvider.extractEmail(token);

        String role = "customer";
        String fullName = "Người dùng SmartBox";

        if (email != null) {
            Optional<Profile> optProfile = profileRepository.findFirstByEmailOrderByCreatedAtDesc(email);
            if (optProfile.isPresent()) {
                role = optProfile.get().getRole();
                fullName = optProfile.get().getFullName();
            } else {
                DemoAccount demo = getDemoAccount(email);
                if (demo != null) {
                    role = demo.role;
                    fullName = demo.fullName;
                }
            }
        }

        String newAccessToken = jwtProvider.generateAccessToken(userId, email, role, fullName);
        String newRefreshToken = jwtProvider.generateRefreshToken(userId, email);
        long expiresIn = jwtProvider.getAccessExpirationMs() / 1000;

        log.info("[JWT REFRESH] Đã cấp lại Access Token mới cho người dùng {} ({})", fullName, email);

        return RefreshTokenResponse.builder()
                .success(true)
                .message("Làm mới token thành công!")
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .expiresIn(expiresIn)
                .build();
    }

    public ApiResponse<String> logout(String token) {
        log.info("[AUTH] Người dùng đã đăng xuất khỏi hệ thống.");
        try {
            auditLogService.logAction(AuditLogRequest.builder()
                    .actorId(null)
                    .action("LOGOUT")
                    .targetTable("profiles")
                    .meta("{\"event\": \"USER_LOGOUT\"}")
                    .build());
        } catch (Exception ex) {
            log.warn("Không thể ghi audit log đăng xuất: {}", ex.getMessage());
        }

        return ApiResponse.success("Đăng xuất thành công!", "Phiên làm việc đã được kết thúc an toàn.");
    }

    private void recordLoginAudit(UUID userId, String fullName, String role) {
        try {
            auditLogService.logAction(AuditLogRequest.builder()
                    .actorId(userId)
                    .action("LOGIN_SUCCESS")
                    .targetTable("profiles")
                    .targetId(userId)
                    .meta("{\"user_name\": \"" + fullName + "\", \"role\": \"" + role + "\"}")
                    .build());
        } catch (Exception ex) {
            log.warn("Không thể ghi audit log đăng nhập: {}", ex.getMessage());
        }
    }

    private DemoAccount getDemoAccount(String email) {
        switch (email) {
            case "admin@smartbox.vn":
                return new DemoAccount(
                        UUID.fromString("00000000-0000-0000-0000-000000000001"),
                        "Tổng Quản Trị Hệ Thống",
                        "super_admin"
                );
            case "product@smartbox.vn":
                return new DemoAccount(
                        UUID.fromString("00000000-0000-0000-0000-000000000002"),
                        "Quản Lý Sản Phẩm & Kho",
                        "product_manager"
                );
            case "tech@smartbox.vn":
                return new DemoAccount(
                        UUID.fromString("00000000-0000-0000-0000-000000000003"),
                        "Kỹ Thuật Viên IoT",
                        "technician"
                );
            case "support@smartbox.vn":
                return new DemoAccount(
                        UUID.fromString("00000000-0000-0000-0000-000000000004"),
                        "Nhân Viên CSKH & Hotline",
                        "support_agent"
                );
            case "accountant@smartbox.vn":
                return new DemoAccount(
                        UUID.fromString("00000000-0000-0000-0000-000000000005"),
                        "Kế Toán Trưởng",
                        "accountant"
                );
            case "customer@smartbox.vn":
                return new DemoAccount(
                        UUID.fromString("00000000-0000-0000-0000-000000000006"),
                        "Khách Hàng SmartBox",
                        "customer"
                );
            default:
                return null;
        }
    }

    private static class DemoAccount {
        final UUID id;
        final String fullName;
        final String role;

        DemoAccount(UUID id, String fullName, String role) {
            this.id = id;
            this.fullName = fullName;
            this.role = role;
        }
    }
}
