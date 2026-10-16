package com.smartbox.backend.service.admin;

import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.time;

@Service
@RequiredArgsConstructor
public class AdminNotificationsService {

    private final CommerceRepository db;
    private final CurrentActor actors;

    @Transactional(readOnly = true)
    public Map<String, Object> feed() {
        var actor = actors.get();
        actor.requireRoles("super_admin", "product_manager", "technician");
        List<Map<String, Object>> events = new ArrayList<>();
        String role = actor.role();

        if (Set.of("super_admin", "product_manager").contains(role)) {
            // Consolidated into a single UNION ALL query to eliminate 5 sequential DB network round trips
            String sql = "(SELECT 'ORDER' AS type, 'Đơn hàng mới' AS title, '/orders' AS link, id::text AS id, status::text AS status, created_at AS occurred_at FROM public.orders ORDER BY created_at DESC, id DESC LIMIT 15) " +
                    "UNION ALL " +
                    "(SELECT 'PO' AS type, 'PO Ticket cập nhật' AS title, '/orders/approvals' AS link, id::text AS id, status::text AS status, updated_at AS occurred_at FROM public.approval_tickets ORDER BY updated_at DESC, id DESC LIMIT 15) " +
                    "UNION ALL " +
                    "(SELECT 'DELIVERY' AS type, 'Công việc giao / lắp đặt' AS title, '/orders/delivery' AS link, id::text AS id, status::text AS status, updated_at AS occurred_at FROM public.delivery_installations ORDER BY updated_at DESC, id DESC LIMIT 15) " +
                    "UNION ALL " +
                    "(SELECT 'WARRANTY' AS type, 'Yêu cầu bảo hành' AS title, '/warranties' AS link, id::text AS id, status::text AS status, created_at AS occurred_at FROM public.warranty_claims ORDER BY created_at DESC, id DESC LIMIT 15) " +
                    "UNION ALL " +
                    "(SELECT 'EMAIL' AS type, 'Email gửi thất bại' AS title, '/emails' AS link, id::text AS id, status::text AS status, created_at AS occurred_at FROM public.email_outbox WHERE status='FAILED' ORDER BY created_at DESC, id DESC LIMIT 10)";
            List<Map<String, Object>> rows = db.list(sql);
            for (var row : rows) {
                addEvent(events, row);
            }
        } else if ("technician".equals(role)) {
            String sql = "(SELECT 'DELIVERY' AS type, 'Công việc giao / lắp đặt' AS title, '/orders/delivery' AS link, id::text AS id, status::text AS status, updated_at AS occurred_at FROM public.delivery_installations WHERE assigned_to=? ORDER BY updated_at DESC, id DESC LIMIT 15) " +
                    "UNION ALL " +
                    "(SELECT 'WARRANTY' AS type, 'Yêu cầu bảo hành' AS title, '/warranties' AS link, id::text AS id, status::text AS status, created_at AS occurred_at FROM public.warranty_claims WHERE assigned_to=? ORDER BY created_at DESC, id DESC LIMIT 15)";
            List<Map<String, Object>> rows = db.list(sql, actor.id(), actor.id());
            for (var row : rows) {
                addEvent(events, row);
            }
        }

        events.sort(Comparator.comparing((Map<String, Object> e) -> {
            var t = time(e.get("occurredAt"));
            return t != null ? t : now();
        }).reversed().thenComparing(e -> e.get("id").toString()));

        return Map.of("events", events.stream().limit(50).toList(), "observedAt", now().toString());
    }

    private void addEvent(List<Map<String, Object>> events, Map<String, Object> row) {
        Object idObj = row.get("id");
        if (idObj == null) return;
        var t = time(row.get("occurred_at"));
        String occurred = t != null ? t.toString() : now().toString();
        String status = row.get("status") != null ? row.get("status").toString() : "UNKNOWN";
        String type = row.get("type") != null ? row.get("type").toString() : "ORDER";
        String title = row.get("title") != null ? row.get("title").toString() : "";
        String link = row.get("link") != null ? row.get("link").toString() : "";

        events.add(Map.of(
                "id", type + ":" + idObj + ":" + occurred,
                "type", type,
                "title", title,
                "referenceId", idObj.toString(),
                "status", status,
                "occurredAt", occurred,
                "link", link
        ));
    }
}
