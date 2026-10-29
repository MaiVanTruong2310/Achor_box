package com.smartbox.backend.service.commerce;

import com.smartbox.backend.repository.CommerceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.time;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.uuid;

@Slf4j
@Component
@RequiredArgsConstructor
public class TechnicianReminderJob {

    private final CommerceRepository db;
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm dd/MM");

    /**
     * Quét các ca giao lắp và bảo hành sắp diễn ra trong vòng 60 phút tới
     * để tự động gửi thông báo nhắc nhở cho Kỹ thuật viên phụ trách.
     */
    @Scheduled(fixedDelay = 60000)
    public void scanAndRemindTechnicians() {
        try {
            // 1. Quét ca giao hàng & lắp đặt
            String sqlJobs = "SELECT j.id, j.order_id, j.assigned_to, j.scheduled_at, o.shipping_address " +
                    "FROM public.delivery_installations j " +
                    "JOIN public.orders o ON j.order_id = o.id " +
                    "WHERE j.status IN ('ASSIGNED', 'IN_PROGRESS') " +
                    "  AND j.scheduled_at >= NOW() - INTERVAL '15 minutes' " +
                    "  AND j.scheduled_at <= NOW() + INTERVAL '60 minutes' " +
                    "  AND NOT EXISTS ( " +
                    "      SELECT 1 FROM public.notifications n " +
                    "      WHERE n.user_id = j.assigned_to " +
                    "        AND n.type = 'TASK_UPCOMING' " +
                    "        AND n.body LIKE '%' || j.id::text || '%' " +
                    "        AND n.created_at >= NOW() - INTERVAL '3 hours' " +
                    "  ) " +
                    "LIMIT 20";

            List<Map<String, Object>> dueJobs = db.list(sqlJobs);
            for (var row : dueJobs) {
                UUID jobId = uuid(row.get("id"));
                UUID techId = uuid(row.get("assigned_to"));
                UUID orderId = uuid(row.get("order_id"));
                OffsetDateTime sched = time(row.get("scheduled_at"));
                String timeStr = sched != null ? sched.format(TIME_FMT) : "hôm nay";
                String orderCode = orderId.toString().substring(0, 8).toUpperCase();

                UUID notifId = UUID.randomUUID();
                db.update("INSERT INTO public.notifications(id, user_id, type, title, body, is_read, created_at) " +
                                "VALUES(?, ?, 'TASK_UPCOMING', ?, ?, false, ?)",
                        notifId,
                        techId,
                        "Sắp đến giờ hẹn ca thi công!",
                        "Ca giao lắp đơn #" + orderCode + " sẽ diễn ra lúc " + timeStr + ". Vui lòng chuẩn bị di chuyển! [job:" + jobId + "]",
                        now());

                db.update("INSERT INTO public.push_outbox(id, notification_id, status, attempts, next_attempt_at) " +
                                "VALUES(?, ?, 'PENDING', 0, ?)",
                        UUID.randomUUID(), notifId, now());

                log.info("🔔 Sent upcoming task reminder to technician {} for job #{}", techId, orderCode);
            }

            // 2. Quét ca bảo hành
            String sqlWarranties = "SELECT c.id, c.assigned_to, c.scheduled_at " +
                    "FROM public.warranty_claims c " +
                    "WHERE c.status::text NOT IN ('resolved', 'rejected') " +
                    "  AND c.scheduled_at IS NOT NULL " +
                    "  AND c.scheduled_at >= NOW() - INTERVAL '15 minutes' " +
                    "  AND c.scheduled_at <= NOW() + INTERVAL '60 minutes' " +
                    "  AND NOT EXISTS ( " +
                    "      SELECT 1 FROM public.notifications n " +
                    "      WHERE n.user_id = c.assigned_to " +
                    "        AND n.type = 'TASK_UPCOMING' " +
                    "        AND n.body LIKE '%' || c.id::text || '%' " +
                    "        AND n.created_at >= NOW() - INTERVAL '3 hours' " +
                    "  ) " +
                    "LIMIT 20";

            List<Map<String, Object>> dueClaims = db.list(sqlWarranties);
            for (var row : dueClaims) {
                UUID claimId = uuid(row.get("id"));
                UUID techId = uuid(row.get("assigned_to"));
                String claimCode = claimId.toString().substring(0, 8).toUpperCase();
                OffsetDateTime sched = time(row.get("scheduled_at"));
                String timeStr = sched != null ? sched.format(TIME_FMT) : "hôm nay";

                UUID notifId = UUID.randomUUID();
                db.update("INSERT INTO public.notifications(id, user_id, type, title, body, is_read, created_at) " +
                                "VALUES(?, ?, 'TASK_UPCOMING', ?, ?, false, ?)",
                        notifId,
                        techId,
                        "Sắp đến giờ hẹn xử lý bảo hành!",
                        "Phiếu bảo hành " + claimCode + " sẽ diễn ra lúc " + timeStr + ". Vui lòng kiểm tra linh kiện và lịch trình! [claim:" + claimId + "]",
                        now());

                db.update("INSERT INTO public.push_outbox(id, notification_id, status, attempts, next_attempt_at) " +
                                "VALUES(?, ?, 'PENDING', 0, ?)",
                        UUID.randomUUID(), notifId, now());

                log.info("🔔 Sent upcoming warranty reminder to technician {} for claim {}", techId, claimCode);
            }

        } catch (Exception e) {
            log.error("Error running TechnicianReminderJob: {}", e.getMessage(), e);
        }
    }
}
