package com.smartbox.backend.service.device;

import com.smartbox.backend.exception.AppException;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.uuid;

@Service
@RequiredArgsConstructor
public class DeviceWorkflowService {

    private final CommerceRepository db;
    private final CurrentActor actors;
    private final ApplicationEventPublisher events;

    @Value("${smartbox.mqtt.enabled:false}")
    private boolean mqttEnabled;

    public record Registration(
            @NotBlank @Size(max = 100) String serialNumber,
            @NotNull UUID variantId,
            @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)+") String mqttTopicId,
            @Size(max = 100) String name
    ) {}

    public record Control(
            @NotNull @Pattern(regexp = "LOCK|UNLOCK|TARE") String command,
            @NotNull UUID requestKey
    ) {}

    public record CommandCreated(UUID id) {}

    @Transactional
    public Map<String, Object> register(Registration request) {
        actors.get().requireRoles("super_admin", "technician");
        var variant = db.one("SELECT * FROM public.product_variants WHERE id=? FOR UPDATE", request.variantId());
        UUID id = UUID.randomUUID();
        db.update("INSERT INTO public.devices(id,product_id,product_variant_id,serial_number,name,mqtt_topic_id) VALUES(?,?,?,?,?,?)",
                id, variant.get("product_id"), request.variantId(), request.serialNumber(), request.name(), request.mqttTopicId());
        return Map.of("deviceId", id, "serialNumber", request.serialNumber());
    }

    @Transactional
    public Map<String, Object> activate(UUID id) {
        var device = owned(id, true);
        if (device.get("sold_order_item_id") == null) {
            throw new ConflictException("DEVICE_SALE_NOT_LINKED");
        }
        var order = db.one("SELECT o.status FROM public.orders o JOIN public.order_items i ON i.order_id=o.id WHERE i.id=?", device.get("sold_order_item_id"));
        if (!"completed".equals(order.get("status"))) {
            throw new ConflictException("DEVICE_NOT_DELIVERED");
        }
        db.update("UPDATE public.devices SET activated_at=COALESCE(activated_at,?) WHERE id=?", now(), id);
        return Map.of("activated", true);
    }

    public Map<String, Object> owned(UUID id, boolean lock) {
        var device = db.one("SELECT * FROM public.devices WHERE id=?" + (lock ? " FOR UPDATE" : ""), id);
        actors.get().requireOwner(uuid(device.get("owner_id")));
        return device;
    }

    @Transactional
    public Map<String, Object> command(UUID id, Control control) {
        var device = owned(id, true);
        if (!mqttEnabled) {
            throw new AppException(503, "MQTT_NOT_CONFIGURED");
        }
        if (device.get("activated_at") == null) {
            throw new ConflictException("DEVICE_NOT_ACTIVATED");
        }
        if (device.get("mqtt_topic_id") == null || !"online".equals(device.get("status"))) {
            throw new ConflictException("DEVICE_OFFLINE");
        }
        if ("TARE".equals(control.command()) && !Boolean.TRUE.equals(db.one("SELECT COALESCE(v.has_weight_sensor,p.has_weight_sensor) AS has_weight_sensor FROM public.products p LEFT JOIN public.product_variants v ON v.id=? WHERE p.id=?", device.get("product_variant_id"), device.get("product_id")).get("has_weight_sensor"))) {
            throw new BadRequestException("WEIGHT_SENSOR_NOT_SUPPORTED");
        }
        UUID actor = actors.get().id();
        var existing = db.list("SELECT * FROM public.device_commands WHERE device_id=? AND requested_by=? AND request_key=?", id, actor, control.requestKey());
        if (!existing.isEmpty()) {
            if (!control.command().equals(existing.getFirst().get("command"))) {
                throw new ConflictException("COMMAND_KEY_REUSED");
            }
            return existing.getFirst();
        }
        long recent = ((Number) db.one("SELECT count(*) AS total FROM public.device_commands WHERE device_id=? AND created_at>?", id, now().minusMinutes(1)).get("total")).longValue();
        if (recent >= 20) {
            throw new AppException(429, "DEVICE_COMMAND_RATE_LIMITED");
        }
        UUID command = UUID.randomUUID();
        db.update("INSERT INTO public.device_commands(id,device_id,command,requested_by,status,request_key,expires_at,next_attempt_at) VALUES(?,?,?,?,'PENDING',?,?,?)",
                command, id, control.command(), actor, control.requestKey(), now().plusSeconds(10), now());
        events.publishEvent(new CommandCreated(command));
        db.audit(actor, "DEVICE_COMMAND_" + control.command(), "device_commands", command, id.toString());
        return Map.of("commandId", command, "status", "PENDING");
    }

    @Transactional(readOnly = true)
    public Map<String, Object> command(UUID id, UUID command) {
        owned(id, false);
        return db.one("SELECT id,status,attempts,last_error,ack_at FROM public.device_commands WHERE device_id=? AND id=?", id, command);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> myDevices() {
        return db.list("SELECT id,serial_number,name,status,door_status,lock_status,weight_kg,package_detected,last_seen_at,activated_at FROM public.devices WHERE owner_id=? ORDER BY created_at DESC", actors.get().id());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> packages(UUID id, int page, int size) {
        owned(id, false);
        page(page, size);
        return db.list("SELECT * FROM public.delivery_packages WHERE device_id=? ORDER BY detected_at DESC LIMIT ? OFFSET ?", id, size, (long) page * size);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> readings(UUID id, int page, int size) {
        owned(id, false);
        page(page, size);
        return db.list("SELECT * FROM public.sensor_readings WHERE device_id=? ORDER BY received_at DESC LIMIT ? OFFSET ?", id, size, (long) page * size);
    }

    private void page(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new BadRequestException("VALIDATION_ERROR");
        }
    }
}
