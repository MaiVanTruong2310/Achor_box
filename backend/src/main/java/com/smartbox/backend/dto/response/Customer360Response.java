package com.smartbox.backend.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Báo cáo tổng quan chân dung khách hàng 360 độ")
public class Customer360Response {

    @Schema(description = "Thông tin hồ sơ người dùng")
    private UserProfileResponse profile;

    @Schema(description = "Lịch sử mua hàng")
    private List<OrderResponse> orders;

    @Schema(description = "Danh sách thiết bị khách hàng sở hữu")
    private List<DeviceResponse> devices;

    @Schema(description = "Lịch sử yêu cầu hỗ trợ và bảo hành")
    private List<ClaimResponse> warrantyClaims;
}
