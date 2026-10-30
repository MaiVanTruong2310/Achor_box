package com.smartbox.backend.dto.response.commerce;


import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Thông tin chi tiết đơn đặt hàng")
public class OrderResponse {

    @Schema(description = "ID đơn hàng")
    private UUID id;

    @Schema(description = "ID người đặt")
    private UUID userId;

    @Schema(description = "Tên khách hàng", example = "Nguyễn Văn Hùng")
    private String customerName;

    @Schema(description = "Số điện thoại nhận hàng", example = "0912345678")
    private String customerPhone;

    @Schema(description = "Địa chỉ giao hàng", example = "12 Chùa Bộc, Đống Đa, Hà Nội")
    private String shippingAddress;

    @Schema(description = "Mã vận đơn giao vận", example = "VNPOST-987654321")
    private String trackingNumber;

    @Schema(description = "Trạng thái đơn hàng (pending, processing, shipping, delivered, cancelled)", example = "shipping")
    private String status;

    @Schema(description = "Tổng giá trị đơn hàng (VNĐ)", example = "5000000")
    private BigDecimal total;

    @Schema(description = "Phương thức thanh toán", example = "VNPAY")
    private String paymentMethod;

    @Schema(description = "Trạng thái thanh toán (paid, pending, refunded)", example = "paid")
    private String paymentStatus;

    @Schema(description = "Mã tham chiếu giao dịch", example = "TXN-2026-8888")
    private String transactionRef;

    @Schema(description = "Tóm tắt danh sách mặt hàng")
    private String itemsSummary;

    @Schema(description = "Ngày tạo đơn")
    private OffsetDateTime createdAt;

    @Schema(description = "Ngày cập nhật đơn")
    private OffsetDateTime updatedAt;

    @Schema(description = "Danh sách chi tiết mặt hàng trong đơn")
    private List<OrderItemResponse> items;
}
