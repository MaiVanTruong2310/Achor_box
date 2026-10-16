package com.smartbox.backend.service.commerce;

import com.smartbox.backend.exception.ForbiddenException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.time;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.uuid;

@Service
@RequiredArgsConstructor
public class OrderTrackingService {

    private final CommerceRepository db;
    private final CurrentActor actors;

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Map<String, Object> timeline(UUID id) {
        var actor = actors.get();
        var order = db.order(id, false);
        boolean privateNotes = false;
        switch (actor.role()) {
            case "customer" -> actor.requireOwner(uuid(order.get("user_id")));
            case "technician" -> {
                if (db.list("SELECT id FROM public.delivery_installations WHERE order_id=? AND assigned_to=?", id, actor.id()).isEmpty()) {
                    throw new ForbiddenException("JOB_NOT_ASSIGNED");
                }
            }
            case "super_admin", "product_manager" -> privateNotes = true;
            default -> throw new ForbiddenException("TRACKING_NOT_ALLOWED");
        }
        List<Map<String, Object>> events = new ArrayList<>();
        for (var row : db.list("SELECT id, to_status AS status, reason, created_at FROM public.order_status_history WHERE order_id=?", id)) {
            Object st = row.get("status");
            events.add(event("ORDER", row, st != null ? st.toString() : "UNKNOWN", privateNotes));
        }
        for (var row : db.list("SELECT h.id, h.action AS status, h.reason, h.created_at FROM public.ticket_history h JOIN public.approval_tickets t ON t.id=h.ticket_id WHERE t.order_id=?", id)) {
            Object st = row.get("status");
            events.add(event("PO_TICKET", row, st != null ? st.toString() : "UNKNOWN", privateNotes));
        }
        for (var row : db.list("SELECT h.id, h.action AS status, h.reason, h.attempt, h.version, h.created_at FROM public.delivery_installation_history h JOIN public.delivery_installations j ON j.id=h.job_id WHERE j.order_id=?", id)) {
            Object st = row.get("status");
            String action = st != null ? st.toString() : "UNKNOWN";
            if (!privateNotes && action.startsWith("CHECK_")) {
                continue;
            }
            events.add(event("DELIVERY_INSTALLATION", row, action, privateNotes));
        }
        events.sort(Comparator.comparing((Map<String, Object> e) -> {
            var t = time(e.get("occurredAt"));
            return t != null ? t : now();
        }).thenComparing(e -> Objects.toString(e.get("source"), "")).thenComparing(e -> Objects.toString(e.get("id"), "")));

        var res = new LinkedHashMap<String, Object>();
        res.put("orderId", id.toString());
        res.put("orderStatus", Objects.toString(order.get("status"), "pending"));
        res.put("events", events);
        return res;
    }

    private Map<String, Object> event(String source, Map<String, Object> row, String action, boolean notes) {
        var e = new LinkedHashMap<String, Object>();
        e.put("id", source + ":" + row.get("id"));
        e.put("source", source);
        e.put("action", action);
        var t = time(row.get("created_at"));
        e.put("occurredAt", (t != null ? t : now()).toString());
        if (row.containsKey("attempt")) {
            e.put("attempt", row.get("attempt"));
            e.put("version", row.get("version"));
        }
        if (notes && row.get("reason") != null) {
            e.put("reason", row.get("reason"));
        }
        return e;
    }
}
