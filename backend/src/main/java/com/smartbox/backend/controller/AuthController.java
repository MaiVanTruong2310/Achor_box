package com.smartbox.backend.controller;

import com.smartbox.backend.dto.AuthDTO;
import com.smartbox.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth API", description = "Xác thực và đăng nhập hệ thống quản trị nội bộ")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập tài khoản quản trị viên")
    public ResponseEntity<AuthDTO.LoginResponse> login(@RequestBody AuthDTO.LoginRequest request) {
        AuthDTO.LoginResponse res = authService.login(request);
        if (Boolean.TRUE.equals(res.getSuccess())) {
            return ResponseEntity.ok(res);
        }
        return ResponseEntity.badRequest().body(res);
    }
}
