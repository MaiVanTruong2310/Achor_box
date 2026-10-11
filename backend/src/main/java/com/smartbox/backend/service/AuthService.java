package com.smartbox.backend.service;

import com.smartbox.backend.common.ApiResponse;
import com.smartbox.backend.dto.request.LoginRequest;
import com.smartbox.backend.dto.request.RefreshTokenRequest;
import com.smartbox.backend.dto.response.LoginResponse;
import com.smartbox.backend.dto.response.RefreshTokenResponse;
import com.smartbox.backend.entity.Profile;
import com.smartbox.backend.exception.UnauthorizedException;
import com.smartbox.backend.repository.ProfileRepository;
import com.smartbox.backend.security.SupabaseAuthGateway;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final SupabaseAuthGateway provider;
    private final ProfileRepository profiles;
    public LoginResponse login(LoginRequest request) {
        var session=provider.password(request.getEmail().trim().toLowerCase(java.util.Locale.ROOT),request.getPassword());
        var profile=profile(session);
        String access=session.get("access_token").toString();
        return LoginResponse.builder().success(true).message("Đăng nhập thành công")
            .userId(profile.getId()).email(profile.getEmail()).fullName(profile.getFullName()).role(profile.getRole())
            .accessToken(access).token(access).refreshToken(session.get("refresh_token").toString()).tokenType("Bearer")
            .expiresIn(((Number)session.get("expires_in")).longValue()).build();
    }
    public RefreshTokenResponse refreshToken(RefreshTokenRequest request) {
        var session=provider.refresh(request.getRefreshToken());profile(session);
        return RefreshTokenResponse.builder().success(true).message("Làm mới token thành công")
            .accessToken(session.get("access_token").toString()).refreshToken(session.get("refresh_token").toString())
            .tokenType("Bearer").expiresIn(((Number)session.get("expires_in")).longValue()).build();
    }
    public ApiResponse<String> logout(String token) {
        if(token==null||!token.startsWith("Bearer ")) throw new UnauthorizedException("Yêu cầu access token");
        provider.logout(token.substring(7));
        return ApiResponse.success("Đăng xuất thành công","Đã thu hồi phiên tại auth provider");
    }
    private Profile profile(Map<String,Object> session) {
        if(!(session.get("user") instanceof Map<?,?> user) || user.get("id")==null) throw new UnauthorizedException("AUTH_PROFILE_MISSING");
        var profile=profiles.findById(UUID.fromString(user.get("id").toString())).orElseThrow(()->new UnauthorizedException("AUTH_PROFILE_MISSING"));
        if(Boolean.TRUE.equals(profile.getIsLocked())) throw new UnauthorizedException("ACCOUNT_LOCKED");
        return profile;
    }
}
