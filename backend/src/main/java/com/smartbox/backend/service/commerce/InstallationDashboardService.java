package com.smartbox.backend.service.commerce;

import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;

@Service
@RequiredArgsConstructor
@Slf4j
public class InstallationDashboardService {

    private final CommerceRepository db;
    private final CurrentActor actors;

    @Transactional(readOnly = true)
    public Map<String, Object> summary() {
        var actor = actors.get();
        actor.requireRoles("super_admin", "product_manager", "technician");
        boolean mine = "technician".equals(actor.role());
        String where = " FROM public.delivery_installations j JOIN public.orders o ON o.id=j.order_id WHERE o.status::text='confirmed'"
                + (mine ? " AND j.assigned_to=?" : "");
        Object[] args = mine ? new Object[]{actor.id()} : new Object[]{};
        var counts = new LinkedHashMap<String, Object>();

        // Optimized: Consolidate 6 separate count queries into 1 conditional aggregation query
        String aggSql = "SELECT " +
                "COUNT(*) FILTER (WHERE j.status='ASSIGNED') AS \"ASSIGNED\", " +
                "COUNT(*) FILTER (WHERE j.status='IN_PROGRESS') AS \"IN_PROGRESS\", " +
                "COUNT(*) FILTER (WHERE j.status='DELIVERED') AS \"DELIVERED\", " +
                "COUNT(*) FILTER (WHERE j.status='INSTALLED') AS \"INSTALLED\", " +
                "COUNT(*) FILTER (WHERE j.status='FAILED') AS \"FAILED\", " +
                "COUNT(*) FILTER (WHERE j.status IN('ASSIGNED','IN_PROGRESS','DELIVERED','INSTALLED','FAILED') AND j.scheduled_at < now()) AS \"overdue\" " +
                where;

        List<Map<String, Object>> aggRows = db.list(aggSql, args);
        Map<String, Object> agg = aggRows.isEmpty() ? Map.of() : aggRows.getFirst();

        for (String status : List.of("ASSIGNED", "IN_PROGRESS", "DELIVERED", "INSTALLED", "FAILED", "overdue")) {
            Object val = agg.get(status);
            if (val == null) {
                val = agg.get(status.toLowerCase());
            }
            counts.put(status, val instanceof Number n ? n.longValue() : 0L);
        }

        if (mine) {
            counts.put("unassigned", 0L);
            counts.put("pendingApproval", 0L);
        } else {
            // Consolidate unassigned and pendingApproval into 1 single query
            List<Map<String, Object>> extraRows = db.list("SELECT " +
                    "(SELECT count(*) FROM public.orders o JOIN public.approval_tickets t ON t.order_id=o.id WHERE o.workflow_version=2 AND o.status::text='confirmed' AND t.status='APPROVED' AND NOT EXISTS(SELECT 1 FROM public.delivery_installations j WHERE j.order_id=o.id)) AS \"unassigned\", " +
                    "(SELECT count(*) FROM public.approval_tickets t JOIN public.orders o ON o.id=t.order_id WHERE o.workflow_version=2 AND o.status::text IN ('pending', 'paid', 'customer_decision_pending') AND t.status='PENDING') AS \"pendingApproval\"");
            Map<String, Object> extra = extraRows.isEmpty() ? Map.of() : extraRows.getFirst();
            Object unassignedVal = extra.get("unassigned");
            Object pendingVal = extra.get("pendingApproval");
            counts.put("unassigned", unassignedVal instanceof Number n ? n.longValue() : 0L);
            counts.put("pendingApproval", pendingVal instanceof Number n ? n.longValue() : 0L);
        }

        long total = List.of("ASSIGNED", "IN_PROGRESS", "DELIVERED", "INSTALLED", "FAILED", "unassigned", "pendingApproval").stream()
                .mapToLong(k -> counts.get(k) instanceof Number n ? n.longValue() : 0L)
                .sum();
        counts.put("totalOutstanding", total);

        var attention = db.list("SELECT j.id, j.order_id AS \"orderId\", j.status, j.scheduled_at AS \"scheduledAt\"" + where + " AND j.status IN('ASSIGNED','IN_PROGRESS','DELIVERED','INSTALLED','FAILED') ORDER BY j.scheduled_at, j.id LIMIT 10", args);
        return Map.of("scope", mine ? "MY_JOBS" : "ALL_JOBS", "counts", counts, "attention", attention, "observedAt", now().toString());
    }
}
