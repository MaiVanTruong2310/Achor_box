package com.smartbox.backend.dto.response.warranty;


import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Thông tin chi tiết yêu cầu khiếu nại bảo hành")
public class ClaimResponse {

    @Schema(description = "ID khiếu nại")
    private UUID id;

    @Schema(description = "ID bảo hành liên kết")
    private UUID warrantyId;

    @Schema(description = "Mô tả sự cố của khách hàng")
    private String description;

    @Schema(description = "Danh sách URL ảnh/video sự cố")
    private List<String> images;

    @Schema(description = "Trạng thái xử lý (new, assigned, in_progress, resolved, rejected)", example = "assigned")
    private String status;

    @Schema(description = "ID kỹ thuật viên được giao")
    private UUID assignedTo;

    @Schema(description = "Tên kỹ thuật viên", example = "Trần Kỹ Thuật")
    private String assigneeName;

    @Schema(description = "Số điện thoại kỹ thuật viên", example = "0933445566")
    private String assigneePhone;

    @Schema(description = "Ghi chú nội bộ")
    private String internalNotes;

    @Schema(description = "Thời gian tạo yêu cầu")
    private OffsetDateTime createdAt;

    @Schema(description = "Thời gian giải quyết xong")
    private OffsetDateTime resolvedAt;

    @Schema(description = "Số serial thiết bị", example = "SBX-2026-0001")
    private String serialNumber;

    @Schema(description = "Tên thiết bị", example = "SmartBox Home Standard")
    private String deviceName;

    @Schema(description = "Tên khách hàng", example = "Nguyễn Văn Hùng")
    private String customerName;

    @Schema(description = "Số điện thoại khách hàng", example = "0912345678")
    private String customerPhone;

    @Schema(description = "Địa chỉ khách hàng")
    private String customerAddress;

    @Schema(description = "Nhóm lỗi phân loại", example = "HARDWARE_LOCK")
    private String faultCategory;

    @Schema(description = "Ngày bắt đầu bảo hành")
    private LocalDate warrantyStartDate;

    @Schema(description = "Ngày hết hạn bảo hành")
    private LocalDate warrantyEndDate;
}
