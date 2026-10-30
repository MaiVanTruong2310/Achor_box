package com.smartbox.backend.controller.auth;

import com.smartbox.backend.dto.request.customer.CustomerRequests;
import com.smartbox.backend.service.auth.CustomerAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth API", description = "Xác thực, đăng nhập JWT, làm mới token, đổi mật khẩu và quản lý phiên người dùng")
public class CustomerAuthController {

    private final CustomerAuthService auth;

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản khách hàng mới", description = "Tạo tài khoản khách hàng mới trên hệ thống với email, mật khẩu, họ tên và số điện thoại. Tự động khởi tạo hồ sơ người dùng.")
    public Map<String, Object> register(@Valid @RequestBody CustomerRequests.Register request) {
        return auth.register(request);
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Yêu cầu khôi phục mật khẩu (Quên mật khẩu)", description = "Gửi mã xác thực OTP hoặc thông tin khôi phục mật khẩu đến địa chỉ email đã đăng ký của khách hàng")
    public Map<String, Object> forgot(@Valid @RequestBody CustomerRequests.ForgotPassword request) {
        return auth.forgot(request);
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Đặt lại mật khẩu mới bằng mã OTP", description = "Xác minh mã OTP đã gửi qua email và cập nhật mật khẩu mới cho tài khoản khách hàng")
    public Map<String, Object> reset(@Valid @RequestBody CustomerRequests.ResetPassword request) {
        return auth.reset(request);
    }

    @PostMapping("/change-password")
    @Operation(summary = "Đổi mật khẩu người dùng", description = "Thay đổi mật khẩu đăng nhập của khách hàng khi đã đăng nhập bằng cách xác minh mật khẩu cũ")
    public Map<String, Object> change(@Valid @RequestBody CustomerRequests.ChangePassword request) {
        return auth.change(request);
    }
}
