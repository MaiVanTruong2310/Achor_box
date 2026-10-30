package com.smartbox.backend.dto.response.commerce;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Schema(description = "Thông tin chi tiết tiến trình đơn hàng phục vụ tra cứu công khai")
public record OrderLookupResponse(
        @Schema(description = "Mã đơn hàng UUID", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        UUID orderId,

        @Schema(description = "Trạng thái đơn hàng", example = "confirmed")
        String status,

        @Schema(description = "Thời điểm khởi tạo đơn hàng")
        Object createdAt,

        @Schema(description = "Thời điểm thanh toán thành công")
        Object paidAt,

        @Schema(description = "Thời điểm hết hạn hiệu lực đơn hàng")
        Object expiresAt,

        @Schema(description = "Địa chỉ nhận hàng đầy đủ")
        String shippingAddress,

        @Schema(description = "Tên người nhận đã làm mờ bảo mật", example = "Nguyễn *** An")
        String recipientNameMasked,

        @Schema(description = "Số điện thoại nhận hàng đã làm mờ bảo mật", example = "098****321")
        String phoneMasked,

        @Schema(description = "Tổng giá trị thanh toán cuối cùng", example = "2500000.00")
        BigDecimal total,

        @Schema(description = "Tổng tiền tạm tính chưa áp dụng ưu đãi", example = "2700000.00")
        BigDecimal subtotal,

        @Schema(description = "Số tiền được giảm trừ", example = "200000.00")
        BigDecimal discountAmount,

        @Schema(description = "Mã giảm giá áp dụng (nếu có)", example = "CHAOBANMOI")
        String voucherCode,

        @Schema(description = "Danh sách sản phẩm trong đơn hàng")
        List<OrderItemDto> items,

        @Schema(description = "Dòng thời gian sự kiện của đơn hàng và tiến độ giao lắp")
        List<TimelineEventDto> timeline,

        @Schema(description = "Thông tin tiến độ giao hàng & lắp đặt (nếu có)")
        DeliveryInstallationDto deliveryInstallation
) {

    @Schema(description = "Thông tin sản phẩm trong đơn hàng tra cứu")
    public record OrderItemDto(
            @Schema(description = "Mã dòng đơn hàng UUID")
            UUID id,

            @Schema(description = "Tên sản phẩm")
            String productName,

            @Schema(description = "Tên biến thể / quy cách sản phẩm")
            String variantName,

            @Schema(description = "Mã SKU quản lý kho")
            String sku,

            @Schema(description = "Số lượng đặt hàng")
            Integer quantity,

            @Schema(description = "Đơn giá")
            BigDecimal unitPrice,

            @Schema(description = "Thành tiền của dòng sản phẩm")
            BigDecimal subtotal
    ) {}

    @Schema(description = "Sự kiện trên dòng thời gian đơn hàng")
    public record TimelineEventDto(
            @Schema(description = "Nguồn phát sinh sự kiện (ORDER hoặc DELIVERY)", example = "ORDER")
            String source,

            @Schema(description = "Mã hành động / Trạng thái đạt được", example = "confirmed")
            String action,

            @Schema(description = "Thời điểm phát sinh sự kiện")
            Object occurredAt
    ) {}

    @Schema(description = "Tiến độ công việc giao hàng & lắp đặt")
    public record DeliveryInstallationDto(
            @Schema(description = "Mã công việc giao lắp UUID")
            UUID id,

            @Schema(description = "Trạng thái công việc giao lắp")
            String status,

            @Schema(description = "Thời gian lên lịch")
            Object scheduledAt,

            @Schema(description = "Thời gian giao hàng đến nơi")
            Object deliveredAt,

            @Schema(description = "Thời gian hoàn tất lắp đặt")
            Object installedAt,

            @Schema(description = "Thời gian hoàn tất và nghiệm thu")
            Object completedAt,

            @Schema(description = "Khách hàng đã ký biên bản nghiệm thu hay chưa")
            Boolean customerAccepted,

            @Schema(description = "Danh sách thiết bị lắp đặt cho đơn hàng")
            List<DeviceItemDto> devices
    ) {}

    @Schema(description = "Thiết bị SmartBox được bàn giao")
    public record DeviceItemDto(
            @Schema(description = "Mã Serial Number của thiết bị")
            String serialNumber,

            @Schema(description = "Tên nhận diện thiết bị")
            String name,

            @Schema(description = "Cảm biến trọng lượng có được hỗ trợ hay không")
            Boolean hasWeightSensor
    ) {}
}
