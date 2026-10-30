package com.smartbox.backend.dto.response.auth;


import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Hồ sơ thông tin chi tiết người dùng")
public class UserProfileResponse {

    @Schema(description = "ID người dùng")
    private UUID id;

    @Schema(description = "Họ và tên", example = "Nguyễn Văn Hùng")
    private String fullName;

    @Schema(description = "Số điện thoại", example = "0912345678")
    private String phone;

    @Schema(description = "Email liên hệ", example = "hung.nguyen@gmail.com")
    private String email;
    private String username;

    @Schema(description = "Đường dẫn ảnh đại diện")
    private String avatarUrl;

    @Schema(description = "Địa chỉ mặc định", example = "12 Chùa Bộc, Đống Đa, Hà Nội")
    private String defaultAddress;

    @Schema(description = "Vai trò (ADMIN, STAFF, TECHNICIAN, CUSTOMER)", example = "CUSTOMER")
    private String role;

    @Schema(description = "Trạng thái bị khóa", example = "false")
    private Boolean isLocked;

    @Schema(description = "Trạng thái bật 2FA", example = "false")
    private Boolean is2faEnabled;

    @Schema(description = "Ngày tạo tài khoản")
    private OffsetDateTime createdAt;

    @Schema(description = "Ngày cập nhật gần nhất")
    private OffsetDateTime updatedAt;
}
