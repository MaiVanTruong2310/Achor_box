package com.smartbox.backend.service;

import com.smartbox.backend.exception.AppException;
import com.smartbox.backend.config.DashboardDemoConfig;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
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
    private final DashboardDemoConfig demoConfig;
    private final boolean demo;
    public ConcurrentDashboardService(CommerceRepository db, CurrentActor actors, Executor executor, long timeout) {
        this(db,actors,executor,timeout,new DashboardDemoConfig(),false);
    }
    @Autowired
    public ConcurrentDashboardService(CommerceRepository db,CurrentActor actors,@Qualifier("dashboardExecutor") Executor executor,@Value("${smartbox.dashboard.timeout-ms:1500}") long timeout,DashboardDemoConfig config,Environment env) {
        this(db,actors,executor,timeout,config,env.acceptsProfiles(Profiles.of("demo")));
    }
    public ConcurrentDashboardService(CommerceRepository db,CurrentActor actors,Executor executor,long timeout,DashboardDemoConfig config,boolean demo) {
        this.db=db;this.actors=actors;this.executor=executor;this.timeout=timeout;this.demoConfig=config;this.demo=demo;
        if(timeout<=0)throw new IllegalArgumentException("Dashboard timeout must be positive");
    }
    public Map<String,Object> dashboard(LocalDate date) {return dashboard(date,"parallel");}
    public Map<String,Object> dashboard(LocalDate date,String mode) {
        actors.get().requireRoles("super_admin","accountant");
        if(!List.of("parallel","sequential").contains(mode))throw new AppException(400,"INVALID_DASHBOARD_MODE");
        if("sequential".equals(mode)&&!demo)throw new AppException(400,"DASHBOARD_SEQUENTIAL_DEMO_ONLY");
        long start=System.nanoTime();
        OffsetDateTime from=date.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime();
        OffsetDateTime until=date.plusDays(1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime();
        Map<String,Supplier<Object>> parts=new LinkedHashMap<>();
        parts.put("revenueToday",()->db.one("SELECT COALESCE(sum(total),0) AS total FROM public.orders WHERE status IN('paid','confirmed','completed') AND paid_at>=? AND paid_at<?",from,until).get("total"));
        parts.put("orderCountByStatus",()->{
            Map<String,Object> counts=new LinkedHashMap<>();
            for(String status:List.of("pending","awaiting_payment","paid","confirmed","completed","cancelled"))counts.put(status.toUpperCase(Locale.ROOT),0L);
            for(var row:db.list("SELECT status,count(*) AS total FROM public.orders GROUP BY status")){String key=row.get("status").toString().toUpperCase(Locale.ROOT);if(counts.containsKey(key))counts.put(key,row.get("total"));}
            return counts;
        });
        parts.put("top5Variants",()->db.list("SELECT i.variant_id AS \"variantId\",i.product_id AS \"productId\",max(i.product_name_snapshot) AS name,max(i.variant_name_snapshot) AS \"variantName\",max(i.sku_snapshot) AS sku,sum(i.quantity) AS \"quantitySold\" FROM public.order_items i JOIN public.orders o ON o.id=i.order_id WHERE i.variant_id IS NOT NULL AND o.status IN('paid','confirmed','completed') AND o.paid_at>=? AND o.paid_at<? GROUP BY i.variant_id,i.product_id ORDER BY sum(i.quantity) DESC,i.variant_id LIMIT 5",from.minusDays(29),until));
        parts.put("lowStockVariants",()->db.list("SELECT v.id AS \"variantId\",v.product_id AS \"productId\",p.name,v.sku,v.stock_quantity AS stock FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE v.is_active=true AND p.is_active=true AND v.stock_quantity<=5 ORDER BY v.stock_quantity,v.id"));
        Map<String,CompletableFuture<Object>> futures=new LinkedHashMap<>();
        Map<String,Object> response=new LinkedHashMap<>();response.put("date",date);
        List<String> failed=new ArrayList<>();
        try {
            if("sequential".equals(mode)) {
                for(var part:parts.entrySet()) {
                    var future=submit(part.getKey(),part.getValue());
                    futures.put(part.getKey(),future);
                    collect(part.getKey(),future,response,failed);
                }
            } else {
                for(var part:parts.entrySet())futures.put(part.getKey(),submit(part.getKey(),part.getValue()));
                futures.forEach((name,future)->collect(name,future,response,failed));
            }
        }catch(RejectedExecutionException ex){futures.values().forEach(f->f.cancel(true));log.error("Dashboard busy elapsedMs={}",(System.nanoTime()-start)/1_000_000);throw new AppException(503,"DASHBOARD_BUSY");}
        response.put("partial",!failed.isEmpty());response.put("failedParts",failed);response.put("elapsedMs",(System.nanoTime()-start)/1_000_000);
        response.put("demo",demo);response.put("mode",mode);
        log.info("Dashboard elapsedMs={} partial={}",response.get("elapsedMs"),response.get("partial"));return response;
    }
    private CompletableFuture<Object> submit(String name,Supplier<Object> query) {
        var result=new CompletableFuture<Object>();
        var task=new FutureTask<Void>(()->{
            long start=System.nanoTime();
            try {if(demo)demoConfig.before(name);result.complete(query.get());}
            catch(Throwable ex){result.completeExceptionally(ex);}
            finally {log.info("Dashboard part={} elapsedMs={}",name,(System.nanoTime()-start)/1_000_000);}
            return null;
        });
        executor.execute(task);
        result.orTimeout(timeout,TimeUnit.MILLISECONDS).whenComplete((value,error)->{if(error!=null)task.cancel(true);});
        return result;
    }
    private void collect(String name,CompletableFuture<Object> future,Map<String,Object> response,List<String> failed) {
        try {response.put(name,future.join());}
        catch(CompletionException|CancellationException ex){response.put(name,null);failed.add(name);log.error("Dashboard failedPart={} reason={}",name,ex.getCause()==null?ex.getClass().getSimpleName():ex.getCause().getClass().getSimpleName());}
    }
}
