package com.smartbox.backend.service.admin;

import com.smartbox.backend.config.DashboardDemoConfig;
import com.smartbox.backend.exception.AppException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CancellationException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.concurrent.FutureTask;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
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
        this(db, actors, executor, timeout, new DashboardDemoConfig(), false);
    }

    @Autowired
    public ConcurrentDashboardService(CommerceRepository db, CurrentActor actors, @Qualifier("dashboardExecutor") Executor executor, @Value("${smartbox.dashboard.timeout-ms:1500}") long timeout, DashboardDemoConfig config, Environment env) {
        this(db, actors, executor, timeout, config, env.acceptsProfiles(Profiles.of("demo")));
    }

    public ConcurrentDashboardService(CommerceRepository db, CurrentActor actors, Executor executor, long timeout, DashboardDemoConfig config, boolean demo) {
        this.db = db;
        this.actors = actors;
        this.executor = executor;
        this.timeout = timeout;
        this.demoConfig = config;
        this.demo = demo;
        if (timeout <= 0) {
            throw new IllegalArgumentException("Dashboard timeout must be positive");
        }
    }

    @Autowired(required = false)
    private org.springframework.data.redis.core.StringRedisTemplate redis;

    @Autowired(required = false)
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    private static final String ORDER_COUNTS_CACHE_KEY = "dashboard:pipeline:order_counts";
    private static final long DASHBOARD_CACHE_TTL_SECONDS = 60;

    private com.fasterxml.jackson.databind.ObjectMapper getMapper() {
        if (objectMapper == null) {
            objectMapper = new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules();
        }
        return objectMapper;
    }

    private record CacheEntry(OffsetDateTime expiresAt, Map<String, Object> data) {}
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public Map<String, Object> dashboard(LocalDate date) {
        return dashboard(date, "parallel");
    }

    public Map<String, Object> dashboard(LocalDate date, String mode) {
        actors.get().requireRoles("super_admin", "product_manager");
        if (!List.of("parallel", "sequential").contains(mode)) {
            throw new AppException(400, "INVALID_DASHBOARD_MODE");
        }
        if ("sequential".equals(mode) && !demo) {
            throw new AppException(400, "DASHBOARD_SEQUENTIAL_DEMO_ONLY");
        }
        long start = System.nanoTime();

        // Distributed Redis + L1 micro-cache (60 seconds) for parallel production dashboard
        if ("parallel".equals(mode) && !demo) {
            String cacheKey = date.toString();
            CacheEntry cached = cache.get(cacheKey);
            if (cached != null && cached.expiresAt().isAfter(OffsetDateTime.now())) {
                var cachedResponse = new LinkedHashMap<>(cached.data());
                cachedResponse.put("elapsedMs", (System.nanoTime() - start) / 1_000_000);
                cachedResponse.put("fromCache", true);
                log.info("Dashboard served from L1 cache date={} elapsedMs={}", date, cachedResponse.get("elapsedMs"));
                return cachedResponse;
            }

            if (redis != null) {
                try {
                    String redisKey = "dashboard:stats:" + cacheKey;
                    String json = redis.opsForValue().get(redisKey);
                    if (json != null && !json.isBlank()) {
                        Map<String, Object> redisData = getMapper().readValue(json, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
                        cache.put(cacheKey, new CacheEntry(OffsetDateTime.now().plusSeconds(DASHBOARD_CACHE_TTL_SECONDS), redisData));
                        var cachedResponse = new LinkedHashMap<>(redisData);
                        cachedResponse.put("elapsedMs", (System.nanoTime() - start) / 1_000_000);
                        cachedResponse.put("fromCache", true);
                        log.info("Dashboard served from Redis cache date={} elapsedMs={}", date, cachedResponse.get("elapsedMs"));
                        return cachedResponse;
                    }
                } catch (Exception ex) {
                    log.warn("Redis read error for dashboard stats: {}", ex.getMessage());
                }
            }
        }

        OffsetDateTime from = date.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime();
        OffsetDateTime until = date.plusDays(1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime();
        Map<String, Supplier<Object>> parts = new LinkedHashMap<>();
        parts.put("revenueToday", () -> db.one("SELECT COALESCE(sum(total),0) AS total FROM public.orders WHERE CAST(status AS text) IN('paid','confirmed','completed') AND paid_at>=? AND paid_at<?", from, until).get("total"));
        parts.put("orderCountByStatus", () -> {
            // Check Redis pipeline cache to avoid scanning the entire orders table repeatedly
            if (redis != null) {
                try {
                    String cachedJson = redis.opsForValue().get(ORDER_COUNTS_CACHE_KEY);
                    if (cachedJson != null && !cachedJson.isBlank()) {
                        return getMapper().readValue(cachedJson, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
                    }
                } catch (Exception ex) {
                    log.warn("Redis read error for {}: {}", ORDER_COUNTS_CACHE_KEY, ex.getMessage());
                }
            }

            Map<String, Object> counts = new LinkedHashMap<>();
            for (String status : List.of("pending", "awaiting_payment", "paid", "confirmed", "completed", "cancelled")) {
                counts.put(status.toUpperCase(Locale.ROOT), 0L);
            }
            for (var row : db.list("SELECT status,count(*) AS total FROM public.orders GROUP BY status")) {
                String key = row.get("status").toString().toUpperCase(Locale.ROOT);
                if (counts.containsKey(key)) {
                    counts.put(key, row.get("total"));
                }
            }

            if (redis != null) {
                try {
                    redis.opsForValue().set(ORDER_COUNTS_CACHE_KEY, getMapper().writeValueAsString(counts), DASHBOARD_CACHE_TTL_SECONDS, TimeUnit.SECONDS);
                } catch (Exception ex) {
                    log.warn("Redis write error for {}: {}", ORDER_COUNTS_CACHE_KEY, ex.getMessage());
                }
            }
            return counts;
        });
        parts.put("top5Variants", () -> db.list("SELECT i.variant_id AS \"variantId\",i.product_id AS \"productId\",max(i.product_name_snapshot) AS name,max(i.variant_name_snapshot) AS \"variantName\",max(i.sku_snapshot) AS sku,sum(i.quantity) AS \"quantitySold\" FROM public.order_items i JOIN public.orders o ON o.id=i.order_id WHERE i.variant_id IS NOT NULL AND CAST(o.status AS text) IN('paid','confirmed','completed') AND o.paid_at>=? AND o.paid_at<? GROUP BY i.variant_id,i.product_id ORDER BY sum(i.quantity) DESC,i.variant_id LIMIT 5", from.minusDays(29), until));
        parts.put("revenueTrend", () -> db.list("SELECT CAST(o.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh' AS date) AS \"date\", COALESCE(sum(o.total),0) AS \"revenue\", count(o.id) AS \"orders\" FROM public.orders o WHERE CAST(o.status AS text) IN('paid','confirmed','completed') AND o.paid_at>=? AND o.paid_at<? GROUP BY CAST(o.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh' AS date) ORDER BY \"date\" ASC", from.minusDays(6), until));
        parts.put("revenueTrendWeek", () -> db.list("SELECT to_char(date_trunc('week', o.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-\"W\"IW') AS \"date\", COALESCE(sum(o.total),0) AS \"revenue\", count(o.id) AS \"orders\" FROM public.orders o WHERE CAST(o.status AS text) IN('paid','confirmed','completed') AND o.paid_at>=? AND o.paid_at<? GROUP BY date_trunc('week', o.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), to_char(date_trunc('week', o.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-\"W\"IW') ORDER BY date_trunc('week', o.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh') ASC", from.minusWeeks(4), until));
        parts.put("revenueTrendMonth", () -> db.list("SELECT to_char(date_trunc('month', o.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'MM/YYYY') AS \"date\", COALESCE(sum(o.total),0) AS \"revenue\", count(o.id) AS \"orders\" FROM public.orders o WHERE CAST(o.status AS text) IN('paid','confirmed','completed') AND o.paid_at>=? AND o.paid_at<? GROUP BY date_trunc('month', o.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), to_char(date_trunc('month', o.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'MM/YYYY') ORDER BY date_trunc('month', o.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh') ASC", from.minusMonths(6), until));
        Map<String, CompletableFuture<Object>> futures = new LinkedHashMap<>();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("date", date);
        List<String> failed = new ArrayList<>();
        try {
            if ("sequential".equals(mode)) {
                for (var part : parts.entrySet()) {
                    var future = submit(part.getKey(), part.getValue());
                    futures.put(part.getKey(), future);
                    collect(part.getKey(), future, response, failed);
                }
            } else {
                for (var part : parts.entrySet()) {
                    futures.put(part.getKey(), submit(part.getKey(), part.getValue()));
                }
                futures.forEach((name, future) -> collect(name, future, response, failed));
            }
        } catch (RejectedExecutionException ex) {
            futures.values().forEach(f -> f.cancel(true));
            log.error("Dashboard busy elapsedMs={}", (System.nanoTime() - start) / 1_000_000);
            throw new AppException(503, "DASHBOARD_BUSY");
        }
        response.put("partial", !failed.isEmpty());
        response.put("failedParts", failed);
        response.put("elapsedMs", (System.nanoTime() - start) / 1_000_000);
        response.put("demo", demo);
        response.put("mode", mode);

        if ("parallel".equals(mode) && !demo && failed.isEmpty()) {
            cache.put(date.toString(), new CacheEntry(OffsetDateTime.now().plusSeconds(DASHBOARD_CACHE_TTL_SECONDS), new LinkedHashMap<>(response)));
            if (redis != null) {
                try {
                    String redisKey = "dashboard:stats:" + date;
                    redis.opsForValue().set(redisKey, getMapper().writeValueAsString(response), DASHBOARD_CACHE_TTL_SECONDS, TimeUnit.SECONDS);
                } catch (Exception ex) {
                    log.warn("Redis write error for dashboard stats: {}", ex.getMessage());
                }
            }
        }

        log.info("Dashboard elapsedMs={} partial={}", response.get("elapsedMs"), response.get("partial"));
        return response;
    }

    private CompletableFuture<Object> submit(String name, Supplier<Object> query) {
        var result = new CompletableFuture<Object>();
        var task = new FutureTask<Void>(() -> {
            long start = System.nanoTime();
            try {
                if (demo) {
                    demoConfig.before(name);
                }
                result.complete(query.get());
            } catch (Throwable ex) {
                result.completeExceptionally(ex);
            } finally {
                log.info("Dashboard part={} elapsedMs={}", name, (System.nanoTime() - start) / 1_000_000);
            }
            return null;
        });
        executor.execute(task);
        result.orTimeout(timeout, TimeUnit.MILLISECONDS).whenComplete((value, error) -> {
            if (error != null) {
                task.cancel(true);
            }
        });
        return result;
    }

    private void collect(String name, CompletableFuture<Object> future, Map<String, Object> response, List<String> failed) {
        try {
            response.put(name, future.join());
        } catch (CompletionException | CancellationException ex) {
            response.put(name, null);
            failed.add(name);
            log.error("Dashboard failedPart={} reason={}", name, ex.getCause() == null ? ex.getClass().getSimpleName() : ex.getCause().getClass().getSimpleName());
        }
    }
}
