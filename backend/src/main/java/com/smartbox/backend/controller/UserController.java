package com.smartbox.backend.controller;

import com.smartbox.backend.dto.UserDTO;
import com.smartbox.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User API", description = "Quản lý hồ sơ người dùng, phân quyền RBAC và khóa tài khoản")
public class UserController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả người dùng / nhân viên")
    public ResponseEntity<List<UserDTO.UserProfileResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}/details")
    @Operation(summary = "Xem hồ sơ khách hàng 360° (Thông tin, Đơn hàng, Thiết bị sở hữu, Lịch sử bảo hành)")
    public ResponseEntity<UserDTO.Customer360Response> getUser360Details(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUser360Details(id));
    }

    @PatchMapping("/{id}/toggle-lock")
    @Operation(summary = "Khóa hoặc mở khóa tài khoản")
    public ResponseEntity<UserDTO.UserProfileResponse> toggleLock(
            @PathVariable UUID id,
            @RequestBody UserDTO.LockUpdateRequest request) {
        return ResponseEntity.ok(userService.toggleLock(id, request.getIsLocked(), request.getReason()));
    }

    @PatchMapping("/{id}/role")
    @Operation(summary = "Cập nhật vai trò / quyền hạn người dùng (super_admin, technician, product_manager,...)")
    public ResponseEntity<UserDTO.UserProfileResponse> updateRole(
            @PathVariable UUID id,
            @RequestBody UserDTO.RoleUpdateRequest request) {
        return ResponseEntity.ok(userService.updateRole(id, request.getRole()));
    }

    @PostMapping("/{id}/send-reset-otp")
    @Operation(summary = "Phát mã xác thực OTP gửi qua Email cho khách hàng (Hotline Reset)")
    public ResponseEntity<UserDTO.SendOtpResponse> sendResetOtp(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.sendResetPasswordOtp(id));
    }

    @PostMapping("/{id}/verify-reset-password")
    @Operation(summary = "Xác thực mã OTP và đặt lại mật khẩu mới cho khách hàng")
    public ResponseEntity<UserDTO.ResetPasswordResponse> verifyResetPassword(
            @PathVariable UUID id,
            @RequestBody UserDTO.VerifyResetPasswordRequest request) {
        return ResponseEntity.ok(userService.verifyOtpAndResetPassword(id, request.getOtp(), request.getNewPassword()));
    }
}
