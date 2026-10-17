package com.smartbox.backend.dto.response.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Kết quả xác thực đăng nhập và cấp phát JWT token")
public class LoginResponse {

    @Schema(description = "Trạng thái đăng nhập thành công hay thất bại", example = "true")
    private Boolean success;

    @Schema(description = "Thông điệp phản hồi", example = "Đăng nhập thành công")
    private String message;

    @Schema(description = "ID người dùng")
    private UUID userId;

    @Schema(description = "Email người dùng", example = "admin@smartbox.vn")
    private String email;

    @Schema(description = "Họ và tên", example = "Tổng Quản Trị Hệ Thống")
    private String fullName;

    @Schema(description = "Vai trò hệ thống (super_admin, technician, product_manager,...)", example = "super_admin")
    private String role;

    @Schema(description = "Đường dẫn ảnh đại diện")
    private String avatarUrl;

    @Schema(description = "Số điện thoại")
    private String phone;

    @Schema(description = "Địa chỉ mặc định")
    private String defaultAddress;

    @Schema(description = "Mã JWT Access Token", example = "eyJhbGciOiJIUzI1NiJ9...")
    private String accessToken;

    @Schema(description = "Mã JWT Refresh Token dùng để cấp lại Access Token khi hết hạn", example = "eyJhbGciOiJIUzI1NiJ9...")
    private String refreshToken;

    @Schema(description = "Loại Token xác thực", example = "Bearer")
    @Builder.Default
    private String tokenType = "Bearer";

    @Schema(description = "Thời gian hết hạn của Access Token (tính bằng giây)", example = "86400")
    private Long expiresIn;

    @Schema(description = "Trường token tương thích ngược với client cũ (đồng nhất với accessToken)")
    private String token;
}
