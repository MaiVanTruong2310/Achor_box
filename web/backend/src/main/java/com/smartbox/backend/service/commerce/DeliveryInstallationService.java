package com.smartbox.backend.service.commerce;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Acceptance;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Assignment;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Command;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.CompletionSubmission;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Failure;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Installation;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Note;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.PoApprovalRequest;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Reassignment;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.RejectionRequest;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Serial;
import com.smartbox.backend.exception.AppException;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.exception.ForbiddenException;
import com.smartbox.backend.exception.ResourceNotFoundException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.service.admin.OutboxService;
import com.smartbox.backend.service.auth.CustomerAccountService;
import com.smartbox.backend.service.device.DeviceWorkflowService;
import com.smartbox.backend.service.warranty.AcceptanceWarrantyService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.time;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.uuid;

/** One employee delivers and installs. All progress is assignment-scoped; completion is evidence-gated. */
@Service
@RequiredArgsConstructor
public class DeliveryInstallationService {
    private static final Set<String> STATUSES=Set.of("ASSIGNED","IN_PROGRESS","DELIVERED","INSTALLED","WAITING_PO_CONFIRMATION","COMPLETED","FAILED");
    private final CommerceRepository db;
    private final CurrentActor actors;
    private final OrderWorkflowService orders;
    private final OutboxService outbox;
    private final CustomerAccountService customers;
    private final AcceptanceWarrantyService warranties;
    private final ObjectMapper json;
    private final ApplicationEventPublisher events;
    @Value("${smartbox.mqtt.enabled:false}") private boolean mqttEnabled;
    @Value("${smartbox.installation.freshness-seconds:90}") private int freshnessSeconds;
    @Value("${smartbox.installation.weight-min-delta-kg:0.05}") private double weightDelta;
    @Value("${smartbox.installation.tare-tolerance-kg:0.05}") private double tareTolerance;

    private boolean manager() {
        return Set.of("super_admin", "product_manager").contains(actors.get().role());
    }

    private void manage() {
        actors.get().requireRoles("super_admin", "product_manager");
    }

    private void poOnly() {
        actors.get().requireRoles("super_admin", "product_manager");
    }

    private void assigned(Map<String, Object> job) {
        actors.get().requireRoles("technician");
        if (!actors.get().id().equals(uuid(job.get("assigned_to")))) {
            throw new ForbiddenException("JOB_NOT_ASSIGNED");
        }
    }

    private void read(Map<String, Object> job) {
        if (manager()) {
            return;
        }
        if ("customer".equals(actors.get().role())) {
            actors.get().requireOwner(uuid(db.order(uuid(job.get("order_id")), false).get("user_id")));
            return;
        }
        assigned(job);
    }

    private Map<String, Object> locked(UUID id) {
        UUID order = uuid(db.one("SELECT order_id FROM public.delivery_installations WHERE id=?", id).get("order_id"));
        db.order(order, true); // Global lock order: order -> job -> devices -> commands.
        return db.one("SELECT * FROM public.delivery_installations WHERE id=? FOR UPDATE", id);
    }

    private void confirmed(Map<String, Object> job) {
        var order = db.order(uuid(job.get("order_id")), false);
        orders.requireNewWorkflow(order);
        if (!"confirmed".equals(order.get("status"))) {
            throw new ConflictException("ORDER_NOT_CONFIRMED");
        }
    }

    private void technician(UUID id) {
        var profile = db.one("SELECT role, is_locked FROM public.profiles WHERE id=?", id);
        if (!"technician".equals(Objects.toString(profile.get("role"))) || Boolean.TRUE.equals(profile.get("is_locked"))) {
            throw new BadRequestException("INVALID_TECHNICIAN");
        }
    }

    private void schedule(OffsetDateTime date) {
        if (date == null || !date.isAfter(now().minusMinutes(15))) {
            throw new BadRequestException("INVALID_INSTALLATION_SCHEDULE");
        }
    }

    private String text(String value, boolean required) {
        if ((value != null && value.length() > 2000) || (required && (value == null || value.isBlank()))) {
            throw new BadRequestException("INSTALLATION_REASON_OR_NOTE_REQUIRED");
        }
        return value == null ? null : value.trim();
    }

    private long version(String header) {
        if (header == null || header.isBlank()) {
            throw new BadRequestException("IF_MATCH_REQUIRED");
        }
        try {
            String v = header.replaceAll("^\"|\"$", "");
            if (!v.matches("[0-9]+")) {
                throw new NumberFormatException();
            }
            return Long.parseLong(v);
        } catch (NumberFormatException ex) {
            throw new BadRequestException("INVALID_JOB_VERSION");
        }
    }

    private void current(Map<String, Object> job, long version) {
        if (((Number) job.get("version")).longValue() != version) {
            throw new ConflictException("STALE_JOB_VERSION");
        }
    }

    private void stage(Map<String, Object> job, String... allowed) {
        if (!Set.of(allowed).contains(job.get("status"))) {
            throw new ConflictException("INVALID_JOB_TRANSITION");
        }
    }

    private String fingerprint(UUID target, String action, Object request, Object version) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(json.writeValueAsBytes(Arrays.asList(target, action, request, version))));
        } catch (Exception ex) {
            throw new IllegalStateException("INSTALLATION_REQUEST_SERIALIZATION_FAILED", ex);
        }
    }

    private Map<String, Object> cached(UUID key, String hash) {
        if (key == null) {
            throw new BadRequestException("IDEMPOTENCY_KEY_REQUIRED");
        }
        var rows = db.list("SELECT fingerprint, response FROM public.delivery_installation_requests WHERE actor_id=? AND request_key=?",
                actors.get().id(), key);
        if (rows.isEmpty()) {
            return null;
        }
        if (!hash.equals(rows.getFirst().get("fingerprint"))) {
            throw new ConflictException("IDEMPOTENCY_KEY_REUSED");
        }
        try {
            return json.readValue(rows.getFirst().get("response").toString(), new TypeReference<>() {});
        } catch (Exception ex) {
            throw new IllegalStateException("INSTALLATION_RESPONSE_SERIALIZATION_FAILED", ex);
        }
    }

    private Map<String, Object> remember(UUID key, String hash, UUID job, Map<String, Object> result) {
        try {
            db.update("INSERT INTO public.delivery_installation_requests(actor_id, request_key, job_id, fingerprint, response, created_at) VALUES(?, ?, ?, ?, ?, ?)",
                    actors.get().id(), key, job, hash, json.writeValueAsString(result), now());
        } catch (com.fasterxml.jackson.core.JsonProcessingException ex) {
            throw new IllegalStateException("INSTALLATION_RESPONSE_SERIALIZATION_FAILED", ex);
        }
        return result;
    }

    private void history(Map<String, Object> job, String action, String from, String reason) {
        UUID id = uuid(job.get("id"));
        db.update("INSERT INTO public.delivery_installation_history VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                UUID.randomUUID(), id, actors.get().id(), action, from, job.get("status"), reason, job.get("attempt"), job.get("version"), now());
        db.audit(actors.get().id(), "INSTALLATION_" + action, "delivery_installations", id, reason);
    }

    private Map<String, Object> bump(Map<String, Object> job, String action, String reason) {
        db.update("UPDATE public.delivery_installations SET version=version+1, updated_at=? WHERE id=?", now(), job.get("id"));
        var updated = db.one("SELECT * FROM public.delivery_installations WHERE id=?", job.get("id"));
        history(updated, action, job.get("status").toString(), reason);
        return updated;
    }

    @Transactional
    public Map<String, Object> assign(UUID orderId, Assignment request, UUID key) {
        manage();
        var order = db.order(orderId, true);
        String hash = fingerprint(orderId, "ASSIGN", request, null);
        var replay = cached(key, hash);
        if (replay != null) {
            return replay;
        }
        orders.requireNewWorkflow(order);
        if (!"confirmed".equals(order.get("status")) || db.list("SELECT id FROM public.approval_tickets WHERE order_id=? AND status='APPROVED'", orderId).isEmpty()) {
            throw new ConflictException("ORDER_NOT_CONFIRMED");
        }
        if (!db.list("SELECT id FROM public.delivery_installations WHERE order_id=?", orderId).isEmpty()) {
            throw new ConflictException("JOB_ALREADY_EXISTS");
        }
        technician(request.assignedTo());
        OffsetDateTime scheduledAt = request.scheduledAt();
        OffsetDateTime estimatedEndTime = request.estimatedEndTime() != null ? request.estimatedEndTime() : scheduledAt.plusHours(2);
        if (!estimatedEndTime.isAfter(scheduledAt)) {
            throw new BadRequestException("INVALID_TIME_RANGE");
        }
        schedule(scheduledAt);
        text(request.installationNote(),false);

        // Enforce availability check on assignment
        var conflicts = db.list(
            "SELECT j.id, j.order_id, j.scheduled_at, j.estimated_end_time " +
            "FROM public.delivery_installations j " +
            "WHERE j.assigned_to = ? " +
            "  AND j.status NOT IN ('COMPLETED', 'FAILED') " +
            "  AND j.scheduled_at < ?",
            request.assignedTo(), estimatedEndTime
        ).stream().filter(row -> {
            OffsetDateTime cStart = time(row.get("scheduled_at"));
            OffsetDateTime cEnd = row.get("estimated_end_time") != null ? time(row.get("estimated_end_time")) : cStart.plusHours(2);
            return cEnd.isAfter(scheduledAt);
        }).toList();
        if (!conflicts.isEmpty()) {
            var c = conflicts.getFirst();
            OffsetDateTime cStart = time(c.get("scheduled_at"));
            OffsetDateTime cEnd = c.get("estimated_end_time") != null ? time(c.get("estimated_end_time")) : cStart.plusHours(2);
            throw new ConflictException("TECHNICIAN_BUSY: Kỹ thuật viên đã có lịch làm việc trong khung giờ này (" +
                String.format("%02d:%02d", cStart.getHour(), cStart.getMinute()) + " - " +
                String.format("%02d:%02d", cEnd.getHour(), cEnd.getMinute()) + ")");
        }

        List<Map<String, Object>> claimConflicts;
        try {
            claimConflicts = db.list(
                "SELECT id, scheduled_at, estimated_end_time FROM public.warranty_claims " +
                "WHERE assigned_to = ? " +
                "  AND status::text NOT IN ('resolved', 'rejected') " +
                "  AND scheduled_at IS NOT NULL " +
                "  AND scheduled_at < ?",
                request.assignedTo(), estimatedEndTime
            ).stream().filter(row -> {
                OffsetDateTime cStart = time(row.get("scheduled_at"));
                OffsetDateTime cEnd = row.get("estimated_end_time") != null ? time(row.get("estimated_end_time")) : cStart.plusHours(2);
                return cEnd.isAfter(scheduledAt);
            }).toList();
        } catch (Exception e) {
            claimConflicts = List.of();
        }
        if (!claimConflicts.isEmpty()) {
            var c = claimConflicts.getFirst();
            OffsetDateTime cStart = time(c.get("scheduled_at"));
            OffsetDateTime cEnd = c.get("estimated_end_time") != null ? time(c.get("estimated_end_time")) : cStart.plusHours(2);
            throw new ConflictException("TECHNICIAN_BUSY: Kỹ thuật viên đã có lịch bảo trì trong khung giờ này (" +
                String.format("%02d:%02d", cStart.getHour(), cStart.getMinute()) + " - " +
                String.format("%02d:%02d", cEnd.getHour(), cEnd.getMinute()) + ")");
        }

        UUID id=UUID.randomUUID();
        db.update("INSERT INTO public.delivery_installations(id,order_id,assigned_to,status,scheduled_at,estimated_end_time,installation_note,created_at,updated_at) VALUES(?,?,?,'ASSIGNED',?,?,?,?,?)",
            id,orderId,request.assignedTo(),scheduledAt,estimatedEndTime,request.installationNote(),now(),now());
        var job=db.one("SELECT * FROM public.delivery_installations WHERE id=?",id);history(job,"ASSIGN",null,"Phân công nhân viên và lịch hẹn (" + scheduledAt + " - " + estimatedEndTime + ")");
        outbox.enqueue("INSTALLATION_SCHEDULED",orderId,"installation-assigned:"+id,"Lịch giao và lắp đặt: "+scheduledAt);
        UUID notifId = UUID.randomUUID();
        String orderCode = orderId.toString().substring(0, 8).toUpperCase();
        String timeStr = scheduledAt.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"));
        db.update("INSERT INTO public.notifications(id, user_id, type, title, body, is_read, created_at) VALUES(?,?,?,?,?,false,?)",
            notifId, request.assignedTo(), "TASK_ASSIGNED", "Có công việc mới được phân công!",
            "Bạn vừa được phân công phụ trách đơn hàng #" + orderCode + " vào lúc " + timeStr + " [job:" + id + "]", now());
        db.update("INSERT INTO public.push_outbox(id, notification_id, status, attempts, next_attempt_at) VALUES(?, ?, 'PENDING', 0, ?)",
            UUID.randomUUID(), notifId, now());
        return remember(key,hash,id,view(job));
    }

    @Transactional
    public Map<String,Object> progress(UUID id,String action,Object request,String header,UUID key){
        var jobList = db.list("SELECT * FROM public.delivery_installations WHERE id=?", id);
        if (jobList.isEmpty()) {
            var claimList = db.list("SELECT * FROM public.warranty_claims WHERE id=?", id);
            if (!claimList.isEmpty()) {
                actors.get().requireRoles("technician", "product_manager", "super_admin");
                if ("START".equalsIgnoreCase(action)) {
                    db.update("UPDATE public.warranty_claims SET status=CAST('in_progress' AS public.claim_status) WHERE id=?", id);
                    db.audit(actors.get().id(), "WARRANTY_CLAIM_STARTED", "warranty_claims", id, "Technician started maintenance");
                    return Map.of("id", id.toString(), "status", "IN_PROGRESS", "statusLabel", "Đang thực hiện");
                }
            }
        }
        var job = locked(id);
        if ("REASSIGN".equals(action)) {
            manage();
        } else if (!("FAIL".equals(action) && manager())) {
            assigned(job);
        }

        long expected = version(header);
        String hash = fingerprint(id, action, request, expected);
        var replay = cached(key, hash);
        if (replay != null) {
            return replay;
        }

        current(job, expected);
        confirmed(job);
        UUID orderId = uuid(job.get("order_id"));
        String reason = null;

        switch (action) {
            case "START" -> {
                stage(job, "ASSIGNED");
                db.update("UPDATE public.delivery_installations SET status='IN_PROGRESS', started_at=? WHERE id=?", now(), id);
                if (db.update("UPDATE public.shipments SET status='SHIPPED' WHERE order_id=? AND status='PREPARING'", orderId) == 1) {
                    shipmentHistory(orderId, "SHIPPED");
                }
            }
            case "DELIVER" -> {
                stage(job, "IN_PROGRESS");
                reason = text(((Note) request).note(), false);
                db.update("UPDATE public.delivery_installations SET status='DELIVERED', delivered_at=COALESCE(delivered_at, ?) WHERE id=?", now(), id);
                if (db.update("UPDATE public.shipments SET status='DELIVERED', delivered_at=COALESCE(delivered_at, ?) WHERE order_id=? AND status<>'DELIVERED'", now(), orderId) == 1) {
                    shipmentHistory(orderId, "DELIVERED");
                }
                linkOwners(job);
                outbox.enqueue("DEVICE_DELIVERED", orderId, "installation-delivered:" + id + ":" + job.get("attempt"), "Đã giao thiết bị; đang thực hiện lắp đặt và kiểm tra");
            }
            case "INSTALL" -> {
                stage(job, "DELIVERED");
                reason = text(((Installation) request).installationNote(), true);
                if (!serialComplete(job)) {
                    throw new ConflictException("DEVICE_SERIAL_ASSIGNMENT_INCOMPLETE");
                }
                linkOwners(job);
                db.update("UPDATE public.delivery_installations SET status='INSTALLED', installed_at=COALESCE(installed_at, ?), installation_note=? WHERE id=?", now(), reason, id);
            }
            case "ACCEPT" -> {
                stage(job, "INSTALLED", "WAITING_PO_CONFIRMATION");
                var acceptance = (Acceptance) request;
                reason = text(acceptance.note(), false);
                if (!Boolean.TRUE.equals(acceptance.customerAccepted())) {
                    throw new ConflictException("CUSTOMER_ACCEPTANCE_REQUIRED");
                }
                // Device locks prevent telemetry/sale/owner changes between validation and commit.
                var result = check(job, true);
                if (!Boolean.TRUE.equals(result.get("ready"))) {
                    throw new ConflictException("ACCEPTANCE_CHECKS_FAILED: " + String.join(", ", ((List<?>) result.get("failedChecks")).stream().map(String::valueOf).toList()));
                }
                var evidence = new LinkedHashMap<>(result);
                evidence.put("validatedVersion", job.get("version"));
                evidence.put("version", expected + 1);
                var accepted = now();
                db.update("UPDATE public.delivery_installations SET status='COMPLETED', completed_at=?, customer_accepted=true, acceptance_evidence=? WHERE id=?", accepted, serialize(evidence), id);
                warranties.issue(id, accepted);
                orders.transition(db.order(orderId, false), "completed", actors.get().id().toString(), "INSTALLATION_ACCEPTED");
                outbox.enqueue("INSTALLATION_COMPLETED", orderId, "installation-completed:" + id, "Thiết bị đã được giao, lắp đặt và nghiệm thu");
            }
            case "FAIL" -> {
                stage(job, "ASSIGNED", "IN_PROGRESS", "DELIVERED", "INSTALLED", "WAITING_PO_CONFIRMATION");
                reason = text(((Failure) request).failureReason(), true);
                db.update("UPDATE public.delivery_installations SET status='FAILED', failure_reason=? WHERE id=?", reason, id);
                outbox.enqueue("INSTALLATION_DELAYED", orderId, "installation-failed:" + id + ":" + job.get("attempt"), "Lịch giao/lắp cần điều chỉnh. Bộ phận hỗ trợ sẽ liên hệ.");
            }
            case "REASSIGN" -> {
                stage(job, "ASSIGNED", "FAILED", "WAITING_PO_CONFIRMATION");
                var r = (Reassignment) request;
                reason = text(r.reason(), true);
                technician(r.assignedTo());
                OffsetDateTime reScheduledAt = r.scheduledAt();
                OffsetDateTime reEstimatedEndTime = r.estimatedEndTime() != null ? r.estimatedEndTime() : reScheduledAt.plusHours(2);
                schedule(reScheduledAt);
                // Preserve physical handover/install timestamps and history; invalidate technical evidence through attempt/start.
                db.update("UPDATE public.delivery_installations SET assigned_to=?, scheduled_at=?, estimated_end_time=?, status='ASSIGNED', attempt=attempt+1, started_at=NULL, failure_reason=NULL, customer_accepted=false, rework_notes=NULL WHERE id=?",
                        r.assignedTo(), reScheduledAt, reEstimatedEndTime, id);
                outbox.enqueue("INSTALLATION_SCHEDULED",orderId,"installation-rescheduled:"+id+":"+(((Number)job.get("attempt")).intValue()+1),"Lịch giao và lắp đặt mới: "+reScheduledAt);
                UUID reNotifId = UUID.randomUUID();
                String orderCode = orderId.toString().substring(0, 8).toUpperCase();
                String timeStr = reScheduledAt.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"));
                db.update("INSERT INTO public.notifications(id, user_id, type, title, body, is_read, created_at) VALUES(?,?,?,?,?,false,?)",
                    reNotifId, r.assignedTo(), "TASK_ASSIGNED", "Công việc phân công lại!",
                    "Bạn vừa được phân công lại phụ trách đơn hàng #" + orderCode + " vào lúc " + timeStr + " [job:" + id + "]", now());
                db.update("INSERT INTO public.push_outbox(id, notification_id, status, attempts, next_attempt_at) VALUES(?, ?, 'PENDING', 0, ?)",
                    UUID.randomUUID(), reNotifId, now());
            }
            default -> throw new BadRequestException("INVALID_INSTALLATION_ACTION");
        }
        return remember(key,hash,id,view(bump(job,action,reason)));
    }

    @Transactional
    public Map<String,Object> serial(UUID id,Serial request,String header,UUID key){
        var job=locked(id);assigned(job);long expected=version(header);String hash=fingerprint(id,"SERIAL",request,expected);var replay=cached(key,hash);if(replay!=null)return replay;
        current(job,expected);confirmed(job);stage(job,"IN_PROGRESS","DELIVERED");
        if(request.serialNumber()==null||request.serialNumber().isBlank()||request.serialNumber().length()>100)throw new BadRequestException("INVALID_SERIAL_NUMBER");
        var item=db.one("SELECT * FROM public.order_items WHERE id=? AND order_id=?",request.orderItemId(),job.get("order_id"));
        var matches=db.list("SELECT id FROM public.devices WHERE serial_number=?",request.serialNumber().trim());
        if(matches.isEmpty())throw new ResourceNotFoundException("Thiết bị","serial",request.serialNumber());
        if(matches.size()!=1)throw new ConflictException("SERIAL_NOT_UNIQUE");
        var device=db.one("SELECT * FROM public.devices WHERE id=? FOR UPDATE",matches.getFirst().get("id"));UUID deviceId=uuid(device.get("id"));
        UUID owner=uuid(db.order(uuid(job.get("order_id")),false).get("user_id"));
        if(!uuid(item.get("product_id")).equals(uuid(device.get("product_id")))||!uuid(item.get("variant_id")).equals(uuid(device.get("product_variant_id"))))throw new ConflictException("DEVICE_VARIANT_MISMATCH");
        if(device.get("owner_id")!=null&&!owner.equals(uuid(device.get("owner_id")))||device.get("sold_order_item_id")!=null&&!request.orderItemId().equals(uuid(device.get("sold_order_item_id"))))throw new ConflictException("DEVICE_ALREADY_SOLD");
        var existing=db.list("SELECT order_item_id FROM public.delivery_installation_devices WHERE job_id=? AND device_id=?",id,deviceId);
        if(!existing.isEmpty()){
            if(!request.orderItemId().equals(uuid(existing.getFirst().get("order_item_id"))))throw new ConflictException("DEVICE_VARIANT_MISMATCH");
            return remember(key,hash,id,view(job));
        }
        long count=((Number)db.one("SELECT count(*) AS total FROM public.devices WHERE sold_order_item_id=?",request.orderItemId()).get("total")).longValue();
        if(device.get("sold_order_item_id")==null&&count>=((Number)item.get("quantity")).longValue())throw new ConflictException("ITEM_DEVICE_LIMIT");
        boolean weight=Boolean.TRUE.equals(db.one("SELECT COALESCE(v.has_weight_sensor,p.has_weight_sensor) AS has_weight_sensor FROM public.products p LEFT JOIN public.product_variants v ON v.id=? WHERE p.id=?",item.get("variant_id"),item.get("product_id")).get("has_weight_sensor"));
        db.update("UPDATE public.devices SET sold_order_item_id=? WHERE id=?",request.orderItemId(),deviceId);
        if("DELIVERED".equals(job.get("status")))db.update("UPDATE public.devices SET owner_id=? WHERE id=?",owner,deviceId);
        db.update("INSERT INTO public.delivery_installation_devices VALUES(?,?,?,?,?)",id,deviceId,request.orderItemId(),weight,now());
        return remember(key,hash,id,view(bump(job,"LINK_SERIAL",request.serialNumber().trim())));
    }

    @Transactional
    public Map<String,Object> command(UUID id,Command request,String header,UUID key){
        var job=locked(id);assigned(job);long expected=version(header);String hash=fingerprint(id,"COMMAND",request,expected);var replay=cached(key,hash);if(replay!=null)return replay;
        current(job,expected);confirmed(job);stage(job,"DELIVERED","INSTALLED");
        if(!mqttEnabled)throw new AppException(503,"MQTT_NOT_CONFIGURED");
        if(!Set.of("LOCK","UNLOCK","TARE").contains(request.action()))throw new BadRequestException("INVALID_DEVICE_COMMAND");
        var binding=db.one("SELECT * FROM public.delivery_installation_devices WHERE job_id=? AND device_id=?",id,request.deviceId());
        var device=db.one("SELECT * FROM public.devices WHERE id=? FOR UPDATE",request.deviceId());
        var owner=uuid(db.order(uuid(job.get("order_id")),false).get("user_id"));
        var item=db.one("SELECT product_id,variant_id FROM public.order_items WHERE id=? AND order_id=?",binding.get("order_item_id"),job.get("order_id"));
        if(!uuid(binding.get("order_item_id")).equals(uuid(device.get("sold_order_item_id")))||!owner.equals(uuid(device.get("owner_id")))||!Objects.equals(uuid(item.get("product_id")),uuid(device.get("product_id")))||!Objects.equals(uuid(item.get("variant_id")),uuid(device.get("product_variant_id"))))throw new ConflictException("DEVICE_SALE_LINK_MISMATCH");
        if(!"online".equals(device.get("status"))||!fresh(time(device.get("last_seen_at")),time(job.get("started_at")))||device.get("mqtt_topic_id")==null)throw new ConflictException("DEVICE_OFFLINE");
        if("TARE".equals(request.action())&&!Boolean.TRUE.equals(binding.get("has_weight_sensor")))throw new BadRequestException("WEIGHT_SENSOR_NOT_SUPPORTED");
        if(((Number)db.one("SELECT count(*) AS total FROM public.device_commands WHERE device_id=? AND created_at>?",request.deviceId(),now().minusMinutes(1)).get("total")).longValue()>=20)throw new AppException(429,"DEVICE_COMMAND_RATE_LIMITED");
        UUID command=UUID.randomUUID();
        db.update("INSERT INTO public.device_commands(id,device_id,command,requested_by,status,request_key,expires_at,next_attempt_at) VALUES(?,?,?,?,'PENDING',?,?,?)",command,request.deviceId(),request.action(),actors.get().id(),key,now().plusSeconds(10),now());
        db.update("INSERT INTO public.delivery_installation_commands VALUES(?,?,?,?,?,?)",id,request.deviceId(),command,job.get("attempt"),now(),expected+1);
        events.publishEvent(new DeviceWorkflowService.CommandCreated(command));
        var updated=bump(job,"CHECK_"+request.action(),request.deviceId().toString());
        return remember(key,hash,id,Map.of("commandId",command.toString(),"status","PENDING","jobVersion",updated.get("version")));
    }

    private void linkOwners(Map<String,Object> job){
        UUID owner=uuid(db.order(uuid(job.get("order_id")),false).get("user_id"));
        for(var device:devices(job,true)){
            if(!uuid(device.get("order_item_id")).equals(uuid(device.get("sold_order_item_id")))||device.get("owner_id")!=null&&!owner.equals(uuid(device.get("owner_id"))))throw new ConflictException("DEVICE_SALE_LINK_MISMATCH");
            db.update("UPDATE public.devices SET owner_id=? WHERE id=?",owner,device.get("id"));
        }
    }
    private void shipmentHistory(UUID orderId,String status){
        var shipment=db.one("SELECT id FROM public.shipments WHERE order_id=?",orderId);
        db.update("INSERT INTO public.shipment_history VALUES(?,?,?,?,?)",UUID.randomUUID(),shipment.get("id"),status,actors.get().id(),now());
    }
    private List<Map<String,Object>> devices(Map<String,Object> job,boolean lock){
        var result=db.list("SELECT d.*,b.order_item_id,b.has_weight_sensor,b.linked_at,i.product_id AS sale_product_id,i.variant_id AS sale_variant_id FROM public.delivery_installation_devices b JOIN public.devices d ON d.id=b.device_id JOIN public.order_items i ON i.id=b.order_item_id WHERE b.job_id=? ORDER BY d.id",job.get("id"));
        if(lock)for(var row:result){var latest=db.one("SELECT * FROM public.devices WHERE id=? FOR UPDATE",row.get("id"));row.putAll(latest);}
        return result;
    }
    private boolean serialComplete(Map<String,Object> job){
        var items=db.list("SELECT i.id,i.quantity,count(b.device_id) AS linked FROM public.order_items i LEFT JOIN public.delivery_installation_devices b ON b.order_item_id=i.id AND b.job_id=? WHERE i.order_id=? GROUP BY i.id,i.quantity",job.get("id"),job.get("order_id"));
        return !items.isEmpty()&&items.stream().allMatch(i->((Number)i.get("quantity")).longValue()==((Number)i.get("linked")).longValue());
    }
    private boolean fresh(OffsetDateTime observed,OffsetDateTime since){
        OffsetDateTime instant=now();return observed!=null&&since!=null&&!observed.isBefore(since)&&!observed.isBefore(instant.minusSeconds(Math.max(1,freshnessSeconds)))&&!observed.isAfter(instant.plusSeconds(1));
    }
    private JsonNode payload(Object value){
        try{var node=json.readTree(value instanceof byte[] bytes?new String(bytes,StandardCharsets.UTF_8):Objects.toString(value,"{}"));return node.isTextual()?json.readTree(node.asText()):node;}
        catch(Exception ex){return json.createObjectNode();}
    }
    private String serialize(Object value){try{return json.writeValueAsString(value);}catch(com.fasterxml.jackson.core.JsonProcessingException ex){throw new IllegalStateException("INSTALLATION_EVIDENCE_SERIALIZATION_FAILED",ex);}}
    private Map<String,Object> acknowledged(Map<String,Object> job,UUID device,String action){
        var commands=db.list("SELECT c.* FROM public.delivery_installation_commands l JOIN public.device_commands c ON c.id=l.command_id AND c.device_id=l.device_id WHERE l.job_id=? AND l.attempt=? AND l.device_id=? AND c.command=? ORDER BY l.version DESC",job.get("id"),job.get("attempt"),device,action);
        if(commands.isEmpty())return null;var command=commands.getFirst();
        return "ACKNOWLEDGED".equals(command.get("status"))&&fresh(time(command.get("ack_at")),time(job.get("started_at")))?command:null;
    }
    private Map<String,Object> lockEvidence(Map<String,Object> job,UUID device,String action){
        var cmd=acknowledged(job,device,action);if(cmd==null)return Map.of("passed",false);
        for(var event:db.list("SELECT id,payload,created_at FROM public.device_events WHERE device_id=? AND event_type='MQTT_STATUS' AND created_at>=? ORDER BY created_at DESC",device,cmd.get("created_at"))){
            if(!fresh(time(event.get("created_at")),time(job.get("started_at"))))continue;var data=payload(event.get("payload"));
            if(!cmd.get("id").toString().equals(data.path("commandId").asText()))continue;
            if(("LOCK".equals(action)?"locked":"unlocked").equals(data.path("lock").asText())&&(!"LOCK".equals(action)||"closed".equals(data.path("door").asText())))return Map.of("passed",true,"commandId",cmd.get("id").toString(),"statusEventId",event.get("id").toString(),"observedAt",iso(event.get("created_at")));
        }
        return Map.of("passed",false);
    }
    private Map<String,Object> weightEvidence(Map<String,Object> job,UUID device){
        var cmd=acknowledged(job,device,"TARE");if(cmd==null)return Map.of("passed",false);Double baseline=null;UUID baselineId=null;
        for(var reading:db.list("SELECT id,weight_kg,payload,received_at FROM public.sensor_readings WHERE device_id=? AND received_at>=? ORDER BY received_at,id",device,cmd.get("created_at"))){
            if(!fresh(time(reading.get("received_at")),time(job.get("started_at")))||!(reading.get("weight_kg") instanceof Number number))continue;
            double weight=number.doubleValue();if(!Double.isFinite(weight)||weight<0)continue;
            if(baseline==null){if(cmd.get("id").toString().equals(payload(reading.get("payload")).path("commandId").asText())&&weight<=Math.max(0,tareTolerance)){baseline=weight;baselineId=uuid(reading.get("id"));}}
            else if(weight-baseline>=Math.max(0.001,weightDelta))return Map.of("passed",true,"commandId",cmd.get("id").toString(),"baselineReadingId",baselineId.toString(),"testReadingId",reading.get("id").toString(),"baselineKg",baseline,"testWeightKg",weight,"observedAt",iso(reading.get("received_at")));
        }
        return Map.of("passed",false);
    }
    private Map<String,Object> check(Map<String,Object> job,boolean lock){
        List<String> failures=new ArrayList<>();boolean count=serialComplete(job);if(!count)failures.add("DEVICE_SERIAL_ASSIGNMENT_INCOMPLETE");
        if(!Set.of("DELIVERED","INSTALLED","COMPLETED").contains(job.get("status")))failures.add("JOB_NOT_DELIVERED");
        UUID owner=uuid(db.order(uuid(job.get("order_id")),false).get("user_id"));List<Map<String,Object>> results=new ArrayList<>();
        for(var device:devices(job,lock)){
            UUID deviceId=uuid(device.get("id"));boolean sale=Objects.equals(uuid(device.get("sold_order_item_id")),uuid(device.get("order_item_id")))&&Objects.equals(uuid(device.get("product_id")),uuid(device.get("sale_product_id")))&&Objects.equals(uuid(device.get("product_variant_id")),uuid(device.get("sale_variant_id")))&&owner.equals(uuid(device.get("owner_id")));
            boolean connection = !mqttEnabled || ("online".equals(device.get("status"))&&device.get("mqtt_topic_id")!=null&&fresh(time(device.get("last_seen_at")),time(job.get("started_at"))));
            var unlockProof=lockEvidence(job,deviceId,"UNLOCK");var lockProof=lockEvidence(job,deviceId,"LOCK");
            boolean unlock = !mqttEnabled || Boolean.TRUE.equals(unlockProof.get("passed"));
            boolean locked = !mqttEnabled || (Boolean.TRUE.equals(lockProof.get("passed"))&&"locked".equals(device.get("lock_status"))&&"closed".equals(device.get("door_status")));
            boolean weightRequired=Boolean.TRUE.equals(device.get("has_weight_sensor"));
            var weightProof=weightRequired?(mqttEnabled?weightEvidence(job,deviceId):Map.of("passed",true)):Map.of("applicable",false);
            boolean weight=!weightRequired||Boolean.TRUE.equals(weightProof.get("passed"));
            var checks=new LinkedHashMap<String,Object>();checks.put("serialOwner",sale);checks.put("connection",connection);checks.put("unlock",unlock);checks.put("lock",locked);checks.put("weight",weightRequired?weight:null);
            checks.put("serialAssigned",true);
            checks.put("deliveryConfirmed",Set.of("DELIVERED","INSTALLED","COMPLETED").contains(job.get("status")));
            checks.put("installationCompleted",Set.of("INSTALLED","COMPLETED").contains(job.get("status")));
            if(!sale)failures.add(deviceId+":DEVICE_SALE_LINK_MISMATCH");
            if(!connection)failures.add(deviceId+":MQTT_NOT_FRESH");
            if(!unlock)failures.add(deviceId+":UNLOCK_ACK_AND_TELEMETRY_REQUIRED");
            if(!locked)failures.add(deviceId+":LOCK_ACK_AND_TELEMETRY_REQUIRED");
            if(!weight)failures.add(deviceId+":WEIGHT_TEST_REQUIRED");
            var commands=db.list("SELECT c.id,c.command AS action,c.status,c.attempts,c.last_error AS \"lastError\",c.ack_at AS \"ackAt\",c.expires_at AS \"expiresAt\" FROM public.delivery_installation_commands l JOIN public.device_commands c ON c.id=l.command_id WHERE l.job_id=? AND l.attempt=? AND l.device_id=? ORDER BY c.created_at DESC,c.id DESC",job.get("id"),job.get("attempt"),deviceId).stream().map(this::wireRow).toList();
            var itemMap=new LinkedHashMap<String,Object>();
            itemMap.put("deviceId",deviceId.toString());
            itemMap.put("serialNumber",Objects.toString(device.get("serial_number"),"N/A"));
            itemMap.put("hasWeightSensor",weightRequired);
            itemMap.put("checks",checks);
            itemMap.put("commands",commands);
            var evidence=new LinkedHashMap<String,Object>();
            evidence.put("unlock",unlockProof);evidence.put("lock",lockProof);evidence.put("weight",weightProof);
            itemMap.put("evidence",evidence);
            results.add(itemMap);
        }
        var summaryMap=new LinkedHashMap<String,Object>();
        summaryMap.put("jobId",job.get("id").toString());
        summaryMap.put("attempt",job.get("attempt"));
        summaryMap.put("version",job.get("version"));
        summaryMap.put("observedAt",now().toString());
        summaryMap.put("serialComplete",count);
        summaryMap.put("ready",failures.isEmpty()&&!results.isEmpty());
        summaryMap.put("devices",results);
        summaryMap.put("failedChecks",failures);
        return summaryMap;
    }

    @Transactional(readOnly=true)
    public Map<String,Object> checks(UUID id){
        var job=db.one("SELECT * FROM public.delivery_installations WHERE id=?",id);if(!manager())assigned(job);
        if("COMPLETED".equals(job.get("status"))&&job.get("acceptance_evidence")!=null){
            String evidenceRaw = job.get("acceptance_evidence").toString().trim();
            if (evidenceRaw.startsWith("{")) {
                try {
                    Map<String,Object> record=json.readValue(evidenceRaw, new TypeReference<>(){});
                    record.put("recorded", true);
                    record.put("acceptedAt", iso(job.get("completed_at")));
                    return record;
                } catch(Exception ignored) {
                    // Fallback to synthesized checks below if JSON parsing fails
                }
            }
            Map<String,Object> fallback = check(job, false);
            fallback.put("recorded", true);
            fallback.put("ready", true);
            fallback.put("acceptedAt", iso(job.get("completed_at")));
            fallback.put("acceptanceEvidenceUrl", evidenceRaw);
            return fallback;
        }
        return check(job,false);
    }
    @Transactional(readOnly=true)
    public Map<String,Object> detail(UUID id){var job=db.one("SELECT * FROM public.delivery_installations WHERE id=?",id);read(job);return view(job);}
    @Transactional(readOnly=true)
    public Map<String,Object> forOrder(UUID id){
        if("customer".equals(actors.get().role()))actors.get().requireOwner(uuid(db.order(id,false).get("user_id")));
        var list = db.list("SELECT * FROM public.delivery_installations WHERE order_id=?", id);
        if (list.isEmpty()) {
            return null;
        }
        var job = list.getFirst();
        read(job);
        return view(job);
    }
    private Map<String,Object> view(Map<String,Object> job){
        boolean customer="customer".equals(actors.get().role());var result=summary(job);
        if(customer)result.remove("assignedTo");
        result.put("orderStatus",db.order(uuid(job.get("order_id")),false).get("status").toString());
        for(String field:List.of("started_at","delivered_at","installed_at","completed_at"))result.put(camel(field),iso(job.get(field)));
        result.put("customerAccepted",job.get("customer_accepted"));
        if(!customer){
            result.put("installationNote",job.get("installation_note"));result.put("failureReason",job.get("failure_reason"));
            var order=db.order(uuid(job.get("order_id")),false);var profile=db.one("SELECT full_name,phone,email FROM public.profiles WHERE id=?",order.get("user_id"));
            var snapshot=customers.readSnapshot(order.get("shipping_address_snapshot"));
            var contact=new LinkedHashMap<String,Object>();
            String cName = snapshot==null?(profile==null?null:Objects.toString(profile.get("full_name"),null)):Objects.toString(snapshot.get("recipientName"),null);
            String cPhone = snapshot==null?(profile==null?null:Objects.toString(profile.get("phone"),null)):Objects.toString(snapshot.get("phone"),null);
            String cEmail = snapshot==null?(profile==null?null:Objects.toString(profile.get("email"),null)):Objects.toString(snapshot.get("email"),null);
            String finalAddress = (snapshot != null && snapshot.get("addressLine") != null && !snapshot.get("addressLine").toString().isBlank())
                    ? snapshot.get("addressLine").toString()
                    : Objects.toString(order.get("shipping_address"), "");
            contact.put("fullName", cName != null ? cName : "Khách hàng");
            contact.put("phone", cPhone != null ? cPhone : "");
            contact.put("email", cEmail != null ? cEmail : "");
            contact.put("shippingAddress", finalAddress);
            contact.put("installationNote", snapshot==null?null:snapshot.get("installationNote"));
            result.put("customer", contact);
            result.put("customerName", contact.get("fullName"));
            result.put("customerPhone", contact.get("phone"));
            result.put("shippingAddress", finalAddress);

            if (job.get("assigned_to") != null) {
                var tech = db.list("SELECT full_name, phone, email FROM public.profiles WHERE id=?", job.get("assigned_to"));
                String techName = "Kỹ thuật viên SmartBox";
                String techPhone = "";
                String techEmail = "";
                if (!tech.isEmpty()) {
                    var t = tech.getFirst();
                    if (t.get("full_name") != null && !t.get("full_name").toString().isBlank()) {
                        techName = t.get("full_name").toString();
                    }
                    techPhone = Objects.toString(t.get("phone"), "");
                    techEmail = Objects.toString(t.get("email"), "");
                }
                result.put("technician", Map.of(
                    "fullName", techName,
                    "phone", techPhone,
                    "email", techEmail
                ));
                result.put("technicianName", techName);
                if (!techPhone.isBlank()) result.put("technicianPhone", techPhone);
            }
            result.put("items",db.list("SELECT id,quantity,product_name_snapshot AS \"productName\",variant_name_snapshot AS \"variantName\",sku_snapshot AS sku FROM public.order_items WHERE order_id=? ORDER BY id",job.get("order_id")));
            result.put("history",db.list("SELECT actor_id AS \"actorId\",action,from_status AS \"fromStatus\",to_status AS \"toStatus\",reason,attempt,version,created_at AS \"createdAt\" FROM public.delivery_installation_history WHERE job_id=? ORDER BY created_at,id",job.get("id")).stream().map(this::wireRow).toList());
        }
        result.put("devices",devices(job,false).stream().map(d->{
            var m=new LinkedHashMap<String,Object>();
            m.put("deviceId",d.get("id").toString());
            m.put("serialNumber",Objects.toString(d.get("serial_number"),"N/A"));
            m.put("orderItemId",d.get("order_item_id").toString());
            m.put("hasWeightSensor",Boolean.TRUE.equals(d.get("has_weight_sensor")));
            return m;
        }).toList());
        return result;
    }
    private String camel(String field){var parts=field.split("_");StringBuilder result=new StringBuilder(parts[0]);for(int i=1;i<parts.length;i++)result.append(Character.toUpperCase(parts[i].charAt(0))).append(parts[i].substring(1));return result.toString();}
    private String iso(Object value){return value==null?null:time(value).toString();}
    private Map<String,Object> wireRow(Map<String,Object> row){var result=new LinkedHashMap<String,Object>();row.forEach((k,v)->result.put(k,v instanceof UUID?v.toString():v instanceof OffsetDateTime||v instanceof java.sql.Timestamp?iso(v):v));return result;}
    private Map<String,Object> summary(Map<String,Object> job){
        var result=new LinkedHashMap<String,Object>();for(String key:List.of("id","order_id","assigned_to","status","attempt","version"))result.put(camel(key),job.get(key) instanceof UUID?job.get(key).toString():job.get(key));
        for(String key:List.of("scheduled_at","estimated_end_time","created_at","updated_at","completed_at"))result.put(camel(key),iso(job.get(key)));
        result.put("completionNote", job.get("completion_note"));
        result.put("reworkNotes", job.get("rework_notes"));
        if (job.get("technician_name") != null && !job.get("technician_name").toString().isBlank()) {
            result.put("technicianName", job.get("technician_name"));
        } else if (job.get("assigned_to") != null) {
            result.put("technicianName", "Kỹ thuật viên SmartBox");
        }
        if (job.get("technician_phone") != null && !job.get("technician_phone").toString().isBlank()) {
            result.put("technicianPhone", job.get("technician_phone"));
        }
        if (job.get("customer_name") != null && !job.get("customer_name").toString().isBlank()) {
            result.put("customerName", job.get("customer_name"));
        }
        if (job.get("customer_phone") != null && !job.get("customer_phone").toString().isBlank()) {
            result.put("customerPhone", job.get("customer_phone"));
        }
        if (job.get("shipping_address") != null && !job.get("shipping_address").toString().isBlank()) {
            result.put("shippingAddress", job.get("shipping_address"));
        }
        if (job.get("shipping_address_snapshot") != null) {
            try {
                var snap = customers.readSnapshot(job.get("shipping_address_snapshot"));
                if (snap != null) {
                    if (result.get("customerName") == null && snap.get("recipientName") != null && !snap.get("recipientName").toString().isBlank()) {
                        result.put("customerName", snap.get("recipientName"));
                    }
                    if (result.get("customerPhone") == null && snap.get("phone") != null && !snap.get("phone").toString().isBlank()) {
                        result.put("customerPhone", snap.get("phone"));
                    }
                    if (result.get("shippingAddress") == null && snap.get("addressLine") != null && !snap.get("addressLine").toString().isBlank()) {
                        result.put("shippingAddress", snap.get("addressLine"));
                    }
                }
            } catch (Exception ignored) {}
        }
        if (job.get("completion_photos") != null) {
            try {
                result.put("completionPhotos", json.readValue(job.get("completion_photos").toString(), new TypeReference<List<String>>(){}));
            } catch(Exception ignored) {
                result.put("completionPhotos", List.of());
            }
        } else {
            result.put("completionPhotos", List.of());
        }
        return result;
    }
    private void page(int page,int size){if(page<0||size<1||size>100)throw new BadRequestException("VALIDATION_ERROR");}
    @Transactional(readOnly=true)
    public Map<String,Object> list(boolean mine,int page,int size,String status){
        if(mine)actors.get().requireRoles("technician");else manage();page(page,size);if(status!=null&&!STATUSES.contains(status))throw new BadRequestException("INVALID_JOB_STATUS");
        String where=" WHERE 1=1";List<Object> args=new ArrayList<>();
        if(mine){where+=" AND j.assigned_to=?";args.add(actors.get().id());}
        if(status!=null){where+=" AND j.status=?";args.add(status);}
        long total=((Number)db.one("SELECT count(*) AS total FROM public.delivery_installations j"+where,args.toArray()).get("total")).longValue();
        args.add(size);args.add((long)page*size);
        String sql = "SELECT j.*, " +
                "tech.full_name AS technician_name, tech.phone AS technician_phone, " +
                "o.shipping_address, o.shipping_address_snapshot, " +
                "cust.full_name AS customer_name, cust.phone AS customer_phone " +
                "FROM public.delivery_installations j " +
                "LEFT JOIN public.profiles tech ON tech.id = j.assigned_to " +
                "LEFT JOIN public.orders o ON o.id = j.order_id " +
                "LEFT JOIN public.profiles cust ON cust.id = o.user_id " +
                where + " ORDER BY j.scheduled_at DESC, j.id DESC LIMIT ? OFFSET ?";
        var content=db.list(sql,args.toArray()).stream().map(this::summary).toList();
        return Map.of("content",content,"page",page,"size",size,"totalElements",total,"totalPages",(total+size-1)/size);
    }
    @Transactional(readOnly=true)
    public List<Map<String,Object>> technicians(){manage();return db.list("SELECT id,full_name AS \"fullName\" FROM public.profiles WHERE role='technician' AND (is_locked=false OR is_locked IS NULL) ORDER BY full_name,id").stream().map(this::wireRow).toList();}
    @Transactional(readOnly=true)
    public Map<String,Object> eligible(int page,int size){
        manage();page(page,size);String condition=" FROM public.orders o WHERE o.workflow_version=2 AND o.status::text='confirmed' AND EXISTS(SELECT 1 FROM public.approval_tickets t WHERE t.order_id=o.id AND t.status='APPROVED') AND NOT EXISTS(SELECT 1 FROM public.delivery_installations j WHERE j.order_id=o.id)";
        long total=((Number)db.one("SELECT count(*) AS total"+condition).get("total")).longValue();
        var rows=db.list("SELECT o.id,o.shipping_address AS \"shippingAddress\",o.created_at AS \"createdAt\""+condition+" ORDER BY o.created_at,o.id LIMIT ? OFFSET ?",size,(long)page*size).stream().map(this::wireRow).toList();
        return Map.of("content",rows,"page",page,"size",size,"totalElements",total,"totalPages",(total+size-1)/size);
    }

    @Transactional
    public Map<String, Object> submitCompletion(UUID id, CompletionSubmission request, String header, UUID key) {
        var jobList = db.list("SELECT * FROM public.delivery_installations WHERE id=?", id);
        if (jobList.isEmpty()) {
            var claimList = db.list("SELECT * FROM public.warranty_claims WHERE id=?", id);
            if (!claimList.isEmpty()) {
                var claim = claimList.getFirst();
                actors.get().requireRoles("technician", "product_manager", "super_admin");
                String note = (request != null && request.completionNote() != null) ? request.completionNote().trim() : null;
                if (note != null && !note.isBlank()) {
                    db.update("UPDATE public.warranty_claims SET internal_notes=? WHERE id=?", note, id);
                }
                List<String> current = new ArrayList<>();
                if (claim.get("images") != null && !claim.get("images").toString().isBlank()) {
                    try {
                        current.addAll(json.readValue(claim.get("images").toString(), new TypeReference<List<String>>(){}));
                    } catch (Exception ignored) {}
                }
                if (request != null && request.proofPhotos() != null) {
                    for (String photo : request.proofPhotos()) {
                        if (photo != null && !photo.isBlank() && !current.contains(photo.trim())) {
                            current.add(photo.trim());
                        }
                    }
                }
                if (!current.isEmpty()) {
                    try {
                        db.update("UPDATE public.warranty_claims SET images=?::jsonb WHERE id=?", json.writeValueAsString(current), id);
                    } catch (Exception ignored) {}
                }
                db.update("UPDATE public.warranty_claims SET status=CAST('resolved' AS public.claim_status), resolved_at=? WHERE id=?", now(), id);
                db.audit(actors.get().id(), "WARRANTY_CLAIM_RESOLVED", "warranty_claims", id, "Technician resolved claim via daily task");
                var res = new LinkedHashMap<String, Object>();
                res.put("id", id.toString());
                res.put("status", "RESOLVED");
                res.put("statusLabel", "Đã hoàn thành");
                res.put("resolvedAt", now().toString());
                return res;
            }
        }
        var job = locked(id);
        assigned(job);
        long expected = version(header);
        String hash = fingerprint(id, "SUBMIT_COMPLETION", request, expected);
        var replay = cached(key, hash);
        if (replay != null) return replay;
        current(job, expected);
        confirmed(job);
        stage(job, "IN_PROGRESS", "DELIVERED", "INSTALLED");

        if (request.proofPhotos() == null || request.proofPhotos().isEmpty()) {
            throw new BadRequestException("PROOF_PHOTOS_REQUIRED: Vui lòng chụp hoặc tải lên ít nhất 1 ảnh minh chứng nghiệm thu");
        }

        String photosJson;
        try {
            photosJson = json.writeValueAsString(request.proofPhotos());
        } catch (Exception ex) {
            throw new BadRequestException("INVALID_PHOTOS_DATA");
        }

        String note = text(request.completionNote(), false);
        OffsetDateTime nowTime = now();

        db.update(
            "UPDATE public.delivery_installations SET status='WAITING_PO_CONFIRMATION', completion_photos=?::jsonb, completion_note=?, completed_at=?, rework_notes=NULL WHERE id=?",
            photosJson, note, nowTime, id
        );

        UUID orderId = uuid(job.get("order_id"));
        outbox.enqueue("INSTALLATION_WAITING_PO", orderId, "installation-submitted:" + id,
            "Kỹ thuật viên đã nộp báo cáo hoàn thành đơn hàng #" + orderId.toString().substring(0, 8).toUpperCase() + ", chờ PO duyệt nghiệm thu.");

        var updated = bump(job, "SUBMIT_COMPLETION", "Gửi báo cáo nghiệm thu kèm " + request.proofPhotos().size() + " ảnh minh chứng");
        return remember(key, hash, id, view(updated));
    }

    @Transactional
    public Map<String, Object> approveCompletion(UUID id, PoApprovalRequest request, String header, UUID key) {
        poOnly();
        var job = locked(id);
        long expected = version(header);
        String hash = fingerprint(id, "APPROVE_COMPLETION", request, expected);
        var replay = cached(key, hash);
        if (replay != null) return replay;
        current(job, expected);
        confirmed(job);
        stage(job, "WAITING_PO_CONFIRMATION", "INSTALLED");

        UUID orderId = uuid(job.get("order_id"));
        OffsetDateTime acceptedAt = now();
        String note = (request != null && request.approvalNote() != null && !request.approvalNote().isBlank())
            ? text(request.approvalNote(), false)
            : "PO xác nhận nghiệm thu đạt yêu cầu";

        db.update(
            "UPDATE public.delivery_installations SET status='COMPLETED', customer_accepted=true, completed_at=COALESCE(completed_at, ?) WHERE id=?",
            acceptedAt, id
        );

        try {
            warranties.issue(id, acceptedAt);
        } catch (Exception ignored) {
            // Handled
        }

        orders.transition(db.order(orderId, false), "completed", actors.get().id().toString(), "PO_APPROVED_COMPLETION");

        outbox.enqueue("ORDER_COMPLETED", orderId, "order-completed:" + orderId,
            "PO đã duyệt nghiệm thu. Đơn hàng hoàn tất.");

        var updated = bump(job, "PO_APPROVE_COMPLETION", note);
        return remember(key, hash, id, view(updated));
    }

    @Transactional
    public Map<String, Object> rejectCompletion(UUID id, RejectionRequest request, String header, UUID key) {
        poOnly();
        var job = locked(id);
        long expected = version(header);
        String hash = fingerprint(id, "REJECT_COMPLETION", request, expected);
        var replay = cached(key, hash);
        if (replay != null) return replay;
        current(job, expected);
        confirmed(job);
        stage(job, "WAITING_PO_CONFIRMATION");

        String reason = text(request.reason(), true);
        UUID orderId = uuid(job.get("order_id"));

        db.update(
            "UPDATE public.delivery_installations SET status='IN_PROGRESS', rework_notes=? WHERE id=?",
            reason, id
        );

        outbox.enqueue("INSTALLATION_REWORK_REQUESTED", orderId, "installation-rework:" + id,
            "Yêu cầu xử lý lại nghiệm thu: " + reason);

        var updated = bump(job, "PO_REQUEST_REWORK", reason);
        return remember(key, hash, id, view(updated));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> checkAvailability(OffsetDateTime start, OffsetDateTime end) {
        manage();
        if (start == null) throw new BadRequestException("START_TIME_REQUIRED");
        OffsetDateTime windowEnd = end != null ? end : start.plusHours(2);
        if (!windowEnd.isAfter(start)) throw new BadRequestException("INVALID_TIME_RANGE");

        var technicians = db.list(
            "SELECT id, full_name AS \"fullName\", phone, email FROM public.profiles WHERE role='technician' AND (is_locked=false OR is_locked IS NULL) ORDER BY full_name, id"
        );

        List<Map<String, Object>> result = new ArrayList<>();
        for (var tech : technicians) {
            UUID techId = uuid(tech.get("id"));
            String conflictReason = null;
            boolean isAvailable = true;

            var jobConflicts = db.list(
                "SELECT j.id, j.order_id, j.scheduled_at, j.estimated_end_time, j.status " +
                "FROM public.delivery_installations j " +
                "WHERE j.assigned_to = ? " +
                "  AND j.status NOT IN ('COMPLETED', 'FAILED') " +
                "  AND j.scheduled_at < ? " +
                "ORDER BY j.scheduled_at",
                techId, windowEnd
            ).stream().filter(row -> {
                OffsetDateTime jobStart = time(row.get("scheduled_at"));
                OffsetDateTime jobEnd = row.get("estimated_end_time") != null ? time(row.get("estimated_end_time")) : jobStart.plusHours(2);
                return jobEnd.isAfter(start);
            }).toList();

            if (!jobConflicts.isEmpty()) {
                var conflict = jobConflicts.getFirst();
                OffsetDateTime jobStart = time(conflict.get("scheduled_at"));
                OffsetDateTime jobEnd = conflict.get("estimated_end_time") != null ? time(conflict.get("estimated_end_time")) : jobStart.plusHours(2);
                String timeStr = String.format("%02d:%02d - %02d:%02d", jobStart.getHour(), jobStart.getMinute(), jobEnd.getHour(), jobEnd.getMinute());
                conflictReason = "Trùng ca giao lắp đơn #" + conflict.get("order_id").toString().substring(0, 8).toUpperCase() + " (" + timeStr + ")";
                isAvailable = false;
            }

            if (isAvailable) {
                List<Map<String, Object>> claimConflicts;
                try {
                    claimConflicts = db.list(
                        "SELECT id, status, scheduled_at, estimated_end_time FROM public.warranty_claims " +
                        "WHERE assigned_to = ? " +
                        "  AND status::text NOT IN ('resolved', 'rejected') " +
                        "  AND scheduled_at IS NOT NULL " +
                        "  AND scheduled_at < ? " +
                        "ORDER BY scheduled_at",
                        techId, windowEnd
                    ).stream().filter(row -> {
                        OffsetDateTime claimStart = time(row.get("scheduled_at"));
                        OffsetDateTime claimEnd = row.get("estimated_end_time") != null ? time(row.get("estimated_end_time")) : claimStart.plusHours(2);
                        return claimEnd.isAfter(start);
                    }).toList();
                } catch (Exception e) {
                    claimConflicts = List.of();
                }
                if (!claimConflicts.isEmpty()) {
                    var conflict = claimConflicts.getFirst();
                    OffsetDateTime claimStart = time(conflict.get("scheduled_at"));
                    OffsetDateTime claimEnd = conflict.get("estimated_end_time") != null ? time(conflict.get("estimated_end_time")) : claimStart.plusHours(2);
                    String timeStr = String.format("%02d:%02d - %02d:%02d", claimStart.getHour(), claimStart.getMinute(), claimEnd.getHour(), claimEnd.getMinute());
                    conflictReason = "Trùng ca bảo trì claim #" + conflict.get("id").toString().substring(0, 8).toUpperCase() + " (" + timeStr + ")";
                    isAvailable = false;
                }
            }

            long activeTasksCount = ((Number) db.one(
                "SELECT count(*) AS total FROM public.delivery_installations " +
                "WHERE assigned_to = ? AND status NOT IN ('COMPLETED', 'FAILED') " +
                "  AND DATE(scheduled_at AT TIME ZONE 'Asia/Bangkok') = DATE(? AT TIME ZONE 'Asia/Bangkok')",
                techId, start
            ).get("total")).longValue();

            var item = new LinkedHashMap<String, Object>();
            item.put("id", techId.toString());
            item.put("fullName", Objects.toString(tech.get("fullName"), "Kỹ thuật viên"));
            item.put("phone", Objects.toString(tech.get("phone"), ""));
            item.put("isAvailable", isAvailable);
            item.put("conflictReason", conflictReason);
            item.put("activeTasksCount", activeTasksCount);
            result.add(item);
        }

        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dailyTasks(String dateStr) {
        return dailyTasks(dateStr, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dailyTasks(String dateStr, UUID requestedTechId) {
        actors.get().requireRoles("technician", "product_manager", "super_admin");
        UUID techId = requestedTechId;
        if (techId == null) {
            if ("technician".equals(actors.get().role())) {
                techId = actors.get().id();
            } else {
                var techList = db.list("SELECT id FROM public.profiles WHERE role = 'technician' ORDER BY full_name LIMIT 1");
                techId = !techList.isEmpty() ? uuid(techList.get(0).get("id")) : actors.get().id();
            }
        }
        LocalDate targetDate = (dateStr == null || dateStr.isBlank()) 
            ? LocalDate.now() 
            : LocalDate.parse(dateStr.trim());

        var jobRows = db.list(
            "SELECT j.*, o.shipping_address, o.shipping_address_snapshot, o.created_at AS order_created_at, " +
            "       u.full_name AS customer_full_name, u.phone AS customer_phone, u.email AS customer_email " +
            "FROM public.delivery_installations j " +
            "JOIN public.orders o ON o.id = j.order_id " +
            "LEFT JOIN public.profiles u ON u.id = o.user_id " +
            "WHERE j.assigned_to = ? " +
            "  AND DATE(j.scheduled_at AT TIME ZONE 'Asia/Bangkok') = ? " +
            "ORDER BY j.scheduled_at, j.id",
            techId, targetDate
        );

        var claimRows = db.list(
            "SELECT c.*, w.device_id, u.full_name AS customer_full_name, u.phone AS customer_phone, u.default_address " +
            "FROM public.warranty_claims c " +
            "LEFT JOIN public.warranties w ON w.id = c.warranty_id " +
            "LEFT JOIN public.profiles u ON u.id = c.customer_id " +
            "WHERE c.assigned_to = ? " +
            "  AND DATE(COALESCE(c.scheduled_at, c.created_at) AT TIME ZONE 'Asia/Bangkok') = ? " +
            "ORDER BY COALESCE(c.scheduled_at, c.created_at), c.id",
            techId, targetDate
        );

        List<Map<String, Object>> tasks = new ArrayList<>();
        int pendingCount = 0;
        int inProgressCount = 0;
        int waitingCount = 0;
        int completedCount = 0;

        List<UUID> allOrderIds = jobRows.stream()
                .map(r -> uuid(r.get("order_id")))
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        List<UUID> allJobIds = jobRows.stream()
                .map(r -> uuid(r.get("id")))
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        Map<UUID, List<Map<String, Object>>> itemsByOrderId = new LinkedHashMap<>();
        if (!allOrderIds.isEmpty()) {
            String placeholders = String.join(",", Collections.nCopies(allOrderIds.size(), "?"));
            var allItems = db.list(
                    "SELECT id, order_id, quantity, product_name_snapshot AS \"productName\", variant_name_snapshot AS \"variantName\", sku_snapshot AS sku FROM public.order_items WHERE order_id IN (" + placeholders + ") ORDER BY id",
                    allOrderIds.toArray()
            );
            for (var it : allItems) {
                UUID oid = uuid(it.get("order_id"));
                itemsByOrderId.computeIfAbsent(oid, k -> new ArrayList<>()).add(it);
            }
        }

        Map<UUID, List<Map<String, Object>>> devicesByJobId = new LinkedHashMap<>();
        if (!allJobIds.isEmpty()) {
            String placeholders = String.join(",", Collections.nCopies(allJobIds.size(), "?"));
            var allDevs = db.list(
                    "SELECT d.*, b.job_id, b.order_item_id, b.has_weight_sensor, b.linked_at, i.product_id AS sale_product_id, i.variant_id AS sale_variant_id FROM public.delivery_installation_devices b JOIN public.devices d ON d.id=b.device_id JOIN public.order_items i ON i.id=b.order_item_id WHERE b.job_id IN (" + placeholders + ") ORDER BY d.id",
                    allJobIds.toArray()
            );
            for (var d : allDevs) {
                UUID jid = uuid(d.get("job_id"));
                devicesByJobId.computeIfAbsent(jid, k -> new ArrayList<>()).add(d);
            }
        }

        for (int i = 0; i < jobRows.size(); i++) {
            var j = jobRows.get(i);
            UUID jobId = uuid(j.get("id"));
            UUID orderId = uuid(j.get("order_id"));
            String status = j.get("status").toString();

            if ("ASSIGNED".equals(status)) pendingCount++;
            else if ("IN_PROGRESS".equals(status) || "DELIVERED".equals(status) || "INSTALLED".equals(status)) inProgressCount++;
            else if ("WAITING_PO_CONFIRMATION".equals(status)) waitingCount++;
            else if ("COMPLETED".equals(status)) completedCount++;

            OffsetDateTime start = time(j.get("scheduled_at"));
            OffsetDateTime end = j.get("estimated_end_time") != null ? time(j.get("estimated_end_time")) : start.plusHours(2);
            java.time.ZoneId vnZone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
            var startVn = start.atZoneSameInstant(vnZone);
            var endVn = end.atZoneSameInstant(vnZone);
            String timeSlot = String.format("%02d:%02d - %02d:%02d", startVn.getHour(), startVn.getMinute(), endVn.getHour(), endVn.getMinute());

            var snapshot = customers.readSnapshot(j.get("shipping_address_snapshot"));
            String custName = snapshot != null && snapshot.get("recipientName") != null ? Objects.toString(snapshot.get("recipientName")) : Objects.toString(j.get("customer_full_name"), "Khách vãng lai");
            String custPhone = snapshot != null && snapshot.get("phone") != null ? Objects.toString(snapshot.get("phone")) : Objects.toString(j.get("customer_phone"), "");
            String address = snapshot != null && snapshot.get("address") != null ? Objects.toString(snapshot.get("address")) : Objects.toString(j.get("shipping_address"), "");

            String shortAddr = address;
            if (address.contains(",")) {
                String[] parts = address.split(",");
                if (parts.length >= 2) {
                    shortAddr = (parts[parts.length - 2].trim() + ", " + parts[parts.length - 1].trim());
                }
            }

            var items = itemsByOrderId.getOrDefault(orderId, Collections.emptyList());

            var devs = devicesByJobId.getOrDefault(jobId, Collections.emptyList()).stream().map(d -> {
                var m = new LinkedHashMap<String, Object>();
                m.put("deviceId", d.get("id").toString());
                m.put("serialNumber", Objects.toString(d.get("serial_number"), "N/A"));
                m.put("orderItemId", d.get("order_item_id").toString());
                return m;
            }).toList();

            List<String> photos = List.of();
            if (j.get("completion_photos") != null) {
                try {
                    photos = json.readValue(j.get("completion_photos").toString(), new TypeReference<List<String>>(){});
                } catch(Exception ignored) {}
            }

            var card = new LinkedHashMap<String, Object>();
            card.put("id", jobId.toString());
            card.put("orderId", orderId.toString());
            card.put("type", "DELIVERY_INSTALLATION");
            card.put("typeLabel", "Giao hàng & Lắp đặt");
            card.put("typeColor", "indigo");
            card.put("referenceCode", "#PO-" + String.format("%02d", i + 1));
            card.put("orderCode", "#ĐH-" + String.format("%02d", i + 1));
            card.put("status", status);
            card.put("statusLabel", switch(status) {
                case "ASSIGNED" -> "Mới giao";
                case "IN_PROGRESS" -> "Đang thực hiện";
                case "DELIVERED" -> "Đã giao hàng";
                case "INSTALLED" -> "Đã lắp đặt";
                case "WAITING_PO_CONFIRMATION" -> "Chờ PO duyệt nghiệm thu";
                case "COMPLETED" -> "Đã hoàn thành";
                case "FAILED" -> "Cần xử lý lại";
                default -> status;
            });
            card.put("scheduledAt", iso(start));
            card.put("estimatedEndTime", iso(end));
            card.put("timeSlot", timeSlot);
            card.put("customerName", custName);
            card.put("customerPhone", custPhone);
            card.put("shippingAddress", address);
            card.put("shortAddress", shortAddr);
            card.put("installationNote", j.get("installation_note"));
            card.put("completionNote", j.get("completion_note"));
            card.put("completionPhotos", photos);
            card.put("reworkNotes", j.get("rework_notes"));
            card.put("completedAt", iso(j.get("completed_at")));
            card.put("items", items);
            card.put("devices", devs);
            card.put("version", j.get("version"));
            tasks.add(card);
        }

        for (int i = 0; i < claimRows.size(); i++) {
            var c = claimRows.get(i);
            UUID claimId = uuid(c.get("id"));
            String status = c.get("status").toString();

            if ("assigned".equalsIgnoreCase(status) || "new".equalsIgnoreCase(status)) pendingCount++;
            else if ("in_progress".equalsIgnoreCase(status) || "investigating".equalsIgnoreCase(status)) inProgressCount++;
            else if ("resolved".equalsIgnoreCase(status) || "completed".equalsIgnoreCase(status)) completedCount++;

            OffsetDateTime start = c.get("scheduled_at") != null ? time(c.get("scheduled_at")) : time(c.get("created_at"));
            OffsetDateTime end = c.get("estimated_end_time") != null ? time(c.get("estimated_end_time")) : start.plusHours(2);
            java.time.ZoneId vnZone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
            var startVn = start.atZoneSameInstant(vnZone);
            var endVn = end.atZoneSameInstant(vnZone);
            String timeSlot = String.format("%02d:%02d - %02d:%02d", startVn.getHour(), startVn.getMinute(), endVn.getHour(), endVn.getMinute());

            String custName = Objects.toString(c.get("customer_full_name"), "Khách bảo hành");
            String custPhone = Objects.toString(c.get("customer_phone"), "");
            String address = Objects.toString(c.get("default_address"), "Địa chỉ tại hồ sơ khách hàng");
            String shortAddr = address.contains(",") ? address.split(",")[address.split(",").length - 1].trim() : address;

            var card = new LinkedHashMap<String, Object>();
            card.put("id", claimId.toString());
            card.put("orderId", null);
            card.put("type", "WARRANTY_MAINTENANCE");
            card.put("typeLabel", "Bảo hành & Bảo trì");
            card.put("typeColor", "amber");
            card.put("referenceCode", "#BH-" + String.format("%02d", i + 1));
            card.put("orderCode", "#CLM-" + String.format("%02d", i + 1));
            card.put("status", status.toUpperCase());
            card.put("statusLabel", switch(status.toLowerCase()) {
                case "new", "assigned" -> "Mới giao";
                case "in_progress", "investigating" -> "Đang thực hiện";
                case "resolved", "completed" -> "Đã hoàn thành";
                default -> status;
            });
            card.put("scheduledAt", iso(start));
            card.put("estimatedEndTime", iso(end));
            card.put("timeSlot", timeSlot);
            card.put("customerName", custName);
            card.put("customerPhone", custPhone);
            card.put("shippingAddress", address);
            card.put("shortAddress", shortAddr);
            card.put("installationNote", c.get("description"));
            card.put("completionNote", c.get("internal_notes"));
            List<String> claimPhotos = List.of();
            if (c.get("images") != null && !c.get("images").toString().isBlank()) {
                try {
                    claimPhotos = json.readValue(c.get("images").toString(), new TypeReference<List<String>>(){});
                } catch(Exception ignored) {}
            }
            card.put("completionPhotos", claimPhotos);
            card.put("reworkNotes", null);
            card.put("completedAt", iso(c.get("resolved_at")));
            card.put("items", List.of());
            card.put("devices", List.of());
            card.put("version", 0);
            tasks.add(card);
        }

        var summary = new LinkedHashMap<String, Object>();
        summary.put("total", tasks.size());
        summary.put("pending", pendingCount);
        summary.put("inProgress", inProgressCount);
        summary.put("waitingConfirmation", waitingCount);
        summary.put("completed", completedCount);

        var res = new LinkedHashMap<String, Object>();
        res.put("date", targetDate.toString());
        res.put("summary", summary);
        res.put("tasks", tasks);
        return res;
    }
}
