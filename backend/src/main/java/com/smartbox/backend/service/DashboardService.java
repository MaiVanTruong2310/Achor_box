package com.smartbox.backend.service;

import com.smartbox.backend.dto.DashboardStatsDTO;
import com.smartbox.backend.dto.OrderDTO;
import com.smartbox.backend.model.Order;
import com.smartbox.backend.model.OrderItem;
import com.smartbox.backend.model.Product;
import com.smartbox.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final DeviceRepository deviceRepository;
    private final WarrantyClaimRepository warrantyClaimRepository;
    private final OrderService orderService;

    @Transactional(readOnly = true)
    public DashboardStatsDTO getDashboardStats() {
        return getDashboardStats("6m");
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "dashboardStats", key = "#range != null ? #range.toLowerCase() : '6m'")
    public DashboardStatsDTO getDashboardStats(String range) {
        String normalizedRange = (range != null) ? range.trim().toLowerCase() : "6m";
        List<Order> orders = orderRepository.findAllByOrderByCreatedAtDesc();

        // 1. Tổng doanh thu thực tế
        BigDecimal totalRevenue = orders.stream()
                .filter(o -> !"cancelled".equalsIgnoreCase(o.getStatus()) && !"refunded".equalsIgnoreCase(o.getStatus()))
                .map(Order::getTotal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalOrders = orders.size();
        long totalDevices = deviceRepository.count();
        long activeDevices = deviceRepository.countByStatus("online");
        long pendingWarranties = warrantyClaimRepository.countByStatusIn(Arrays.asList("new", "in_progress"));

        // 2. Tính toán tăng trưởng tháng hiện tại so với tháng trước
        YearMonth currentYearMonth = YearMonth.now();
        YearMonth previousYearMonth = currentYearMonth.minusMonths(1);

        BigDecimal currentMonthRevenue = BigDecimal.ZERO;
        BigDecimal previousMonthRevenue = BigDecimal.ZERO;
        long currentMonthOrders = 0;
        long previousMonthOrders = 0;

        for (Order o : orders) {
            if (o.getCreatedAt() == null) continue;
            YearMonth orderYm = YearMonth.from(o.getCreatedAt());
            boolean isValidRevenue = !"cancelled".equalsIgnoreCase(o.getStatus()) && !"refunded".equalsIgnoreCase(o.getStatus());

            if (orderYm.equals(currentYearMonth)) {
                currentMonthOrders++;
                if (isValidRevenue && o.getTotal() != null) {
                    currentMonthRevenue = currentMonthRevenue.add(o.getTotal());
                }
            } else if (orderYm.equals(previousYearMonth)) {
                previousMonthOrders++;
                if (isValidRevenue && o.getTotal() != null) {
                    previousMonthRevenue = previousMonthRevenue.add(o.getTotal());
                }
            }
        }

        double revenueGrowth = 0.0;
        if (previousMonthRevenue.compareTo(BigDecimal.ZERO) > 0) {
            revenueGrowth = currentMonthRevenue.subtract(previousMonthRevenue)
                    .divide(previousMonthRevenue, 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal(100))
                    .setScale(1, RoundingMode.HALF_UP)
                    .doubleValue();
        } else if (currentMonthRevenue.compareTo(BigDecimal.ZERO) > 0) {
            revenueGrowth = 100.0;
        }

        double ordersGrowth = 0.0;
        if (previousMonthOrders > 0) {
            ordersGrowth = Math.round(((double) (currentMonthOrders - previousMonthOrders) / previousMonthOrders) * 1000.0) / 10.0;
        } else if (currentMonthOrders > 0) {
            ordersGrowth = 100.0;
        }

        // 3. Biểu đồ xu hướng tính toán động theo range (7d / 30d / 6m)
        List<DashboardStatsDTO.MonthlyRevenueItem> timelineRevenue = new ArrayList<>();

        if ("7d".equals(normalizedRange) || "7days".equals(normalizedRange)) {
            // Lọc 7 ngày gần nhất
            LocalDate today = LocalDate.now();
            DateTimeFormatter dayMonthFmt = DateTimeFormatter.ofPattern("dd/MM");
            DateTimeFormatter fullDateFmt = DateTimeFormatter.ofPattern("dd 'Tháng' MM, yyyy");

            for (int i = 6; i >= 0; i--) {
                LocalDate targetDate = today.minusDays(i);
                String shortLabel = targetDate.format(dayMonthFmt);
                String fullLabel = "Ngày " + targetDate.format(fullDateFmt);

                BigDecimal dayRev = BigDecimal.ZERO;
                int dayOrdCount = 0;

                for (Order o : orders) {
                    if (o.getCreatedAt() != null && o.getCreatedAt().toLocalDate().isEqual(targetDate)) {
                        dayOrdCount++;
                        if (!"cancelled".equalsIgnoreCase(o.getStatus()) && !"refunded".equalsIgnoreCase(o.getStatus()) && o.getTotal() != null) {
                            dayRev = dayRev.add(o.getTotal());
                        }
                    }
                }

                double revInMillions = dayRev.divide(new BigDecimal("1000000"), 2, RoundingMode.HALF_UP).doubleValue();
                timelineRevenue.add(new DashboardStatsDTO.MonthlyRevenueItem(shortLabel, fullLabel, revInMillions, dayOrdCount));
            }

        } else if ("30d".equals(normalizedRange) || "30days".equals(normalizedRange)) {
            // Lọc 30 ngày gần nhất (tổng hợp 30 điểm dữ liệu ngày)
            LocalDate today = LocalDate.now();
            DateTimeFormatter dayMonthFmt = DateTimeFormatter.ofPattern("dd/MM");
            DateTimeFormatter fullDateFmt = DateTimeFormatter.ofPattern("dd 'Tháng' MM, yyyy");

            for (int i = 29; i >= 0; i--) {
                LocalDate targetDate = today.minusDays(i);
                String shortLabel = targetDate.format(dayMonthFmt);
                String fullLabel = "Ngày " + targetDate.format(fullDateFmt);

                BigDecimal dayRev = BigDecimal.ZERO;
                int dayOrdCount = 0;

                for (Order o : orders) {
                    if (o.getCreatedAt() != null && o.getCreatedAt().toLocalDate().isEqual(targetDate)) {
                        dayOrdCount++;
                        if (!"cancelled".equalsIgnoreCase(o.getStatus()) && !"refunded".equalsIgnoreCase(o.getStatus()) && o.getTotal() != null) {
                            dayRev = dayRev.add(o.getTotal());
                        }
                    }
                }

                double revInMillions = dayRev.divide(new BigDecimal("1000000"), 2, RoundingMode.HALF_UP).doubleValue();
                timelineRevenue.add(new DashboardStatsDTO.MonthlyRevenueItem(shortLabel, fullLabel, revInMillions, dayOrdCount));
            }

        } else {
            // Mặc định 6 tháng gần nhất
            DateTimeFormatter labelFormatter = DateTimeFormatter.ofPattern("MM/yyyy");

            for (int i = 5; i >= 0; i--) {
                YearMonth ym = currentYearMonth.minusMonths(i);
                String monthLabel = "Thg " + ym.format(labelFormatter);
                String fullLabel = "Tháng " + ym.getMonthValue() + ", " + ym.getYear();

                BigDecimal monthRev = BigDecimal.ZERO;
                int monthOrdCount = 0;

                for (Order o : orders) {
                    if (o.getCreatedAt() != null && YearMonth.from(o.getCreatedAt()).equals(ym)) {
                        monthOrdCount++;
                        if (!"cancelled".equalsIgnoreCase(o.getStatus()) && !"refunded".equalsIgnoreCase(o.getStatus()) && o.getTotal() != null) {
                            monthRev = monthRev.add(o.getTotal());
                        }
                    }
                }

                double revInMillions = monthRev.divide(new BigDecimal("1000000"), 2, RoundingMode.HALF_UP).doubleValue();
                timelineRevenue.add(new DashboardStatsDTO.MonthlyRevenueItem(monthLabel, fullLabel, revInMillions, monthOrdCount));
            }
        }

        // 4. Cơ cấu doanh số theo sản phẩm (Tính toán động từ order_items và products)
        List<OrderItem> allOrderItems = orderItemRepository.findAll();
        Map<String, BigDecimal> productRevenueMap = new HashMap<>();
        Map<String, String> productSubMap = new HashMap<>();

        for (OrderItem item : allOrderItems) {
            if (item.getProduct() != null) {
                String pName = item.getProduct().getName();
                BigDecimal itemTotal = (item.getUnitPrice() != null)
                        ? item.getUnitPrice().multiply(new BigDecimal(item.getQuantity() != null ? item.getQuantity() : 1))
                        : BigDecimal.ZERO;

                productRevenueMap.put(pName, productRevenueMap.getOrDefault(pName, BigDecimal.ZERO).add(itemTotal));
                productSubMap.put(pName, item.getProduct().getSku() != null ? "Mã: " + item.getProduct().getSku() : "Sản phẩm chính hãng");
            }
        }

        String[] colors = {"#3b82f6", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6"};
        List<DashboardStatsDTO.ProductSalesItem> productSales = new ArrayList<>();
        int colorIdx = 0;

        BigDecimal totalProductRev = productRevenueMap.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);

        for (Map.Entry<String, BigDecimal> entry : productRevenueMap.entrySet()) {
            int percent = 0;
            if (totalProductRev.compareTo(BigDecimal.ZERO) > 0) {
                percent = entry.getValue().multiply(new BigDecimal(100)).divide(totalProductRev, 0, RoundingMode.HALF_UP).intValue();
            }
            productSales.add(DashboardStatsDTO.ProductSalesItem.builder()
                    .id("p-" + colorIdx)
                    .name(entry.getKey())
                    .sub(productSubMap.getOrDefault(entry.getKey(), "Sản phẩm IoT"))
                    .percent(percent)
                    .revenue(entry.getValue())
                    .color(colors[colorIdx % colors.length])
                    .build());
            colorIdx++;
        }

        // Nếu chưa có đơn hàng nào, tạo danh sách phân bố sản phẩm từ danh mục sản phẩm hiện có
        if (productSales.isEmpty()) {
            List<Product> products = productRepository.findAll();
            for (Product p : products) {
                productSales.add(DashboardStatsDTO.ProductSalesItem.builder()
                        .id(p.getId() != null ? p.getId().toString() : "p-" + colorIdx)
                        .name(p.getName())
                        .sub("SKU: " + p.getSku())
                        .percent(0)
                        .revenue(BigDecimal.ZERO)
                        .color(colors[colorIdx % colors.length])
                        .build());
                colorIdx++;
            }
        }

        List<OrderDTO.OrderResponse> recentOrders = orderService.getOrders().stream()
                .limit(5)
                .collect(Collectors.toList());

        return DashboardStatsDTO.builder()
                .totalRevenue(totalRevenue)
                .revenueGrowth(revenueGrowth)
                .totalOrders(totalOrders)
                .ordersGrowth(ordersGrowth)
                .activeDevices(activeDevices)
                .totalDevices(totalDevices)
                .pendingWarranties(pendingWarranties)
                .monthlyRevenue(timelineRevenue)
                .productSales(productSales)
                .recentOrders(recentOrders)
                .build();
    }
}

