package com.smartbox.backend.service.warranty;

import com.smartbox.backend.entity.ProductVariant;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.uuid;

@Service
@RequiredArgsConstructor
public class AcceptanceWarrantyService {

    private final CommerceRepository db;
    private final CurrentActor actors;

    @Value("${smartbox.warranty.default-months:12}")
    private int defaultMonths;

    public int months(Map<String, Object> variant) {
        int result = defaultMonths;
        if (variant.get("warranty_months") instanceof Number n) {
            result = n.intValue();
        } else {
            var policies = db.list("SELECT w.duration_months FROM public.warranty_policies w JOIN public.products p ON p.category_id=w.category_id WHERE p.id=?", variant.get("product_id"));
            if (policies.size() > 1) {
                throw new ConflictException("WARRANTY_POLICY_AMBIGUOUS");
            }
            if (!policies.isEmpty()) {
                result = ((Number) policies.getFirst().get("duration_months")).intValue();
            }
        }
        if (result < 1 || result > 120) {
            throw new ConflictException("WARRANTY_DURATION_NOT_CONFIGURED");
        }
        return result;
    }

    public int variantMonths(ProductVariant variant) {
        if (variant.getWarrantyMonths() != null && variant.getWarrantyMonths() >= 1 && variant.getWarrantyMonths() <= 120) {
            return variant.getWarrantyMonths();
        }
        return defaultMonths;
    }

    /** Called only by acceptance in the same transaction as job/order completion and outbox. */
    public void issue(UUID job, OffsetDateTime accepted) {
        var record = db.one("SELECT status,customer_accepted,order_id FROM public.delivery_installations WHERE id=?", job);
        if (!"COMPLETED".equals(record.get("status")) || !Boolean.TRUE.equals(record.get("customer_accepted"))) {
            throw new ConflictException("INSTALLATION_ACCEPTANCE_REQUIRED");
        }
        LocalDate start = accepted.atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
        for (var device : db.list("SELECT b.device_id,b.order_item_id,i.warranty_months_snapshot,i.variant_id FROM public.delivery_installation_devices b JOIN public.order_items i ON i.id=b.order_item_id WHERE b.job_id=? ORDER BY b.device_id", job)) {
            int duration = device.get("warranty_months_snapshot") instanceof Number n
                    ? n.intValue()
                    : months(db.one("SELECT * FROM public.product_variants WHERE id=?", device.get("variant_id")));
            var existing = db.list("SELECT order_item_id,acceptance_job_id FROM public.warranties WHERE device_id=? FOR UPDATE", device.get("device_id"));
            if (!existing.isEmpty()) {
                if (!Objects.equals(uuid(existing.getFirst().get("order_item_id")), uuid(device.get("order_item_id")))
                        || !Objects.equals(uuid(existing.getFirst().get("acceptance_job_id")), job)) {
                    throw new ConflictException("EXISTING_WARRANTY_REVIEW_REQUIRED");
                }
                continue;
            }
            db.update("UPDATE public.order_items SET warranty_months_snapshot=COALESCE(warranty_months_snapshot,?) WHERE id=?", duration, device.get("order_item_id"));
            db.update("INSERT INTO public.warranties(id,order_item_id,device_id,start_date,end_date,status,acceptance_job_id,accepted_at,duration_months) VALUES(?,?,?,?,?,CAST('active' AS public.warranty_status),?,?,?)",
                    UUID.randomUUID(), device.get("order_item_id"), device.get("device_id"), start, start.plusMonths(duration).minusDays(1), job, accepted, duration);
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> mine(int page, int size) {
        actors.get().requireRoles("customer");
        if (page < 0 || size < 1 || size > 100) {
            throw new BadRequestException("VALIDATION_ERROR");
        }
        UUID owner = actors.get().id();
        String from = " FROM public.warranties w JOIN public.devices d ON d.id=w.device_id LEFT JOIN public.order_items i ON i.id=w.order_item_id WHERE d.owner_id=?";
        long total = ((Number) db.one("SELECT count(*) AS n" + from, owner).get("n")).longValue();
        var rows = db.list("SELECT w.id,w.device_id AS \"deviceId\",d.serial_number AS \"serialNumber\",i.order_id AS \"orderId\",w.start_date AS \"startDate\",w.end_date AS \"endDate\",w.status,w.duration_months AS \"durationMonths\",w.accepted_at AS \"acceptedAt\"" + from + " ORDER BY w.start_date DESC,w.id LIMIT ? OFFSET ?", owner, size, (long) page * size);
        var today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        for (var row : rows) {
            LocalDate end = row.get("endDate") instanceof Date d ? d.toLocalDate() : LocalDate.parse(row.get("endDate").toString());
            if ("active".equals(row.get("status")) && end.isBefore(today)) {
                row.put("status", "expired");
            }
        }
        return Map.of("content", rows, "page", page, "size", size, "totalElements", total, "totalPages", (total + size - 1) / size);
    }
}
