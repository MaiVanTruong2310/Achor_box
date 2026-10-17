package com.smartbox.backend.controller.auth;

import com.smartbox.backend.common.ApiResponse;
import com.smartbox.backend.dto.request.auth.LoginRequest;
import com.smartbox.backend.dto.request.auth.RefreshTokenRequest;
import com.smartbox.backend.dto.response.auth.LoginResponse;
import com.smartbox.backend.dto.response.auth.RefreshTokenResponse;
import com.smartbox.backend.service.auth.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth API", description = "Xác thực, đăng nhập JWT, làm mới token và đăng xuất khỏi hệ thống SmartBox")
public class AuthController {

    private final AuthService authService;
    private final com.smartbox.backend.repository.ProfileRepository profiles;
    private final com.smartbox.backend.security.CurrentActor actors;
    private final com.smartbox.backend.service.warranty.ClaimImageStorage imageStorage;

    @GetMapping("/me")
    public com.smartbox.backend.entity.Profile me(jakarta.servlet.http.HttpServletRequest request) {
        Object cached = request.getAttribute("CURRENT_USER_PROFILE");
        if (cached instanceof com.smartbox.backend.entity.Profile p && p.getFullName() != null) {
            return p;
        }
        return profiles.findById(actors.get().id()).orElseThrow();
    }

    @RequestMapping(value = "/me", method = {RequestMethod.PUT, RequestMethod.POST, RequestMethod.PATCH})
    @Operation(summary = "Cập nhật hồ sơ cá nhân của người dùng hiện tại")
    public com.smartbox.backend.entity.Profile updateMe(
            @RequestBody java.util.Map<String, Object> body,
            jakarta.servlet.http.HttpServletRequest request) {
        java.util.UUID userId = actors.get().id();
        var profile = profiles.findById(userId).orElseThrow();
        if (body.containsKey("fullName") && body.get("fullName") != null) {
            String name = body.get("fullName").toString().trim();
            if (!name.isEmpty()) {
                profile.setFullName(name);
            }
        }
        if (body.containsKey("phone")) {
            profile.setPhone(body.get("phone") == null ? null : body.get("phone").toString().trim());
        }
        if (body.containsKey("avatarUrl")) {
            profile.setAvatarUrl(body.get("avatarUrl") == null ? null : body.get("avatarUrl").toString().trim());
        }
        if (body.containsKey("defaultAddress")) {
            profile.setDefaultAddress(body.get("defaultAddress") == null ? null : body.get("defaultAddress").toString().trim());
        }
        var saved = profiles.save(profile);
        request.setAttribute("CURRENT_USER_PROFILE", saved);
        return saved;
    }

    @PostMapping(value = "/avatar", consumes = "multipart/form-data")
    @Operation(summary = "Tải lên ảnh đại diện cá nhân lên Cloudinary")
    public java.util.Map<String, String> uploadAvatar(@RequestPart("file") org.springframework.web.multipart.MultipartFile file) {
        actors.get();
        var stored = imageStorage.upload(file);
        return java.util.Map.of("url", stored.secureUrl());
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập hệ thống (Cấp phát cặp Access Token và Refresh Token cho mọi vai trò)")
    public ResponseEntity<LoginResponse> login(@RequestBody @Valid LoginRequest request) {
        LoginResponse res = authService.login(request);
        if (Boolean.TRUE.equals(res.getSuccess())) {
            return ResponseEntity.ok(res);
        }
        return ResponseEntity.badRequest().body(res);
    }

    @PostMapping("/refresh-token")
    @Operation(summary = "Làm mới Access Token", description = "Gửi Refresh Token còn hạn để cấp lại Access Token mới mà không cần đăng nhập lại")
    public ResponseEntity<RefreshTokenResponse> refreshToken(@RequestBody @Valid RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refreshToken(request));
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất khỏi hệ thống", description = "Thu hồi phiên làm việc của người dùng hiện tại và ghi nhận Audit Log")
    public ResponseEntity<ApiResponse<String>> logout(
            @Parameter(description = "Bearer JWT token phiên đăng nhập (tùy chọn)")
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(authService.logout(authHeader));
    }
}
