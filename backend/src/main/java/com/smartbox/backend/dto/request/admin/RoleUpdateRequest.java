package com.smartbox.backend.dto.request.admin;


import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu thay đổi vai trò phân quyền người dùng")
public class RoleUpdateRequest {

    @Schema(description = "Vai trò mới (ADMIN, STAFF, CUSTOMER, TECHNICIAN)", example = "STAFF")
    private String role;
}
