package com.smartbox.backend.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu khởi tạo và cấp tài khoản nhân viên nội bộ")
public class CreateStaffRequest {

    @NotBlank(message = "Họ và tên không được để trống")
    @Schema(description = "Họ và tên nhân viên", example = "Trần Văn Kỹ Thuật")
    private String fullName;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    @Schema(description = "Email nhân viên (dùng để đăng nhập)", example = "tech.tran@smartbox.vn")
    private String email;

    @Schema(description = "Số điện thoại liên hệ", example = "0987654321")
    private String phone;

    @NotBlank(message = "Vai trò (Role) không được để trống")
    @Schema(description = "Vai trò được cấp: super_admin, product_manager, technician, support_agent, accountant", example = "technician")
    private String role;

    @Schema(description = "Địa chỉ làm việc / chi nhánh", example = "Tầng 5, Tòa SmartBox Tower, Hà Nội")
    private String defaultAddress;

    @Schema(description = "Mật khẩu ban đầu (nếu bỏ trống mặc định là TestOnly-Passw0rd!)", example = "TestOnly-Passw0rd!")
    private String initialPassword;
}
