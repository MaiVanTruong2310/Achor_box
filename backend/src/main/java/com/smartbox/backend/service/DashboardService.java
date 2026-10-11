package com.smartbox.backend.service;

import com.smartbox.backend.dto.response.*;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** Keeps the legacy dashboard response while computing revenue from paidAt, never draft orders. */
@Service @RequiredArgsConstructor
public class DashboardService {
    private static final ZoneId ZONE=ZoneId.of("Asia/Ho_Chi_Minh");
    private final CommerceRepository db;
    private final OrderRepository orderRepository;
    private final OrderService orderService;
    @Transactional(readOnly=true) public DashboardStatsResponse getDashboardStats(){return getDashboardStats("6m");}
    @Transactional(readOnly=true) public DashboardStatsResponse getDashboardStats(String range) {
        String normalized=range==null?"6m":range.trim().toLowerCase(Locale.ROOT);
        if(!Set.of("7d","7days","30d","30days","6m").contains(normalized))throw new BadRequestException("INVALID_DASHBOARD_RANGE");
        LocalDate today=LocalDate.now(ZONE),month=today.withDayOfMonth(1),previous=month.minusMonths(1);
        var total=revenue(null,null);var currentRevenue=revenue(month,month.plusMonths(1));var priorRevenue=revenue(previous,month);
        long currentOrders=orders(month,month.plusMonths(1)),priorOrders=orders(previous,month);
        List<MonthlyRevenueItem> timeline=new ArrayList<>();
        if(normalized.equals("6m")) {
            for(int i=5;i>=0;i--){LocalDate start=month.minusMonths(i);timeline.add(MonthlyRevenueItem.builder().month("T"+start.getMonthValue()).label("Tháng "+start.getMonthValue()+"/"+start.getYear()).revenue(revenue(start,start.plusMonths(1)).doubleValue()).orders(Math.toIntExact(orders(start,start.plusMonths(1)))).build());}
        }else{
            int days=normalized.startsWith("7")?7:30;
            for(int i=days-1;i>=0;i--){LocalDate start=today.minusDays(i);timeline.add(MonthlyRevenueItem.builder().month(start.format(DateTimeFormatter.ofPattern("dd/MM"))).label(start.toString()).revenue(revenue(start,start.plusDays(1)).doubleValue()).orders(Math.toIntExact(orders(start,start.plusDays(1)))).build());}
        }
        var sales=db.list("SELECT i.product_id,max(i.product_name_snapshot) AS name,sum(i.unit_price*i.quantity) AS revenue FROM public.order_items i JOIN public.orders o ON o.id=i.order_id WHERE o.status IN('paid','confirmed','completed') AND o.paid_at IS NOT NULL GROUP BY i.product_id ORDER BY revenue DESC LIMIT 10");
        BigDecimal salesTotal=sales.stream().map(r->OrderWorkflowService.money(r.get("revenue"))).reduce(BigDecimal.ZERO,BigDecimal::add);
        String[] colors={"#0284c7","#059669","#d97706","#7c3aed","#db2777"};List<ProductSalesItem> products=new ArrayList<>();int index=0;
        for(var sale:sales){BigDecimal revenue=OrderWorkflowService.money(sale.get("revenue"));products.add(ProductSalesItem.builder().id(Objects.toString(sale.get("product_id"),null)).name(Objects.toString(sale.get("name"),null)).sub(null).revenue(revenue).percent(salesTotal.signum()==0?0:revenue.multiply(BigDecimal.valueOf(100)).divide(salesTotal,0,RoundingMode.HALF_UP).intValue()).color(colors[index++%colors.length]).build());}
        return DashboardStatsResponse.builder().totalRevenue(total).revenueGrowth(growth(currentRevenue,priorRevenue))
            .totalOrders(count("SELECT count(*) AS total FROM public.orders")).ordersGrowth(growth(BigDecimal.valueOf(currentOrders),BigDecimal.valueOf(priorOrders)))
            .activeDevices(count("SELECT count(*) AS total FROM public.devices WHERE status='online'")).totalDevices(count("SELECT count(*) AS total FROM public.devices"))
            .pendingWarranties(count("SELECT count(*) AS total FROM public.warranty_claims WHERE status IN('new','in_progress')"))
            .monthlyRevenue(timeline).productSales(products)
            .recentOrders(orderRepository.findAll(PageRequest.of(0,5,Sort.by(Sort.Direction.DESC,"createdAt"))).stream().map(orderService::mapToResponse).toList()).build();
    }
    private BigDecimal revenue(LocalDate from,LocalDate until){
        String sql="SELECT COALESCE(sum(total),0) AS total FROM public.orders WHERE status IN('paid','confirmed','completed') AND paid_at IS NOT NULL";
        return OrderWorkflowService.money(from==null?db.one(sql).get("total"):db.one(sql+" AND paid_at>=? AND paid_at<?",from.atStartOfDay(ZONE).toOffsetDateTime(),until.atStartOfDay(ZONE).toOffsetDateTime()).get("total"));
    }
    private long orders(LocalDate from,LocalDate until){return ((Number)db.one("SELECT count(*) AS total FROM public.orders WHERE created_at>=? AND created_at<?",from.atStartOfDay(ZONE).toOffsetDateTime(),until.atStartOfDay(ZONE).toOffsetDateTime()).get("total")).longValue();}
    private long count(String sql){return ((Number)db.one(sql).get("total")).longValue();}
    private double growth(BigDecimal current,BigDecimal previous){return previous.signum()==0?(current.signum()>0?100.0:0.0):current.subtract(previous).multiply(BigDecimal.valueOf(100)).divide(previous,1,RoundingMode.HALF_UP).doubleValue();}
}
