package com.smartbox.backend.dto.response.commerce;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;

/**
 * Các Record DTO chuẩn cho module Giao hàng & Lắp đặt (Delivery & Installation).
 * Chuyển đổi từ dữ liệu thô sang các đối tượng có cấu trúc định kiểu tường minh,
 * phục vụ Swagger OpenAPI documentation và đảm bảo type-safety cho hệ thống.
 */
public final class DeliveryInstallationResponses {

    private DeliveryInstallationResponses() {}

    @Schema(description = "Tình trạng lịch rảnh và khả năng tiếp nhận đơn của kỹ thuật viên")
    public record TechnicianAvailability(
            @Schema(description = "ID kỹ thuật viên", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            UUID id,
            @Schema(description = "Họ và tên kỹ thuật viên", example = "Trần Văn Bình")
            String fullName,
            @Schema(description = "Số điện thoại kỹ thuật viên", example = "0912345678")
            String phone,
            @Schema(description = "Trạng thái sẵn sàng (true nếu không bị trùng lịch)", example = "true")
            boolean isAvailable,
            @Schema(description = "Lý do không thể nhận việc nếu trùng lịch", example = "Trùng lịch giao lắp đơn #ĐH-05 (09:00 - 11:00)")
            String conflictReason,
            @Schema(description = "Số lượng công việc đang xử lý trong ngày", example = "2")
            int activeTasksCount
    ) {
        public static TechnicianAvailability from(Map<String, Object> m) {
            if (m == null) return null;
            UUID uid = m.get("id") instanceof UUID u ? u : (m.get("id") != null ? UUID.fromString(m.get("id").toString()) : null);
            return new TechnicianAvailability(
                    uid,
                    Objects.toString(m.get("fullName"), null),
                    Objects.toString(m.get("phone"), null),
                    m.get("isAvailable") instanceof Boolean b ? b : false,
                    Objects.toString(m.get("conflictReason"), null),
                    m.get("activeTasksCount") instanceof Number n ? n.intValue() : 0
            );
        }
    }

    @Schema(description = "Thông tin tóm tắt của nhân viên kỹ thuật")
    public record TechnicianSummary(
            @Schema(description = "ID nhân viên kỹ thuật", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            UUID id,
            @Schema(description = "Họ và tên", example = "Trần Văn Bình")
            String fullName,
            @Schema(description = "Số điện thoại", example = "0912345678")
            String phone
    ) {
        public static TechnicianSummary from(Map<String, Object> m) {
            if (m == null) return null;
            UUID uid = m.get("id") instanceof UUID u ? u : (m.get("id") != null ? UUID.fromString(m.get("id").toString()) : null);
            return new TechnicianSummary(
                    uid,
                    Objects.toString(m.get("fullName"), null),
                    Objects.toString(m.get("phone"), null)
            );
        }
    }

    @Schema(description = "Phản hồi tải tệp ảnh minh chứng hiện trường hoặc biên bản nghiệm thu")
    public record ProofUploadResponse(
            @Schema(description = "Đường dẫn URL ảnh trực tuyến", example = "https://res.cloudinary.com/smartbox/image/upload/v1/proof.jpg")
            String url
    ) {}

    @Schema(description = "Kết quả gửi lệnh kiểm thử phần cứng thiết bị (Khóa/Mở khóa/Cân tải)")
    public record DeviceCommandExecutionResponse(
            @Schema(description = "ID lệnh điều khiển thiết bị", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            String commandId,
            @Schema(description = "Trạng thái lệnh", example = "PENDING")
            String status,
            @Schema(description = "Phiên bản công việc sau khi ghi nhận lệnh", example = "3")
            long jobVersion
    ) {
        public static DeviceCommandExecutionResponse from(Map<String, Object> m) {
            if (m == null) return null;
            return new DeviceCommandExecutionResponse(
                    Objects.toString(m.get("commandId"), null),
                    Objects.toString(m.get("status"), null),
                    m.get("jobVersion") instanceof Number num ? num.longValue() : 0L
            );
        }
    }

    @Schema(description = "Thông tin đơn hàng đã duyệt đủ điều kiện để phân công giao lắp")
    public record EligibleOrder(
            @Schema(description = "ID đơn hàng", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            String id,
            @Schema(description = "Địa chỉ nhận hàng", example = "Tòa A, 123 Đường Cầu Giấy, Hà Nội")
            String shippingAddress,
            @Schema(description = "Thời điểm đặt hàng", example = "2026-10-30T09:00:00Z")
            String createdAt
    ) {
        public static EligibleOrder from(Map<String, Object> m) {
            if (m == null) return null;
            return new EligibleOrder(
                    Objects.toString(m.get("id"), null),
                    Objects.toString(m.get("shippingAddress"), null),
                    Objects.toString(m.get("createdAt"), null)
            );
        }
    }

    @Schema(description = "Thông tin tóm tắt công việc giao hàng và lắp đặt")
    public record JobSummary(
            @Schema(description = "ID công việc giao lắp", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            String id,
            @Schema(description = "ID đơn hàng", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            String orderId,
            @Schema(description = "ID kỹ thuật viên được phân công", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            String assignedTo,
            @Schema(description = "Tên kỹ thuật viên phụ trách", example = "Trần Văn Bình")
            String technicianName,
            @Schema(description = "Số điện thoại kỹ thuật viên", example = "0912345678")
            String technicianPhone,
            @Schema(description = "Tên khách hàng nhận đơn", example = "Nguyễn Thị Mai")
            String customerName,
            @Schema(description = "Số điện thoại khách hàng", example = "0987654321")
            String customerPhone,
            @Schema(description = "Địa chỉ giao hàng và lắp đặt", example = "Số 12 Chùa Bộc, Đống Đa, Hà Nội")
            String shippingAddress,
            @Schema(description = "Trạng thái tiến độ (ASSIGNED, IN_PROGRESS, DELIVERED, INSTALLED, WAITING_PO_CONFIRMATION, COMPLETED, FAILED)", example = "ASSIGNED")
            String status,
            @Schema(description = "Thời gian hẹn giao lắp", example = "2026-10-30T14:00:00+07:00")
            String scheduledAt,
            @Schema(description = "Thời gian ước tính hoàn thành", example = "2026-10-30T16:00:00+07:00")
            String estimatedEndTime,
            @Schema(description = "Lần thử thực hiện công việc", example = "1")
            int attempt,
            @Schema(description = "Phiên bản dữ liệu (hỗ trợ kiểm soát xung đột đồng thời Concurrency ETag/If-Match)", example = "1")
            long version,
            @Schema(description = "Thời điểm khởi tạo công việc", example = "2026-10-30T09:00:00Z")
            String createdAt,
            @Schema(description = "Thời điểm cập nhật gần nhất", example = "2026-10-30T09:30:00Z")
            String updatedAt,
            @Schema(description = "Danh sách URL ảnh hiện trường hoàn thành")
            List<String> completionPhotos,
            @Schema(description = "Ghi chú kết quả hoàn thành từ kỹ thuật viên")
            String completionNote,
            @Schema(description = "Ghi chú yêu cầu xử lý lại từ Quản lý đơn hàng (PO)")
            String reworkNotes
    ) {
        @SuppressWarnings("unchecked")
        public static JobSummary from(Map<String, Object> m) {
            if (m == null) return null;
            return new JobSummary(
                    Objects.toString(m.get("id"), null),
                    Objects.toString(m.get("orderId"), null),
                    Objects.toString(m.get("assignedTo"), null),
                    Objects.toString(m.get("technicianName"), null),
                    Objects.toString(m.get("technicianPhone"), null),
                    Objects.toString(m.get("customerName"), null),
                    Objects.toString(m.get("customerPhone"), null),
                    Objects.toString(m.get("shippingAddress"), null),
                    Objects.toString(m.get("status"), null),
                    Objects.toString(m.get("scheduledAt"), null),
                    Objects.toString(m.get("estimatedEndTime"), null),
                    m.get("attempt") instanceof Number num ? num.intValue() : 1,
                    m.get("version") instanceof Number num ? num.longValue() : 0L,
                    Objects.toString(m.get("createdAt"), null),
                    Objects.toString(m.get("updatedAt"), null),
                    m.get("completionPhotos") instanceof List<?> list ? (List<String>) list : List.of(),
                    Objects.toString(m.get("completionNote"), null),
                    Objects.toString(m.get("reworkNotes"), null)
            );
        }
    }

    @Schema(description = "Hồ sơ thông tin chi tiết đầy đủ của công việc giao lắp")
    public record JobDetail(
            @Schema(description = "ID công việc giao lắp", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            String id,
            @Schema(description = "ID đơn hàng", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            String orderId,
            @Schema(description = "ID kỹ thuật viên được phân công", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            String assignedTo,
            @Schema(description = "Tên kỹ thuật viên phụ trách", example = "Trần Văn Bình")
            String technicianName,
            @Schema(description = "Số điện thoại kỹ thuật viên", example = "0912345678")
            String technicianPhone,
            @Schema(description = "Tên khách hàng nhận đơn", example = "Nguyễn Thị Mai")
            String customerName,
            @Schema(description = "Số điện thoại khách hàng", example = "0987654321")
            String customerPhone,
            @Schema(description = "Địa chỉ giao hàng và lắp đặt", example = "Số 12 Chùa Bộc, Đống Đa, Hà Nội")
            String shippingAddress,
            @Schema(description = "Trạng thái tiến độ (ASSIGNED, IN_PROGRESS, DELIVERED, INSTALLED, WAITING_PO_CONFIRMATION, COMPLETED, FAILED)", example = "ASSIGNED")
            String status,
            @Schema(description = "Trạng thái đơn hàng tổng thể", example = "confirmed")
            String orderStatus,
            @Schema(description = "Thời gian hẹn giao lắp", example = "2026-10-30T14:00:00+07:00")
            String scheduledAt,
            @Schema(description = "Thời gian ước tính hoàn thành", example = "2026-10-30T16:00:00+07:00")
            String estimatedEndTime,
            @Schema(description = "Thời điểm bắt đầu di chuyển/thực hiện")
            String startedAt,
            @Schema(description = "Thời điểm giao hàng đến nơi")
            String deliveredAt,
            @Schema(description = "Thời điểm hoàn thành lắp ráp vật lý")
            String installedAt,
            @Schema(description = "Thời điểm được phê duyệt hoàn tất nghiệm thu")
            String completedAt,
            @Schema(description = "Lần thử thực hiện công việc", example = "1")
            int attempt,
            @Schema(description = "Phiên bản dữ liệu Concurrency", example = "1")
            long version,
            @Schema(description = "Thời điểm khởi tạo công việc", example = "2026-10-30T09:00:00Z")
            String createdAt,
            @Schema(description = "Thời điểm cập nhật gần nhất", example = "2026-10-30T09:30:00Z")
            String updatedAt,
            @Schema(description = "Ghi chú lắp đặt vật lý")
            String installationNote,
            @Schema(description = "Ghi chú hoàn thành từ kỹ thuật viên")
            String completionNote,
            @Schema(description = "Danh sách URL ảnh hiện trường hoàn thành")
            List<String> completionPhotos,
            @Schema(description = "Ghi chú yêu cầu xử lý lại từ Quản lý đơn hàng (PO)")
            String reworkNotes,
            @Schema(description = "Lý do thất bại nếu gặp sự cố")
            String failureReason,
            @Schema(description = "Khách hàng đã ký nhận nghiệm thu", example = "true")
            Boolean customerAccepted,
            @Schema(description = "Thông tin liên hệ kỹ thuật viên")
            Map<String, Object> technician,
            @Schema(description = "Thông tin khách hàng nhận hàng")
            Map<String, Object> customer,
            @Schema(description = "Danh sách sản phẩm trong đơn hàng")
            List<Map<String, Object>> items,
            @Schema(description = "Danh sách thiết bị SmartBox thực tế được lắp đặt")
            List<Map<String, Object>> devices,
            @Schema(description = "Lịch sử chuyển đổi trạng thái và dấu vết kiểm toán")
            List<Map<String, Object>> history
    ) {
        @SuppressWarnings("unchecked")
        public static JobDetail from(Map<String, Object> m) {
            if (m == null) return null;
            return new JobDetail(
                    Objects.toString(m.get("id"), null),
                    Objects.toString(m.get("orderId"), null),
                    Objects.toString(m.get("assignedTo"), null),
                    Objects.toString(m.get("technicianName"), null),
                    Objects.toString(m.get("technicianPhone"), null),
                    Objects.toString(m.get("customerName"), null),
                    Objects.toString(m.get("customerPhone"), null),
                    Objects.toString(m.get("shippingAddress"), null),
                    Objects.toString(m.get("status"), null),
                    Objects.toString(m.get("orderStatus"), null),
                    Objects.toString(m.get("scheduledAt"), null),
                    Objects.toString(m.get("estimatedEndTime"), null),
                    Objects.toString(m.get("startedAt"), null),
                    Objects.toString(m.get("deliveredAt"), null),
                    Objects.toString(m.get("installedAt"), null),
                    Objects.toString(m.get("completedAt"), null),
                    m.get("attempt") instanceof Number num ? num.intValue() : 1,
                    m.get("version") instanceof Number num ? num.longValue() : 0L,
                    Objects.toString(m.get("createdAt"), null),
                    Objects.toString(m.get("updatedAt"), null),
                    Objects.toString(m.get("installationNote"), null),
                    Objects.toString(m.get("completionNote"), null),
                    m.get("completionPhotos") instanceof List<?> list ? (List<String>) list : List.of(),
                    Objects.toString(m.get("reworkNotes"), null),
                    Objects.toString(m.get("failureReason"), null),
                    m.get("customerAccepted") instanceof Boolean b ? b : Boolean.FALSE,
                    m.get("technician") instanceof Map<?, ?> tech ? (Map<String, Object>) tech : null,
                    m.get("customer") instanceof Map<?, ?> cust ? (Map<String, Object>) cust : null,
                    m.get("items") instanceof List<?> items ? (List<Map<String, Object>>) items : List.of(),
                    m.get("devices") instanceof List<?> devs ? (List<Map<String, Object>>) devs : List.of(),
                    m.get("history") instanceof List<?> hist ? (List<Map<String, Object>>) hist : List.of()
            );
        }
    }

    @Schema(description = "Kết quả kiểm tra đối soát cảm biến và chức năng vận hành thiết bị tại hiện trường")
    public record InstallationChecks(
            @Schema(description = "Đã lưu vết nghiệm thu chính thức", example = "true")
            Boolean recorded,
            @Schema(description = "Thời điểm nghiệm thu")
            String acceptedAt,
            @Schema(description = "Thời điểm quan trắc tín hiệu gần nhất")
            String observedAt,
            @Schema(description = "ID công việc giao lắp")
            String jobId,
            @Schema(description = "Lần thử nghiệm thu", example = "1")
            Integer attempt,
            @Schema(description = "Phiên bản công việc", example = "2")
            Long version,
            @Schema(description = "Tất cả thiết bị trong đơn đã được liên kết số serial thực tế", example = "true")
            Boolean serialComplete,
            @Schema(description = "Đủ điều kiện nghiệm thu hoàn tất", example = "true")
            Boolean ready,
            @Schema(description = "Danh sách các hạng mục kiểm tra chưa đạt yêu cầu")
            List<String> failedChecks,
            @Schema(description = "Đường dẫn URL ảnh biên bản nghiệm thu đã lưu trữ")
            String acceptanceEvidenceUrl,
            @Schema(description = "Chi tiết kết quả kiểm tra từng thiết bị SmartBox")
            List<Map<String, Object>> devices
    ) {
        @SuppressWarnings("unchecked")
        public static InstallationChecks from(Map<String, Object> m) {
            if (m == null) return null;
            return new InstallationChecks(
                    m.get("recorded") instanceof Boolean b ? b : false,
                    Objects.toString(m.get("acceptedAt"), null),
                    Objects.toString(m.get("observedAt"), null),
                    Objects.toString(m.get("jobId"), null),
                    m.get("attempt") instanceof Number num ? num.intValue() : 1,
                    m.get("version") instanceof Number num ? num.longValue() : 0L,
                    m.get("serialComplete") instanceof Boolean b ? b : false,
                    m.get("ready") instanceof Boolean b ? b : false,
                    m.get("failedChecks") instanceof List<?> list ? (List<String>) list : List.of(),
                    Objects.toString(m.get("acceptanceEvidenceUrl"), null),
                    m.get("devices") instanceof List<?> devs ? (List<Map<String, Object>>) devs : List.of()
            );
        }
    }

    @Schema(description = "Thời khóa biểu danh sách nhiệm vụ trong ngày của kỹ thuật viên")
    public record DailyTasks(
            @Schema(description = "Ngày truy vấn (yyyy-MM-dd)", example = "2026-10-30")
            String date,
            @Schema(description = "Tổng hợp số lượng công việc theo trạng thái")
            DailyTasksSummary summary,
            @Schema(description = "Danh sách công việc giao lắp và bảo hành bảo trì trong ngày")
            List<Map<String, Object>> tasks
    ) {
        public record DailyTasksSummary(
                int total,
                int pending,
                int inProgress,
                int waitingConfirmation,
                int completed
        ) {}

        @SuppressWarnings("unchecked")
        public static DailyTasks from(Map<String, Object> m) {
            if (m == null) return null;
            DailyTasksSummary summary = null;
            if (m.get("summary") instanceof Map<?, ?> sum) {
                summary = new DailyTasksSummary(
                        sum.get("total") instanceof Number n ? n.intValue() : 0,
                        sum.get("pending") instanceof Number n ? n.intValue() : 0,
                        sum.get("inProgress") instanceof Number n ? n.intValue() : 0,
                        sum.get("waitingConfirmation") instanceof Number n ? n.intValue() : 0,
                        sum.get("completed") instanceof Number n ? n.intValue() : 0
                );
            }
            List<Map<String, Object>> tasks = m.get("tasks") instanceof List<?> list ? (List<Map<String, Object>>) list : List.of();
            return new DailyTasks(
                    Objects.toString(m.get("date"), null),
                    summary,
                    tasks
            );
        }
    }

    @Schema(description = "Dữ liệu danh sách phân trang chuẩn")
    public record PagedResult<T>(
            @Schema(description = "Danh sách phần tử trong trang hiện tại")
            List<T> content,
            @Schema(description = "Số thứ tự trang hiện tại (0-indexed)", example = "0")
            int page,
            @Schema(description = "Kích thước số phần tử mỗi trang", example = "20")
            int size,
            @Schema(description = "Tổng số phần tử trên toàn bộ hệ thống", example = "52")
            long totalElements,
            @Schema(description = "Tổng số trang", example = "3")
            long totalPages
    ) {
        @SuppressWarnings("unchecked")
        public static <T> PagedResult<T> from(Map<String, Object> m, Function<Map<String, Object>, T> mapper) {
            if (m == null) return null;
            List<?> rawList = m.get("content") instanceof List<?> list ? list : List.of();
            List<T> content = rawList.stream()
                    .filter(Map.class::isInstance)
                    .map(item -> mapper.apply((Map<String, Object>) item))
                    .toList();
            return new PagedResult<>(
                    content,
                    m.get("page") instanceof Number n ? n.intValue() : 0,
                    m.get("size") instanceof Number n ? n.intValue() : 20,
                    m.get("totalElements") instanceof Number n ? n.longValue() : 0L,
                    m.get("totalPages") instanceof Number n ? n.longValue() : 0L
            );
        }
    }
}
