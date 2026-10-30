package com.smartbox.backend.dto.request.customer;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class CustomerDirectoryRequests {

    private CustomerDirectoryRequests() {
        // Utility class
    }

    @Schema(description = "Yêu cầu tạo mới hồ sơ khách hàng")
    public record Create(
            @NotBlank
            @Size(max = 200)
            @Schema(description = "Họ và tên khách hàng", example = "Nguyễn Văn A")
            String fullName,

            @Email
            @Size(max = 254)
            @Schema(description = "Địa chỉ email liên hệ", example = "khachhang@example.com")
            String email,

            @Pattern(regexp = "^$|\\+?[0-9 ()-]{8,30}")
            @Schema(description = "Số điện thoại liên hệ", example = "0987654321")
            String phone,

            @Size(max = 2000)
            @Schema(description = "Địa chỉ giao hàng mặc định", example = "Số 12 Chùa Bộc, Đống Đa, Hà Nội")
            String address,

            @Size(max = 2000)
            @Schema(description = "Ghi chú nội bộ về khách hàng", example = "Khách hàng VIP")
            String notes,

            @Schema(description = "Tùy chọn tự động khởi tạo tài khoản đăng nhập portal", example = "true")
            boolean createLogin,

            @Pattern(regexp = "(?i)[a-z0-9][a-z0-9_.-]{2,31}")
            @Schema(description = "Tên đăng nhập (nếu tạo tài khoản)", example = "nguyenvana")
            String username,

            @Size(min = 8, max = 72)
            @Schema(description = "Mật khẩu khởi tạo ban đầu", example = "SecurePass123@")
            String password
    ) {
        @Override
        public String toString() {
            return "CustomerCreate[fullName=" + fullName + ", email=" + email + ", phone=" + phone + ", password=[PROTECTED]]";
        }
    }

    @Schema(description = "Yêu cầu cập nhật hồ sơ khách hàng")
    public record Update(
            @NotBlank
            @Size(max = 200)
            @Schema(description = "Họ và tên khách hàng", example = "Nguyễn Văn A")
            String fullName,

            @Email
            @Size(max = 254)
            @Schema(description = "Địa chỉ email liên hệ", example = "khachhang@example.com")
            String email,

            @Pattern(regexp = "^$|\\+?[0-9 ()-]{8,30}")
            @Schema(description = "Số điện thoại liên hệ", example = "0987654321")
            String phone,

            @Size(max = 2000)
            @Schema(description = "Địa chỉ giao hàng", example = "Số 12 Chùa Bộc, Đống Đa, Hà Nội")
            String address,

            @Size(max = 2000)
            @Schema(description = "Ghi chú nội bộ", example = "Đã cập nhật địa chỉ mới")
            String notes,

            @Schema(description = "Đánh dấu lưu trữ / vô hiệu hóa", example = "false")
            boolean archived
    ) {}
}
