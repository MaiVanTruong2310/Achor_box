package com.smartbox.backend.service.commerce;

import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.service.admin.OutboxService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.time;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.uuid;

/** Tells customers, about an hour ahead, that their technician is about to arrive (notification, push and email). */
@Slf4j
@Component
@RequiredArgsConstructor
public class CustomerArrivalReminderJob {

    private static final String TYPE = "TECHNICIAN_ARRIVING";
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));
    private static final String JOBS = "SELECT j.id, j.order_id AS ref, j.scheduled_at, o.user_id, p.email, p.full_name, t.full_name AS tech_name, t.phone AS tech_phone " +
            "FROM public.delivery_installations j JOIN public.orders o ON o.id=j.order_id JOIN public.profiles p ON p.id=o.user_id JOIN public.profiles t ON t.id=j.assigned_to " +
            "WHERE j.status IN ('ASSIGNED','IN_PROGRESS') AND j.scheduled_at>=? AND j.scheduled_at<=? ORDER BY j.scheduled_at LIMIT 50";
    private static final String CLAIMS = "SELECT c.id, c.id AS ref, c.scheduled_at, c.customer_id AS user_id, p.email, p.full_name, t.full_name AS tech_name, t.phone AS tech_phone " +
            "FROM public.warranty_claims c JOIN public.profiles p ON p.id=c.customer_id JOIN public.profiles t ON t.id=c.assigned_to " +
            "WHERE CAST(c.status AS varchar) NOT IN ('resolved','rejected') AND c.scheduled_at IS NOT NULL AND c.scheduled_at>=? AND c.scheduled_at<=? ORDER BY c.scheduled_at LIMIT 50";

    private final CommerceRepository db;
    private final OutboxService outbox;
    private final CustomerNotifier notifier;

    @Scheduled(fixedDelay = 60000)
    public void run() {
        try {
            remind(now());
        } catch (Exception e) {
            log.error("CustomerArrivalReminderJob failed: {}", e.getMessage(), e);
        }
    }

    /** Sends the reminders due at {@code now}; returns how many customers were notified. */
    public int remind(OffsetDateTime now) {
        int sent = 0;
        for (String sql : List.of(JOBS, CLAIMS)) {
            for (var row : db.list(sql, now.minusMinutes(15), now.plusMinutes(60))) {
                try {
                    if (send(row)) sent++;
                } catch (Exception e) {
                    log.warn("Arrival reminder skipped for {}: {}", row.get("id"), e.getMessage());
                }
            }
        }
        return sent;
    }

    private boolean send(Map<String, Object> row) {
        UUID id = uuid(row.get("id"));
        OffsetDateTime scheduled = time(row.get("scheduled_at"));
        String when = TIME_FMT.format(scheduled);
        String code = Objects.toString(row.get("ref"), id.toString()).substring(0, 8).toUpperCase();
        String tech = Objects.toString(row.get("tech_name"), "AnchorBox");
        String phone = Objects.toString(row.get("tech_phone"), "1900 8888");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("customer_name", Objects.toString(row.get("full_name"), "Quý khách"));
        payload.put("technician_name", tech);
        payload.put("technician_phone", phone);
        payload.put("scheduled_time", when);
        payload.put("order_code", code);
        if (!outbox.enqueueDirect(TYPE, id, "arriving:" + id + ":" + scheduled.toEpochSecond(), Objects.toString(row.get("email"), ""), payload)) {
            return false;
        }
        notifier.notify(uuid(row.get("user_id")), TYPE, "Kỹ thuật viên sắp tới",
                "Kỹ thuật viên " + tech + " (" + phone + ") dự kiến tới lúc " + when + " cho đơn #" + code + ".");
        return true;
    }
}
