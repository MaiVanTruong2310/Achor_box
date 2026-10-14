package com.smartbox.backend.controller;

import com.smartbox.backend.common.AppConstants;
import com.smartbox.backend.dto.request.CreateStaffRequest;
import com.smartbox.backend.dto.request.LockUpdateRequest;
import com.smartbox.backend.dto.request.RoleUpdateRequest;
import com.smartbox.backend.dto.request.VerifyResetPasswordRequest;
import com.smartbox.backend.dto.response.Customer360Response;
import com.smartbox.backend.dto.response.ResetPasswordResponse;
import com.smartbox.backend.dto.response.SendOtpResponse;
import com.smartbox.backend.dto.response.UserProfileResponse;
import com.smartbox.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User API", description = "Quản lý hồ sơ người dùng, phân quyền RBAC và khóa tài khoản")
public class UserController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả người dùng / nhân viên")
    public ResponseEntity<List<UserProfileResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/paged")
    @Operation(summary = "Lấy danh sách người dùng có phân trang dạng Map<String, Object>")
    public ResponseEntity<Map<String, Object>> getUsersPaged(
            @Parameter(description = "Chỉ số trang (0-based)") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size,
            @RequestParam(required=false) String search,@RequestParam(required=false) String role,@RequestParam(required=false) Boolean locked) {
        return ResponseEntity.ok(userService.getUsersPaged(page, size,search,role,locked));
    }

    @GetMapping("/{id}/details")
    @Operation(summary = "Xem hồ sơ khách hàng 360° (Thông tin, Đơn hàng, Thiết bị sở hữu, Lịch sử bảo hành)")
    public ResponseEntity<Customer360Response> getUser360Details(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUser360Details(id));
    }

    @PatchMapping("/{id}/toggle-lock")
    @Operation(summary = "Khóa hoặc mở khóa tài khoản")
    public ResponseEntity<UserProfileResponse> toggleLock(
            @PathVariable UUID id,
            @RequestBody LockUpdateRequest request) {
        return ResponseEntity.ok(userService.toggleLock(id, request.getIsLocked(), request.getReason()));
    }

    @PatchMapping("/{id}/role")
    @Operation(summary = "Cập nhật vai trò / quyền hạn người dùng (super_admin, technician, product_manager,...)")
    public ResponseEntity<UserProfileResponse> updateRole(
            @PathVariable UUID id,
            @RequestBody RoleUpdateRequest request) {
        return ResponseEntity.ok(userService.updateRole(id, request.getRole()));
    }

    @PostMapping("/staff")
    @Operation(summary = "Cấp tài khoản nhân viên mới theo vai trò (Dành cho Super Admin)", 
               description = "Khởi tạo tài khoản nội bộ và phân quyền: product_manager, technician, support_agent, accountant...")
    public ResponseEntity<UserProfileResponse> createStaffUser(@RequestBody @Valid CreateStaffRequest request) {
        return ResponseEntity.ok(userService.createStaffUser(request));
    }

    @PostMapping("/{id}/send-reset-otp")
    @Operation(summary = "Phát mã xác thực OTP gửi qua Email cho khách hàng (Hotline Reset)")
    public ResponseEntity<SendOtpResponse> sendResetOtp(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.sendResetPasswordOtp(id));
    }

    @PostMapping("/{id}/verify-reset-password")
    @Operation(summary = "Xác thực mã OTP và đặt lại mật khẩu mới cho khách hàng")
    public ResponseEntity<ResetPasswordResponse> verifyResetPassword(
            @PathVariable UUID id,
            @RequestBody VerifyResetPasswordRequest request) {
        return ResponseEntity.ok(userService.verifyOtpAndResetPassword(id, request.getOtp(), request.getNewPassword()));
    }
}
