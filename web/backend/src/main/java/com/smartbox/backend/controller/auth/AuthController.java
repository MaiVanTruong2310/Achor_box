package com.smartbox.backend.controller.auth;

import com.smartbox.backend.common.ApiResponse;
import com.smartbox.backend.dto.request.auth.LoginRequest;
import com.smartbox.backend.dto.request.auth.RefreshTokenRequest;
import com.smartbox.backend.dto.response.auth.LoginResponse;
import com.smartbox.backend.dto.response.auth.RefreshTokenResponse;
import com.smartbox.backend.entity.Profile;
import com.smartbox.backend.repository.ProfileRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.service.auth.AuthService;
import com.smartbox.backend.service.warranty.ClaimImageStorage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth API", description = "Xác thực, đăng nhập JWT, làm mới token và đăng xuất khỏi hệ thống SmartBox")
public class AuthController {

    private final AuthService authService;
    private final ProfileRepository profiles;
    private final CurrentActor actors;
    private final ClaimImageStorage imageStorage;

    @GetMapping("/me")
    @Operation(summary = "Lấy thông tin hồ sơ của người dùng hiện tại", description = "Truy xuất thông tin profile của tài khoản đang đăng nhập từ cơ sở dữ liệu dựa trên JWT token")
    public Profile me() {
        return profiles.findById(actors.get().id()).orElseThrow();
    }

    @RequestMapping(value = "/me", method = {RequestMethod.PUT, RequestMethod.POST, RequestMethod.PATCH})
    @Operation(summary = "Cập nhật hồ sơ cá nhân của người dùng hiện tại", description = "Cập nhật các thông tin cơ bản của người dùng hiện tại như họ tên, số điện thoại, ảnh đại diện và địa chỉ mặc định")
    public Profile updateMe(@RequestBody Map<String, Object> body) {
        UUID userId = actors.get().id();
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
        return profiles.save(profile);
    }

    @PostMapping(value = "/avatar", consumes = "multipart/form-data")
    @Operation(summary = "Tải lên ảnh đại diện cá nhân lên Cloudinary", description = "Upload file ảnh đại diện của người dùng lên Cloudinary và cập nhật đường dẫn vào hồ sơ người dùng")
    public Map<String, String> uploadAvatar(@RequestPart("file") MultipartFile file) {
        var actor = actors.get();
        var stored = imageStorage.upload(file);
        String url = stored.secureUrl();
        var profileOpt = profiles.findById(actor.id());
        if (profileOpt.isPresent()) {
            var profile = profileOpt.get();
            profile.setAvatarUrl(url);
            profiles.save(profile);
        }
        return Map.of("url", url);
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập hệ thống", description = "Xác thực thông tin tài khoản bằng email và mật khẩu, cấp phát cặp Access Token và Refresh Token cho mọi vai trò người dùng")
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
