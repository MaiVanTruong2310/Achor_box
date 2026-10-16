package com.smartbox.backend.service.auth;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.dto.request.customer.CustomerRequests;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;

@Service
@RequiredArgsConstructor
public class CustomerAccountService {

    private final CommerceRepository db;
    private final CurrentActor actors;
    private final ObjectMapper json;

    private UUID customer() {
        actors.get().requireRoles("customer");
        return actors.get().id();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> profile() {
        return profileView(db.one("SELECT * FROM public.profiles WHERE id=?", customer()));
    }

    private Map<String, Object> profileView(Map<String, Object> row) {
        var result = new LinkedHashMap<String, Object>();
        result.put("id", row.get("id").toString());
        result.put("email", row.get("email"));
        result.put("fullName", row.get("full_name"));
        result.put("phone", row.get("phone"));
        result.put("createdAt", row.get("created_at"));
        return result;
    }

    @Transactional
    public Map<String, Object> updateProfile(CustomerRequests.ProfileUpdate request) {
        UUID owner = customer();
        db.update("UPDATE public.profiles SET full_name=?,phone=?,updated_at=? WHERE id=?", request.fullName().trim(), request.phone(), now(), owner);
        return profile(); // Never accept role, email, lock state or user ID from the client.
    }

    private void ownerLock(UUID owner) {
        db.one("SELECT id FROM public.profiles WHERE id=? FOR UPDATE", owner);
    }

    private Map<String, Object> address(UUID owner, UUID id) {
        return db.one("SELECT * FROM public.customer_addresses WHERE id=? AND customer_id=?", id, owner);
    }

    private Map<String, Object> addressView(Map<String, Object> row) {
        var result = new LinkedHashMap<String, Object>();
        result.put("id", row.get("id").toString());
        result.put("label", row.get("label"));
        result.put("recipientName", row.get("recipient_name"));
        result.put("phone", row.get("phone"));
        result.put("addressLine", row.get("address_line"));
        result.put("installationNote", row.get("installation_note"));
        result.put("isDefault", row.get("is_default"));
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> addresses() {
        return db.list("SELECT * FROM public.customer_addresses WHERE customer_id=? ORDER BY is_default DESC,created_at,id", customer()).stream().map(this::addressView).toList();
    }

    @Transactional
    public Map<String, Object> saveAddress(UUID id, CustomerRequests.Address request) {
        UUID owner = customer();
        ownerLock(owner);
        if (id != null) {
            address(owner, id);
        }
        long count = ((Number) db.one("SELECT count(*) AS n FROM public.customer_addresses WHERE customer_id=?", owner).get("n")).longValue();
        if (id == null && count >= 20) {
            throw new ConflictException("ADDRESS_LIMIT_REACHED");
        }
        boolean makeDefault = request.isDefault() || count == 0;
        // Updating the current default without selecting another keeps one default.
        if (id != null && Boolean.TRUE.equals(address(owner, id).get("is_default"))) {
            makeDefault = true;
        }
        if (makeDefault) {
            db.update("UPDATE public.customer_addresses SET is_default=false WHERE customer_id=? AND is_default=true", owner);
        }
        UUID target = id == null ? UUID.randomUUID() : id;
        if (id == null) {
            db.update("INSERT INTO public.customer_addresses(id,customer_id,label,recipient_name,phone,address_line,installation_note,is_default) VALUES(?,?,?,?,?,?,?,?)",
                    target, owner, request.label().trim(), request.recipientName().trim(), request.phone().trim(), request.addressLine().trim(), request.installationNote(), makeDefault);
        } else {
            db.update("UPDATE public.customer_addresses SET label=?,recipient_name=?,phone=?,address_line=?,installation_note=?,is_default=?,updated_at=? WHERE id=? AND customer_id=?",
                    request.label().trim(), request.recipientName().trim(), request.phone().trim(), request.addressLine().trim(), request.installationNote(), makeDefault, now(), target, owner);
        }
        return addressView(address(owner, target));
    }

    @Transactional
    public void deleteAddress(UUID id) {
        UUID owner = customer();
        ownerLock(owner);
        boolean wasDefault = Boolean.TRUE.equals(address(owner, id).get("is_default"));
        db.update("DELETE FROM public.customer_addresses WHERE id=? AND customer_id=?", id, owner);
        if (wasDefault) {
            var remaining = db.list("SELECT id FROM public.customer_addresses WHERE customer_id=? ORDER BY created_at,id LIMIT 1", owner);
            if (!remaining.isEmpty()) {
                db.update("UPDATE public.customer_addresses SET is_default=true,updated_at=? WHERE id=?", now(), remaining.getFirst().get("id"));
            }
        }
    }

    /** Called inside the order transaction. Copy all delivery contact data, never keep a live address join. */
    public Map<String, Object> snapshot(UUID owner, UUID addressId, CustomerRequests.Address details, String legacy) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (addressId != null) {
            if (details != null || (legacy != null && !legacy.isBlank())) {
                throw new BadRequestException("CHOOSE_ONE_ADDRESS_SOURCE");
            }
            result.putAll(addressView(address(owner, addressId)));
        } else if (details != null) {
            if (legacy != null && !legacy.isBlank()) {
                throw new BadRequestException("CHOOSE_ONE_ADDRESS_SOURCE");
            }
            result.put("recipientName", details.recipientName().trim());
            result.put("phone", details.phone().trim());
            result.put("addressLine", details.addressLine().trim());
            result.put("installationNote", details.installationNote());
        } else {
            if (legacy == null || legacy.isBlank() || legacy.length() > 2000) {
                throw new BadRequestException("SHIPPING_ADDRESS_REQUIRED");
            }
            var profile = db.one("SELECT full_name,phone FROM public.profiles WHERE id=?", owner);
            result.put("recipientName", profile.get("full_name"));
            result.put("phone", profile.get("phone"));
            result.put("addressLine", legacy.trim());
            result.put("installationNote", null);
        }
        result.remove("isDefault");
        result.remove("label");
        result.remove("id");
        result.put("email", db.one("SELECT email FROM public.profiles WHERE id=?", owner).get("email"));
        return result;
    }

    public String serialize(Map<String, Object> value) {
        try {
            return json.writeValueAsString(value);
        } catch (Exception ex) {
            throw new IllegalStateException("ADDRESS_SNAPSHOT_FAILED", ex);
        }
    }

    public Map<String, Object> readSnapshot(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return json.readValue(value.toString(), new TypeReference<>() {});
        } catch (Exception ex) {
            throw new IllegalStateException("INVALID_ADDRESS_SNAPSHOT", ex);
        }
    }
}
