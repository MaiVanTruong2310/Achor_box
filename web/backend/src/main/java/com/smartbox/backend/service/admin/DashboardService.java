package com.smartbox.backend.service.admin;

import com.smartbox.backend.dto.response.admin.DashboardStatsResponse;
import com.smartbox.backend.dto.response.admin.MonthlyRevenueItem;
import com.smartbox.backend.dto.response.admin.ProductSalesItem;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.repository.OrderRepository;
import com.smartbox.backend.service.commerce.OrderService;
import com.smartbox.backend.service.commerce.OrderWorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Service tổng hợp số liệu thống kê Dashboard Admin.
 * Đã tối ưu hóa truy vấn dạng Batch/Aggregation thay vì lặp N+1 queries.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final CommerceRepository db;
    private final OrderRepository orderRepository;
    private final OrderService orderService;

    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats() {
        return getDashboardStats("6m");
    }

    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats(String range) {
        String normalized = range == null ? "6m" : range.trim().toLowerCase(Locale.ROOT);
        if (!Set.of("7d", "7days", "30d", "30days", "6m").contains(normalized)) {
            throw new BadRequestException("INVALID_DASHBOARD_RANGE");
        }

        LocalDate today = LocalDate.now(ZONE);
        LocalDate month = today.withDayOfMonth(1);
        LocalDate previous = month.minusMonths(1);

        BigDecimal total = revenue(null, null);
        BigDecimal currentRevenue = revenue(month, month.plusMonths(1));
        BigDecimal priorRevenue = revenue(previous, month);

        long currentOrders = orders(month, month.plusMonths(1));
        long priorOrders = orders(previous, month);

        List<MonthlyRevenueItem> timeline = new ArrayList<>();

        if (normalized.equals("6m")) {
            LocalDate rangeStart = month.minusMonths(5);
            LocalDate rangeEnd = month.plusMonths(1);
            OffsetDateTime startTz = rangeStart.atStartOfDay(ZONE).toOffsetDateTime();
            OffsetDateTime endTz = rangeEnd.atStartOfDay(ZONE).toOffsetDateTime();

            Map<String, BigDecimal> revMap = new HashMap<>();
            for (var row : db.list(
                    "SELECT TO_CHAR(paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') AS bucket, COALESCE(sum(total),0) AS rev " +
                    "FROM public.orders WHERE CAST(status AS text) IN('paid','confirmed','completed') AND paid_at IS NOT NULL AND paid_at >= ? AND paid_at < ? " +
                    "GROUP BY bucket", startTz, endTz)) {
                revMap.put(row.get("bucket").toString(), OrderWorkflowService.money(row.get("rev")));
            }

            Map<String, Long> ordMap = new HashMap<>();
            for (var row : db.list(
                    "SELECT TO_CHAR(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') AS bucket, count(*) AS total_orders " +
                    "FROM public.orders WHERE created_at >= ? AND created_at < ? " +
                    "GROUP BY bucket", startTz, endTz)) {
                ordMap.put(row.get("bucket").toString(), ((Number) row.get("total_orders")).longValue());
            }

            for (int i = 5; i >= 0; i--) {
                LocalDate start = month.minusMonths(i);
                String key = start.format(DateTimeFormatter.ofPattern("yyyy-MM"));
                BigDecimal rev = revMap.getOrDefault(key, BigDecimal.ZERO);
                long ord = ordMap.getOrDefault(key, 0L);

                timeline.add(MonthlyRevenueItem.builder()
                        .month("T" + start.getMonthValue())
                        .label("Tháng " + start.getMonthValue() + "/" + start.getYear())
                        .revenue(rev.doubleValue())
                        .orders(Math.toIntExact(ord))
                        .build());
            }
        } else {
            int days = normalized.startsWith("7") ? 7 : 30;
            LocalDate rangeStart = today.minusDays(days - 1);
            LocalDate rangeEnd = today.plusDays(1);
            OffsetDateTime startTz = rangeStart.atStartOfDay(ZONE).toOffsetDateTime();
            OffsetDateTime endTz = rangeEnd.atStartOfDay(ZONE).toOffsetDateTime();

            Map<String, BigDecimal> revMap = new HashMap<>();
            for (var row : db.list(
                    "SELECT TO_CHAR(paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS bucket, COALESCE(sum(total),0) AS rev " +
                    "FROM public.orders WHERE CAST(status AS text) IN('paid','confirmed','completed') AND paid_at IS NOT NULL AND paid_at >= ? AND paid_at < ? " +
                    "GROUP BY bucket", startTz, endTz)) {
                revMap.put(row.get("bucket").toString(), OrderWorkflowService.money(row.get("rev")));
            }

            Map<String, Long> ordMap = new HashMap<>();
            for (var row : db.list(
                    "SELECT TO_CHAR(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS bucket, count(*) AS total_orders " +
                    "FROM public.orders WHERE created_at >= ? AND created_at < ? " +
                    "GROUP BY bucket", startTz, endTz)) {
                ordMap.put(row.get("bucket").toString(), ((Number) row.get("total_orders")).longValue());
            }

            for (int i = days - 1; i >= 0; i--) {
                LocalDate start = today.minusDays(i);
                String key = start.toString();
                BigDecimal rev = revMap.getOrDefault(key, BigDecimal.ZERO);
                long ord = ordMap.getOrDefault(key, 0L);

                timeline.add(MonthlyRevenueItem.builder()
                        .month(start.format(DateTimeFormatter.ofPattern("dd/MM")))
                        .label(start.toString())
                        .revenue(rev.doubleValue())
                        .orders(Math.toIntExact(ord))
                        .build());
            }
        }

        var sales = db.list(
                "SELECT i.product_id, max(i.product_name_snapshot) AS name, sum(i.unit_price * i.quantity) AS revenue " +
                "FROM public.order_items i " +
                "JOIN public.orders o ON o.id = i.order_id " +
                "WHERE CAST(o.status AS text) IN('paid','confirmed','completed') AND o.paid_at IS NOT NULL " +
                "GROUP BY i.product_id " +
                "ORDER BY revenue DESC LIMIT 10");

        BigDecimal salesTotal = sales.stream()
                .map(r -> OrderWorkflowService.money(r.get("revenue")))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String[] colors = {"#0284c7", "#059669", "#d97706", "#7c3aed", "#db2777"};
        List<ProductSalesItem> products = new ArrayList<>();
        int index = 0;

        for (var sale : sales) {
            BigDecimal revenue = OrderWorkflowService.money(sale.get("revenue"));
            products.add(ProductSalesItem.builder()
                    .id(Objects.toString(sale.get("product_id"), null))
                    .name(Objects.toString(sale.get("name"), null))
                    .sub(null)
                    .revenue(revenue)
                    .percent(salesTotal.signum() == 0 ? 0 : revenue.multiply(BigDecimal.valueOf(100)).divide(salesTotal, 0, RoundingMode.HALF_UP).intValue())
                    .color(colors[index++ % colors.length])
                    .build());
        }

        return DashboardStatsResponse.builder()
                .totalRevenue(total)
                .revenueGrowth(growth(currentRevenue, priorRevenue))
                .totalOrders(count("SELECT count(*) AS total FROM public.orders"))
                .ordersGrowth(growth(BigDecimal.valueOf(currentOrders), BigDecimal.valueOf(priorOrders)))
                .activeDevices(count("SELECT count(*) AS total FROM public.devices WHERE status='online'"))
                .totalDevices(count("SELECT count(*) AS total FROM public.devices"))
                .pendingWarranties(count("SELECT count(*) AS total FROM public.warranty_claims WHERE status IN('new','in_progress')"))
                .monthlyRevenue(timeline)
                .productSales(products)
                .recentOrders(orderRepository.findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt"))).stream().map(orderService::mapToResponse).toList())
                .build();
    }

    private BigDecimal revenue(LocalDate from, LocalDate until) {
        String sql = "SELECT COALESCE(sum(total),0) AS total FROM public.orders WHERE CAST(status AS text) IN('paid','confirmed','completed') AND paid_at IS NOT NULL";
        return OrderWorkflowService.money(from == null
                ? db.one(sql).get("total")
                : db.one(sql + " AND paid_at >= ? AND paid_at < ?", from.atStartOfDay(ZONE).toOffsetDateTime(), until.atStartOfDay(ZONE).toOffsetDateTime()).get("total"));
    }

    private long orders(LocalDate from, LocalDate until) {
        return ((Number) db.one(
                "SELECT count(*) AS total FROM public.orders WHERE created_at >= ? AND created_at < ?",
                from.atStartOfDay(ZONE).toOffsetDateTime(), until.atStartOfDay(ZONE).toOffsetDateTime()
        ).get("total")).longValue();
    }

    private long count(String sql) {
        return ((Number) db.one(sql).get("total")).longValue();
    }

    private double growth(BigDecimal current, BigDecimal previous) {
        return previous.signum() == 0
                ? (current.signum() > 0 ? 100.0 : 0.0)
                : current.subtract(previous).multiply(BigDecimal.valueOf(100)).divide(previous, 1, RoundingMode.HALF_UP).doubleValue();
    }
}
