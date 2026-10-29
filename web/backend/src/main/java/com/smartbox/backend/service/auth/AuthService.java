package com.smartbox.backend.service.auth;

import com.smartbox.backend.common.ApiResponse;
import com.smartbox.backend.dto.request.auth.LoginRequest;
import com.smartbox.backend.dto.request.auth.RefreshTokenRequest;
import com.smartbox.backend.dto.response.auth.LoginResponse;
import com.smartbox.backend.dto.response.auth.RefreshTokenResponse;
import com.smartbox.backend.entity.Profile;
import com.smartbox.backend.exception.UnauthorizedException;
import com.smartbox.backend.repository.ProfileRepository;
import com.smartbox.backend.security.SupabaseAuthGateway;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {

    private final SupabaseAuthGateway provider;
    private final ProfileRepository profiles;
    private final CustomerIdentityService identities;
    private final RedisAuthService redisAuth;

    public AuthService(SupabaseAuthGateway provider, ProfileRepository profiles, CustomerIdentityService identities) {
        this(provider, profiles, identities, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public AuthService(SupabaseAuthGateway provider, ProfileRepository profiles, CustomerIdentityService identities,
                       @org.springframework.beans.factory.annotation.Autowired(required = false) RedisAuthService redisAuth) {
        this.provider = provider;
        this.profiles = profiles;
        this.identities = identities;
        this.redisAuth = redisAuth;
    }

    public LoginResponse login(LoginRequest request) {
        String rawLogin = request.getEmail().trim().toLowerCase(java.util.Locale.ROOT);
        final String login;
        if (!rawLogin.contains("@")) {
            final String usernameOrPrefix = rawLogin;
            login = profiles.findByUsername(usernameOrPrefix)
                    .or(() -> profiles.findFirstByEmailOrderByCreatedAtDesc(usernameOrPrefix + "@smartbox.vn"))
                    .map(Profile::getEmail)
                    .orElseThrow(() -> new UnauthorizedException("Thông tin đăng nhập không hợp lệ"));
        } else {
            login = rawLogin;
        }

        // 1. Kiểm tra xem tài khoản có bị khóa tạm thời do Redis rate limit không
        if (redisAuth != null && redisAuth.isLoginLocked(login)) {
            long remaining = redisAuth.getRemainingLockTimeMinutes(login);
            throw new UnauthorizedException("Tài khoản đang bị tạm khóa do đăng nhập thất bại nhiều lần. Vui lòng thử lại sau " + remaining + " phút.");
        }

        Map<String, Object> session;
        try {
            session = provider.password(login, request.getPassword());
        } catch (Exception ex) {
            if (redisAuth != null) {
                int attempts = redisAuth.recordFailedLogin(login);
                if (redisAuth.isLoginLocked(login)) {
                    throw new UnauthorizedException("Đăng nhập thất bại quá 5 lần. Tài khoản tạm thời bị khóa trong 15 phút.");
                }
            }
            throw ex;
        }

        // 2. Đăng nhập thành công: xóa lịch sử thất bại
        if (redisAuth != null) {
            redisAuth.resetFailedAttempts(login);
        }

        var profile = profile(session);
        String access = session.get("access_token").toString();
        long expiresIn = ((Number) session.get("expires_in")).longValue();

        // 3. Lưu phiên đăng nhập vào Redis và Pre-cache auth token cho các request tiếp theo
        if (redisAuth != null) {
            redisAuth.saveSession(profile.getId(), access, expiresIn, profile.getEmail(), profile.getRole());
            long cacheTtl = expiresIn > 0 ? Math.min(expiresIn, 1800) : 1800;
            redisAuth.cacheAuthSession(access, profile.getId(), profile.getRole(), profile.getEmail(),
                    profile.getFullName(), Boolean.TRUE.equals(profile.getIsLocked()), cacheTtl);
        }

        return LoginResponse.builder()
                .success(true)
                .message("Đăng nhập thành công")
                .userId(profile.getId())
                .email(profile.getEmail())
                .fullName(profile.getFullName())
                .role(profile.getRole())
                .avatarUrl(profile.getAvatarUrl())
                .phone(profile.getPhone())
                .defaultAddress(profile.getDefaultAddress())
                .accessToken(access)
                .token(access)
                .refreshToken(session.get("refresh_token").toString())
                .tokenType("Bearer")
                .expiresIn(expiresIn)
                .build();
    }

    public RefreshTokenResponse refreshToken(RefreshTokenRequest request) {
        var session = provider.refresh(request.getRefreshToken());
        var profile = profile(session);
        String access = session.get("access_token").toString();
        long expiresIn = ((Number) session.get("expires_in")).longValue();

        if (redisAuth != null) {
            redisAuth.saveSession(profile.getId(), access, expiresIn, profile.getEmail(), profile.getRole());
            redisAuth.cacheAuthSession(access, profile.getId(), profile.getRole(), profile.getEmail(),
                    profile.getFullName(), Boolean.TRUE.equals(profile.getIsLocked()), Math.min(expiresIn, 300));
        }

        return RefreshTokenResponse.builder()
                .success(true)
                .message("Làm mới token thành công")
                .accessToken(access)
                .refreshToken(session.get("refresh_token").toString())
                .tokenType("Bearer")
                .expiresIn(expiresIn)
                .build();
    }

    public ApiResponse<String> logout(String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            throw new UnauthorizedException("Yêu cầu access token");
        }
        String rawToken = token.substring(7);

        // 4. Đưa token vào Redis blacklist để thu hồi tức thì
        if (redisAuth != null) {
            redisAuth.blacklistToken(rawToken, 86400);
        }

        provider.logout(rawToken);
        return ApiResponse.success("Đăng xuất thành công", "Đã thu hồi phiên và vô hiệu hóa token tại Redis");
    }

    private Profile profile(Map<String, Object> session) {
        if (!(session.get("user") instanceof Map<?, ?> user) || user.get("id") == null) {
            throw new UnauthorizedException("AUTH_PROFILE_MISSING");
        }
        var profile = identities.ensure(user);
        if (Boolean.TRUE.equals(profile.getIsLocked())) {
            throw new UnauthorizedException("ACCOUNT_LOCKED");
        }
        return profile;
    }
}
