package com.smartbox.backend.controller;

import com.smartbox.backend.common.ApiResponse;
import com.smartbox.backend.dto.request.LoginRequest;
import com.smartbox.backend.dto.request.RefreshTokenRequest;
import com.smartbox.backend.dto.response.LoginResponse;
import com.smartbox.backend.dto.response.RefreshTokenResponse;
import com.smartbox.backend.service.AuthService;
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
