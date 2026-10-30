package com.smartbox.backend.dto.response.device;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.UUID;

@Schema(description = "Kết quả phản hồi của các quy trình nghiệp vụ thiết bị SmartBox")
public final class DeviceWorkflowResponses {

    private DeviceWorkflowResponses() {
        // Utility class
    }

    @Schema(description = "Thông tin phản hồi sau khi đăng ký mã Serial thiết bị vào kho")
    public record DeviceRegistrationResponse(
            @Schema(description = "Mã định danh thiết bị UUID vừa khởi tạo", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            UUID deviceId,

            @Schema(description = "Mã Serial Number của thiết bị", example = "SBX-2026-X892")
            String serialNumber
    ) {}

    @Schema(description = "Thông tin phản hồi sau khi đăng ký hàng loạt mã Serial vào kho")
    public record DeviceBatchRegistrationResponse(
            @Schema(description = "Tổng số lượng thiết bị đã đăng ký thành công", example = "10")
            int count,

            @Schema(description = "Danh sách chi tiết các thiết bị vừa nhập kho")
            List<DeviceRegistrationResponse> devices
    ) {}
}
