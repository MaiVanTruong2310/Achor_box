package com.smartbox.backend.controller.admin;

import com.smartbox.backend.common.AppConstants;
import com.smartbox.backend.dto.request.admin.CreateStaffRequest;
import com.smartbox.backend.dto.request.device.LockUpdateRequest;
import com.smartbox.backend.dto.request.admin.RoleUpdateRequest;
import com.smartbox.backend.dto.request.auth.VerifyResetPasswordRequest;
import com.smartbox.backend.dto.response.customer.Customer360Response;
import com.smartbox.backend.dto.response.auth.ResetPasswordResponse;
import com.smartbox.backend.dto.response.auth.SendOtpResponse;
import com.smartbox.backend.dto.response.auth.UserProfileResponse;
import com.smartbox.backend.service.admin.UserService;
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
    @Operation(summary = "Lấy danh sách tất cả người dùng / nhân viên", description = "Truy xuất toàn bộ danh sách tài khoản người dùng và cán bộ nhân viên trong hệ thống SmartBox")
    public ResponseEntity<List<UserProfileResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/paged")
    @Operation(summary = "Lấy danh sách người dùng có phân trang dạng Map<String, Object>", description = "Hỗ trợ phân trang, lọc theo vai trò (role), trạng thái khóa (locked) và tìm kiếm theo tên hoặc email")
    public ResponseEntity<Map<String, Object>> getUsersPaged(
            @Parameter(description = "Chỉ số trang (0-based)") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size,
            @RequestParam(required=false) String search,@RequestParam(required=false) String role,@RequestParam(required=false) Boolean locked) {
        return ResponseEntity.ok(userService.getUsersPaged(page, size,search,role,locked));
    }

    @GetMapping("/{id}/details")
    @Operation(summary = "Xem hồ sơ khách hàng 360° (Thông tin, Đơn hàng, Thiết bị sở hữu, Lịch sử bảo hành)", description = "Tổng hợp toàn diện thông tin cá nhân, danh sách đơn hàng đã mua, thiết bị SmartBox đang sở hữu và lịch sử yêu cầu bảo hành")
    public ResponseEntity<Customer360Response> getUser360Details(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUser360Details(id));
    }

    @PatchMapping("/{id}/toggle-lock")
    @Operation(summary = "Khóa hoặc mở khóa tài khoản người dùng", description = "Thay đổi trạng thái hoạt động của tài khoản kèm theo lý do cụ thể phục vụ mục đích kiểm toán")
    public ResponseEntity<UserProfileResponse> toggleLock(
            @PathVariable UUID id,
            @RequestBody LockUpdateRequest request) {
        return ResponseEntity.ok(userService.toggleLock(id, request.getIsLocked(), request.getReason()));
    }

    @PatchMapping("/{id}/role")
    @Operation(summary = "Cập nhật vai trò / quyền hạn người dùng (super_admin, technician, product_manager,...)", description = "Phân bổ lại vai trò hệ thống RBAC (super_admin, technician, product_manager, customer) cho tài khoản")
    public ResponseEntity<UserProfileResponse> updateRole(
            @PathVariable UUID id,
            @RequestBody RoleUpdateRequest request) {
        return ResponseEntity.ok(userService.updateRole(id, request.getRole()));
    }

    @PostMapping("/staff")
    @Operation(summary = "Cấp tài khoản nhân viên mới theo vai trò (Dành cho Super Admin)", 
               description = "Khởi tạo tài khoản nội bộ và phân quyền: product_manager (PO), technician (kỹ thuật viên), super_admin...")
    public ResponseEntity<UserProfileResponse> createStaffUser(@RequestBody @Valid CreateStaffRequest request) {
        return ResponseEntity.ok(userService.createStaffUser(request));
    }

    @PostMapping("/{id}/send-reset-otp")
    @Operation(summary = "Phát mã xác thực OTP gửi qua Email cho khách hàng (Hotline Reset)", description = "Hỗ trợ nhân viên CSKH/Admin phát sinh mã OTP và gửi về email khách hàng khi tiếp nhận yêu cầu qua tổng đài")
    public ResponseEntity<SendOtpResponse> sendResetOtp(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.sendResetPasswordOtp(id));
    }

    @PostMapping("/{id}/verify-reset-password")
    @Operation(summary = "Xác thực mã OTP và đặt lại mật khẩu mới cho khách hàng", description = "Kiểm tra tính hợp lệ của mã OTP và tiến hành thiết lập mật khẩu mới cho tài khoản người dùng")
    public ResponseEntity<ResetPasswordResponse> verifyResetPassword(
            @PathVariable UUID id,
            @RequestBody VerifyResetPasswordRequest request) {
        return ResponseEntity.ok(userService.verifyOtpAndResetPassword(id, request.getOtp(), request.getNewPassword()));
    }
}
