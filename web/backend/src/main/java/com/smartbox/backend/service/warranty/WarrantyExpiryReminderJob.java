package com.smartbox.backend.service.warranty;

import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.service.admin.OutboxService;
import com.smartbox.backend.service.commerce.CustomerNotifier;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.date;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.uuid;

/** Reminds customers 30 days before a warranty ends and lists the renewal plans (notification, push and email). */
@Slf4j
@Component
@RequiredArgsConstructor
public class WarrantyExpiryReminderJob {

    private static final String TYPE = "WARRANTY_EXPIRING";
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String SQL = "SELECT w.id, w.end_date, o.user_id, p.email, p.full_name, COALESCE(d.name, oi.product_name_snapshot) AS device_name " +
            "FROM public.warranties w JOIN public.order_items oi ON oi.id=w.order_item_id JOIN public.orders o ON o.id=oi.order_id " +
            "JOIN public.profiles p ON p.id=o.user_id LEFT JOIN public.devices d ON d.id=w.device_id " +
            "WHERE CAST(w.status AS varchar)='active' AND w.end_date>=? AND w.end_date<=? ORDER BY w.end_date LIMIT 100";

    private final CommerceRepository db;
    private final OutboxService outbox;
    private final CustomerNotifier notifier;
    private final WarrantyPlanService plans;

    @Value("${smartbox.shop-url:}")
    private String shopUrl;

    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Ho_Chi_Minh")
    public void run() {
        try {
            remind(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")));
        } catch (Exception e) {
            log.error("WarrantyExpiryReminderJob failed: {}", e.getMessage(), e);
        }
    }

    /** Reminds customers whose warranty ends within 30 days of {@code today}; returns how many were notified. */
    public int remind(LocalDate today) {
        var rows = db.list(SQL, today, today.plusDays(30));
        if (rows.isEmpty()) return 0;
        List<Map<String, Object>> planList = planList();
        String contact = (shopUrl == null || shopUrl.isBlank() ? "https://anchorbox.vn" : shopUrl) + "/contact";
        int sent = 0;
        for (var row : rows) {
            try {
                if (send(row, today, planList, contact)) sent++;
            } catch (Exception e) {
                log.warn("Warranty reminder skipped for {}: {}", row.get("id"), e.getMessage());
            }
        }
        return sent;
    }

    private boolean send(Map<String, Object> row, LocalDate today, List<Map<String, Object>> planList, String contact) {
        UUID id = uuid(row.get("id"));
        LocalDate end = date(row.get("end_date"));
        long daysLeft = ChronoUnit.DAYS.between(today, end);
        String device = Objects.toString(row.get("device_name"), "thiết bị AnchorBox");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("customer_name", Objects.toString(row.get("full_name"), "Quý khách"));
        payload.put("device_name", device);
        payload.put("end_date", DAY.format(end));
        payload.put("days_left", daysLeft);
        payload.put("plans", planList);
        payload.put("contact_url", contact);
        if (!outbox.enqueueDirect(TYPE, id, "warranty-expiring:" + id + ":" + end, Objects.toString(row.get("email"), ""), payload)) {
            return false;
        }
        notifier.notify(uuid(row.get("user_id")), TYPE, "Bảo hành sắp hết hạn",
                "Bảo hành " + device + " hết hạn ngày " + DAY.format(end) + ", còn " + daysLeft + " ngày. Xem các gói gia hạn trong email hoặc liên hệ tư vấn.");
        return true;
    }

    private List<Map<String, Object>> planList() {
        NumberFormat money = NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN"));
        money.setMaximumFractionDigits(0);
        List<Map<String, Object>> out = new ArrayList<>();
        for (var plan : plans.active()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", plan.get("name"));
            item.put("extra_months", plan.get("extraMonths"));
            item.put("price_formatted", money.format(new BigDecimal(plan.get("price").toString())) + " ₫");
            out.add(item);
        }
        return out;
    }
}
