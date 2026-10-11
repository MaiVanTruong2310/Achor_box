package com.smartbox.backend.service;

import com.smartbox.backend.exception.AppException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.*;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Supplier;

@Service
@Slf4j
public class ConcurrentDashboardService {
    private final CommerceRepository db;
    private final CurrentActor actors;
    private final Executor executor;
    private final long timeout;
    public ConcurrentDashboardService(CommerceRepository db,CurrentActor actors,@Qualifier("dashboardExecutor") Executor executor,@Value("${smartbox.dashboard.timeout-ms:1500}") long timeout) {
        this.db=db;this.actors=actors;this.executor=executor;this.timeout=timeout;
    }
    public Map<String,Object> dashboard(LocalDate date) {
        actors.get().requireRoles("super_admin","accountant");
        long start=System.nanoTime();
        OffsetDateTime from=date.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime();
        OffsetDateTime until=date.plusDays(1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime();
        Map<String,Supplier<Object>> parts=new LinkedHashMap<>();
        parts.put("revenueToday",()->db.one("SELECT COALESCE(sum(total),0) AS total FROM public.orders WHERE status IN('paid','confirmed','completed') AND paid_at>=? AND paid_at<?",from,until).get("total"));
        parts.put("orderCountByStatus",()->{
            Map<String,Object> counts=new LinkedHashMap<>();
            for(String status:List.of("pending","awaiting_payment","paid","confirmed","completed","cancelled"))counts.put(status.toUpperCase(Locale.ROOT),0L);
            for(var row:db.list("SELECT status,count(*) AS total FROM public.orders GROUP BY status"))counts.put(row.get("status").toString().toUpperCase(Locale.ROOT),row.get("total"));
            return counts;
        });
        parts.put("top5Products",()->db.list("SELECT i.product_id AS \"productId\",max(i.product_name_snapshot) AS name,sum(i.quantity) AS \"quantitySold\" FROM public.order_items i JOIN public.orders o ON o.id=i.order_id WHERE o.status IN('paid','confirmed','completed') AND o.paid_at>=? AND o.paid_at<? GROUP BY i.product_id ORDER BY sum(i.quantity) DESC,i.product_id LIMIT 5",from.minusDays(29),until));
        parts.put("lowStockProducts",()->db.list("SELECT v.id AS \"variantId\",v.product_id AS \"productId\",p.name,v.sku,v.stock_quantity AS stock FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE v.is_active=true AND p.is_active=true AND v.stock_quantity<=5 ORDER BY v.stock_quantity,v.id LIMIT 100"));
        Map<String,CompletableFuture<Object>> futures=new LinkedHashMap<>();
        try {
            parts.forEach((name,query)->futures.put(name,CompletableFuture.supplyAsync(()->{
                long partStart=System.nanoTime();
                try {return query.get();} finally {log.info("Dashboard part={} elapsedMs={}",name,(System.nanoTime()-partStart)/1_000_000);}
            },executor).orTimeout(timeout,TimeUnit.MILLISECONDS)));
        }catch(RejectedExecutionException ex){futures.values().forEach(f->f.cancel(true));throw new AppException(503,"DASHBOARD_BUSY");}
        Map<String,Object> response=new LinkedHashMap<>();response.put("date",date);
        List<String> failed=new ArrayList<>();
        futures.forEach((name,future)->{try {response.put(name,future.join());}catch(CompletionException|CancellationException ex){response.put(name,null);failed.add(name);log.warn("Dashboard failedPart={}",name);}});
        response.put("partial",!failed.isEmpty());response.put("failedParts",failed);response.put("elapsedMs",(System.nanoTime()-start)/1_000_000);
        log.info("Dashboard elapsedMs={} partial={}",response.get("elapsedMs"),response.get("partial"));return response;
    }
}
