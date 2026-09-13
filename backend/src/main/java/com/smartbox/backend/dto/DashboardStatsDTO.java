package com.smartbox.backend.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsDTO {
    private BigDecimal totalRevenue;
    private Double revenueGrowth;
    private Long totalOrders;
    private Double ordersGrowth;
    private Long activeDevices;
    private Long totalDevices;
    private Long pendingWarranties;
    private List<MonthlyRevenueItem> monthlyRevenue;
    private List<ProductSalesItem> productSales;
    private List<OrderDTO.OrderResponse> recentOrders;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MonthlyRevenueItem {
        private String month;
        private String label;
        private Double revenue;
        private Integer orders;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProductSalesItem {
        private String id;
        private String name;
        private String sub;
        private Integer percent;
        private BigDecimal revenue;
        private String color;
    }
}
