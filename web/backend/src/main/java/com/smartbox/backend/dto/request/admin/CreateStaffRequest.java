package com.smartbox.backend.dto.request.admin;

import com.smartbox.backend.dto.request.admin.*;
import com.smartbox.backend.dto.request.auth.*;
import com.smartbox.backend.dto.request.catalog.*;
import com.smartbox.backend.dto.request.commerce.*;
import com.smartbox.backend.dto.request.customer.*;
import com.smartbox.backend.dto.request.device.*;
import com.smartbox.backend.dto.request.warranty.*;
import com.smartbox.backend.dto.response.admin.*;
import com.smartbox.backend.dto.response.auth.*;
import com.smartbox.backend.dto.response.catalog.*;
import com.smartbox.backend.dto.response.commerce.*;
import com.smartbox.backend.dto.response.customer.*;
import com.smartbox.backend.dto.response.device.*;
import com.smartbox.backend.dto.response.warranty.*;

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
    @Schema(description = "Vai trò được cấp: super_admin, product_manager (PO), technician", example = "technician")
    private String role;

    @Schema(description = "Địa chỉ làm việc / chi nhánh", example = "Tầng 5, Tòa SmartBox Tower, Hà Nội")
    private String defaultAddress;

    @Schema(description = "Mật khẩu ban đầu bắt buộc, dài 12–128 ký tự; được Auth provider băm và lưu trữ")
    private String initialPassword;
}
