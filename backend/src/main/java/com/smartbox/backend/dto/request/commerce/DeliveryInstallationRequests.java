package com.smartbox.backend.dto.request.commerce;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class DeliveryInstallationRequests {

    private DeliveryInstallationRequests() {
        // Utility class
    }

    @Schema(description = "Yêu cầu phân công kỹ thuật viên cho đơn hàng giao lắp")
    public record Assignment(
            @NotNull
            @Schema(description = "Mã UUID của kỹ thuật viên được phân công")
            UUID assignedTo,

            @NotNull
            @Schema(description = "Thời gian lên lịch bắt đầu thực hiện")
            OffsetDateTime scheduledAt,

            @Schema(description = "Thời gian dự kiến hoàn thành")
            OffsetDateTime estimatedEndTime,

            @Size(max = 2000)
            @Schema(description = "Ghi chú hướng dẫn lắp đặt")
            String installationNote
    ) {
        public Assignment(UUID assignedTo, OffsetDateTime scheduledAt, String installationNote) {
            this(assignedTo, scheduledAt, null, installationNote);
        }
    }

    @Schema(description = "Ghi chú tiến độ")
    public record Note(
            @Size(max = 2000)
            @Schema(description = "Nội dung ghi chú")
            String note
    ) {}

    @Schema(description = "Ghi chú nghiệm thu lắp đặt")
    public record Installation(
            @NotBlank
            @Size(max = 2000)
            @Schema(description = "Chi tiết nghiệm thu lắp ráp và đấu nối")
            String installationNote
    ) {}

    @Schema(description = "Liên kết mã Serial thiết bị với dòng đơn hàng")
    public record Serial(
            @NotNull
            @Schema(description = "Mã dòng đơn hàng order_item_id")
            UUID orderItemId,

            @NotBlank
            @Size(max = 100)
            @Schema(description = "Mã Serial Number của thiết bị SmartBox")
            String serialNumber
    ) {}

    @Schema(description = "Lệnh điều khiển phần cứng kiểm thử tại chỗ")
    public record Command(
            @NotNull
            @Schema(description = "Mã thiết bị UUID")
            UUID deviceId,

            @NotBlank
            @Pattern(regexp = "LOCK|UNLOCK|TARE")
            @Schema(description = "Lệnh thực thi (LOCK, UNLOCK, TARE)", example = "UNLOCK")
            String action
    ) {}

    @Schema(description = "Xác nhận ký biên bản nghiệm thu từ phía khách hàng")
    public record Acceptance(
            @NotNull
            @Schema(description = "Khách hàng đồng ý nghiệm thu (true/false)")
            Boolean customerAccepted,

            @Size(max = 2000)
            @Schema(description = "Ý kiến phản hồi hoặc đánh giá của khách hàng")
            String note
    ) {}

    @Schema(description = "Báo cáo sự cố hoặc thất bại khi giao lắp")
    public record Failure(
            @NotBlank
            @Size(max = 2000)
            @Schema(description = "Lý do giao hàng hoặc lắp đặt không thành công")
            String failureReason
    ) {}

    @Schema(description = "Yêu cầu tái phân công công việc giao lắp")
    public record Reassignment(
            @NotNull
            @Schema(description = "Mã kỹ thuật viên mới được phân công")
            UUID assignedTo,

            @NotNull
            @Schema(description = "Thời gian lên lịch mới")
            OffsetDateTime scheduledAt,

            @Schema(description = "Thời gian dự kiến hoàn thành mới")
            OffsetDateTime estimatedEndTime,

            @NotBlank
            @Size(max = 2000)
            @Schema(description = "Lý do thay đổi lịch hoặc đổi kỹ thuật viên")
            String reason
    ) {
        public Reassignment(UUID assignedTo, OffsetDateTime scheduledAt, String reason) {
            this(assignedTo, scheduledAt, null, reason);
        }
    }

    @Schema(description = "Nộp hồ sơ minh chứng hoàn tất giao lắp để PO duyệt")
    public record CompletionSubmission(
            @NotEmpty
            @Schema(description = "Danh sách URL ảnh chụp hiện trường lắp đặt đã upload")
            List<String> proofPhotos,

            @Size(max = 2000)
            @Schema(description = "Ghi chú kết luận hoàn thành")
            String completionNote
    ) {}

    @Schema(description = "Yêu cầu từ chối hồ sơ hoàn thành từ phía PO")
    public record RejectionRequest(
            @NotBlank
            @Size(max = 2000)
            @Schema(description = "Lý do PO yêu cầu làm lại hoặc từ chối nghiệm thu")
            String reason
    ) {}

    @Schema(description = "Ghi chú phê duyệt hồ sơ nghiệm thu từ PO")
    public record PoApprovalRequest(
            @Size(max = 2000)
            @Schema(description = "Ghi chú chấp thuận của PO")
            String approvalNote
    ) {}
}
