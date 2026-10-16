package com.smartbox.backend.service.warranty;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.common.AdminSearch;
import com.smartbox.backend.common.PaginationUtil;
import com.smartbox.backend.dto.request.warranty.CustomerClaimRequest;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.security.MessageDigest;
import java.sql.Date;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;

@Service
@RequiredArgsConstructor
public class CustomerWarrantyClaimService {

    private final CommerceRepository db;
    private final CurrentActor actors;
    private final ClaimImageStorage storage;
    private final ObjectMapper json;

    private Map<String, Object> warranty(UUID id, UUID owner, boolean lock) {
        return db.one("SELECT w.* FROM public.warranties w JOIN public.devices d ON d.id=w.device_id WHERE w.id=? AND d.owner_id=?" + (lock ? " FOR UPDATE OF w" : ""), id, owner);
    }

    private void eligible(Map<String, Object> w) {
        var today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDate start = date(w.get("start_date"));
        LocalDate end = date(w.get("end_date"));
        if (!"active".equals(w.get("status")) || today.isBefore(start) || today.isAfter(end)) {
            throw new ConflictException("WARRANTY_NOT_ACTIVE");
        }
    }

    private LocalDate date(Object value) {
        return value instanceof Date d ? d.toLocalDate() : LocalDate.parse(value.toString());
    }

    @Transactional
    public Map<String, Object> upload(UUID warranty, MultipartFile file) {
        var actor = actors.get();
        actor.requireRoles("customer");
        // Serialize the per-warranty quota before making a bounded external upload.
        eligible(warranty(warranty, actor.id(), true));
        long pending = ((Number) db.one("SELECT count(*) AS n FROM public.warranty_claim_images WHERE owner_id=? AND warranty_id=? AND claim_id IS NULL", actor.id(), warranty).get("n")).longValue();
        if (pending >= 20) {
            throw new ConflictException("PENDING_IMAGE_LIMIT");
        }
        var image = storage.upload(file);
        UUID id = UUID.randomUUID();
        db.update("INSERT INTO public.warranty_claim_images(id,owner_id,warranty_id,public_id,secure_url,created_at) VALUES(?,?,?,?,?,?)", id, actor.id(), warranty, image.publicId(), image.secureUrl(), now());
        return Map.of("id", id, "url", image.secureUrl());
    }

    @Transactional
    public Map<String, Object> create(CustomerClaimRequest request, UUID key) {
        var actor = actors.get();
        actor.requireRoles("customer");
        if (key == null || request.warrantyId() == null || request.description() == null
                || request.description().trim().length() < 10 || request.description().length() > 5000
                || request.imageIds() == null || request.imageIds().size() > 5
                || request.imageIds().stream().anyMatch(Objects::isNull)
                || new HashSet<>(request.imageIds()).size() != request.imageIds().size()) {
            throw new BadRequestException("INVALID_CLAIM");
        }
        // Profile lock serializes idempotency across different warranties for the same customer.
        db.one("SELECT id FROM public.profiles WHERE id=? FOR UPDATE", actor.id());
        String hash;
        try {
            hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(List.of(request.warrantyId(), request.description().trim(), request.imageIds().stream().sorted().toList()))));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
        var existing = db.list("SELECT id,request_hash FROM public.warranty_claims WHERE customer_id=? AND request_key=?", actor.id(), key);
        if (!existing.isEmpty()) {
            if (!hash.equals(existing.getFirst().get("request_hash"))) {
                throw new ConflictException("IDEMPOTENCY_KEY_REUSED");
            }
            return detail(UUID.fromString(existing.getFirst().get("id").toString()));
        }
        eligible(warranty(request.warrantyId(), actor.id(), true));
        var urls = new ArrayList<String>();
        for (UUID image : request.imageIds().stream().sorted().toList()) {
            var row = db.one("SELECT secure_url,claim_id,created_at FROM public.warranty_claim_images WHERE id=? AND owner_id=? AND warranty_id=? FOR UPDATE", image, actor.id(), request.warrantyId());
            if (row.get("claim_id") != null) {
                throw new ConflictException("IMAGE_ALREADY_ATTACHED");
            }
            urls.add(row.get("secure_url").toString());
        }
        UUID id = UUID.randomUUID();
        String images;
        try {
            images = json.writeValueAsString(urls);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
        db.update("INSERT INTO public.warranty_claims(id,warranty_id,customer_id,description,images,status,created_at,request_key,request_hash) VALUES(?,?,?,?,CAST(? AS jsonb),CAST('new' AS public.claim_status),?,?,?)",
                id, request.warrantyId(), actor.id(), request.description().trim(), images, now(), key, hash);
        for (UUID image : request.imageIds()) {
            db.update("UPDATE public.warranty_claim_images SET claim_id=? WHERE id=?", id, image);
        }
        db.audit(actor.id(), "WARRANTY_CLAIM_CREATED", "warranty_claims", id, "Customer submitted claim");
        return detail(id);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detail(UUID id) {
        var actor = actors.get();
        actor.requireRoles("customer");
        var row = db.one("SELECT c.id,c.warranty_id AS \"warrantyId\",c.description,c.status,c.created_at AS \"createdAt\",c.resolved_at AS \"resolvedAt\",d.serial_number AS \"serialNumber\" FROM public.warranty_claims c JOIN public.warranties w ON w.id=c.warranty_id JOIN public.devices d ON d.id=w.device_id WHERE c.id=? AND c.customer_id=?", id, actor.id());
        row.put("images", db.list("SELECT secure_url FROM public.warranty_claim_images WHERE claim_id=? ORDER BY id", id).stream().map(r -> r.get("secure_url")).toList());
        return row;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Map<String, Object> list(int page, int size) {
        actors.get().requireRoles("customer");
        AdminSearch.page(page, size);
        UUID owner = actors.get().id();
        long count = ((Number) db.one("SELECT count(*) AS n FROM public.warranty_claims WHERE customer_id=?", owner).get("n")).longValue();
        var rows = db.list("SELECT id FROM public.warranty_claims WHERE customer_id=? ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?", owner, size, (long) page * size);
        return PaginationUtil.toMap(rows.stream().map(r -> detail(UUID.fromString(r.get("id").toString()))).toList(), page, size, count);
    }
}
