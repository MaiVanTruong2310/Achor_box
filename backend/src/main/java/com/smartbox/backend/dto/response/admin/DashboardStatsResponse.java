package com.smartbox.backend.dto.response.admin;


import com.smartbox.backend.dto.response.commerce.OrderResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Số liệu thống kê tổng hợp Dashboard KPI & Báo cáo")
public class DashboardStatsResponse {

    @Schema(description = "Tổng doanh thu tích lũy", example = "450000000")
    private BigDecimal totalRevenue;

    @Schema(description = "Tốc độ tăng trưởng doanh thu so với kỳ trước (%)", example = "15.4")
    private Double revenueGrowth;

    @Schema(description = "Tổng số lượng đơn hàng", example = "156")
    private Long totalOrders;

    @Schema(description = "Tăng trưởng đơn hàng (%)", example = "8.2")
    private Double ordersGrowth;

    @Schema(description = "Số lượng thiết bị đang online", example = "84")
    private Long activeDevices;

    @Schema(description = "Tổng số thiết bị đã triển khai", example = "92")
    private Long totalDevices;

    @Schema(description = "Số ca bảo hành chờ xử lý", example = "3")
    private Long pendingWarranties;

    @Schema(description = "Biểu đồ doanh thu theo các tháng")
    private List<MonthlyRevenueItem> monthlyRevenue;

    @Schema(description = "Tỷ lệ cơ cấu sản phẩm bán ra")
    private List<ProductSalesItem> productSales;

    @Schema(description = "Danh sách các đơn hàng gần đây")
    private List<OrderResponse> recentOrders;
}
