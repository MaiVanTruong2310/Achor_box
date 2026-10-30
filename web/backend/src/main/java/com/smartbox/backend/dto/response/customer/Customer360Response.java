package com.smartbox.backend.dto.response.customer;


import com.smartbox.backend.dto.response.auth.UserProfileResponse;
import com.smartbox.backend.dto.response.commerce.OrderResponse;
import com.smartbox.backend.dto.response.device.DeviceResponse;
import com.smartbox.backend.dto.response.warranty.ClaimResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
