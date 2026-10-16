package com.smartbox.backend.service.customer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.common.AdminSearch;
import com.smartbox.backend.dto.request.customer.CustomerDirectoryRequests;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.security.SupabaseAuthGateway;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.uuid;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerDirectoryService {

    private final CommerceRepository db;
    private final CurrentActor actors;
    private final SupabaseAuthGateway auth;

    private static final String VIEW = "SELECT c.id,c.profile_id AS \"profileId\",c.full_name AS \"fullName\",c.email,c.phone,c.address,c.notes,c.archived,c.created_at AS \"createdAt\",c.updated_at AS \"updatedAt\",p.username,p.is_locked AS \"isLocked\" FROM public.customers c LEFT JOIN public.profiles p ON p.id=c.profile_id";

    private void allowed() {
        actors.get().requireRoles("super_admin", "product_manager");
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String email(String value) {
        var text = clean(value);
        return text == null ? null : text.toLowerCase(Locale.ROOT);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(int page, int size, String search, String account, String state) {
        allowed();
        AdminSearch.page(page, size);
        String term = AdminSearch.term(search);
        if (!Set.of("all", "with", "without").contains(account) || !Set.of("active", "archived", "all").contains(state)) {
            throw new BadRequestException("INVALID_CUSTOMER_FILTER");
        }
        String where = " WHERE (?='all' OR (?='with' AND c.profile_id IS NOT NULL) OR (?='without' AND c.profile_id IS NULL)) AND (?='all' OR c.archived=?) AND (?='' OR lower(c.full_name) LIKE ? ESCAPE '\\' OR lower(COALESCE(c.email,'')) LIKE ? ESCAPE '\\' OR COALESCE(c.phone,'') LIKE ? ESCAPE '\\')";
        List<Object> params = new ArrayList<>(Arrays.asList(account, account, account, state, "archived".equals(state), term, AdminSearch.like(term), AdminSearch.like(term), AdminSearch.like(term)));
        long total = ((Number) db.one("SELECT count(*) AS n FROM public.customers c" + where, params.toArray()).get("n")).longValue();
        params.add(size);
        params.add((long) page * size);
        return Map.of("content", db.list(VIEW + where + " ORDER BY c.created_at DESC,c.id DESC LIMIT ? OFFSET ?", params.toArray()), "page", page, "size", size, "totalElements", total, "totalPages", (total + size - 1) / size);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detail(UUID id) {
        allowed();
        return db.one(VIEW + " WHERE c.id=?", id);
    }

    @Transactional
    public Map<String, Object> create(CustomerDirectoryRequests.Create request, String key) {
        allowed();
        UUID nonce;
        try {
            nonce = UUID.fromString(key);
        } catch (Exception ex) {
            throw new BadRequestException("CUSTOMER_CREATION_KEY_REQUIRED");
        }
        String username = clean(request.username());
        if (username != null) {
            username = username.toLowerCase(Locale.ROOT);
        }
        if (request.createLogin()) {
            actors.get().requireRoles("super_admin");
            if (email(request.email()) == null || username == null || request.password() == null || request.password().isBlank()) {
                throw new BadRequestException("LOGIN_EMAIL_USERNAME_PASSWORD_REQUIRED");
            }
        } else if (request.username() != null || request.password() != null) {
            throw new BadRequestException("LOGIN_FIELDS_REQUIRE_CREATE_LOGIN");
        }

        String fingerprint;
        try {
            fingerprint = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(new ObjectMapper().writeValueAsBytes(Arrays.asList(request.fullName().trim(), email(request.email()), clean(request.phone()), clean(request.address()), clean(request.notes()), request.createLogin(), username))));
        } catch (NoSuchAlgorithmException | JsonProcessingException ex) {
            throw new IllegalStateException(ex);
        }

        var existing = db.list("SELECT id,request_hash FROM public.customers WHERE creation_key=?", nonce);
        if (!existing.isEmpty()) {
            if (!fingerprint.equals(existing.getFirst().get("request_hash"))) {
                throw new ConflictException("CUSTOMER_KEY_REUSED_WITH_DIFFERENT_DATA");
            }
            return detail(uuid(existing.getFirst().get("id")));
        }
        if (request.createLogin()) {
            if (!db.list("SELECT id FROM public.profiles WHERE lower(email)=?", email(request.email())).isEmpty()) {
                throw new ConflictException("EMAIL_ALREADY_EXISTS");
            }
            if (!db.list("SELECT id FROM public.profiles WHERE username=?", username).isEmpty()) {
                throw new ConflictException("USERNAME_ALREADY_EXISTS");
            }
        }

        UUID id = UUID.randomUUID();
        try {
            db.update("INSERT INTO public.customers(id,full_name,email,phone,address,notes,creation_key,request_hash,created_by) VALUES(?,?,?,?,?,?,?,?,?)",
                    id, request.fullName().trim(), email(request.email()), clean(request.phone()), clean(request.address()), clean(request.notes()), nonce, fingerprint, actors.get().id());
            if (request.createLogin()) {
                UUID profile = auth.createCustomer(email(request.email()), request.password(), request.fullName().trim());
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        if (status == STATUS_ROLLED_BACK) {
                            try {
                                auth.deleteProvisionedUser(profile);
                            } catch (Exception ex) {
                                log.error("Customer auth compensation failed for {}", profile);
                            }
                        }
                    }
                });
                db.update("INSERT INTO public.profiles(id,full_name,email,phone,default_address,username,role,is_locked,is_2fa_enabled) VALUES(?,?,?,?,?,?,CAST('customer' AS public.user_role),false,false)",
                        profile, request.fullName().trim(), email(request.email()), clean(request.phone()), clean(request.address()), username);
                // Remove only the new trigger-generated contact and link this creation request's record.
                db.update("DELETE FROM public.customers WHERE id=? AND profile_id=?", profile, profile);
                db.update("UPDATE public.customers SET profile_id=?,updated_at=? WHERE id=?", profile, now(), id);
            }
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("CUSTOMER_ACCOUNT_CONFLICT: Email, username hoặc yêu cầu tạo đã được sử dụng");
        }
        db.audit(actors.get().id(), "CUSTOMER_CREATED", "customers", id, request.createLogin() ? "WITH_LOGIN" : "CONTACT_ONLY");
        return detail(id);
    }

    @Transactional
    public Map<String, Object> update(UUID id, CustomerDirectoryRequests.Update request) {
        allowed();
        var row = db.one("SELECT * FROM public.customers WHERE id=?", id);
        UUID profile = uuid(row.get("profile_id"));
        if (profile != null) {
            if (!Objects.equals(email(request.email()), email(Objects.toString(row.get("email"), null)))) {
                throw new ConflictException("ACCOUNT_EMAIL_CHANGE_REQUIRES_VERIFICATION");
            }
            db.update("UPDATE public.profiles SET full_name=?,phone=?,default_address=?,updated_at=? WHERE id=?",
                    request.fullName().trim(), clean(request.phone()), clean(request.address()), now(), profile);
        }
        db.update("UPDATE public.customers SET full_name=?,email=?,phone=?,address=?,notes=?,archived=?,updated_at=? WHERE id=?",
                request.fullName().trim(), email(request.email()), clean(request.phone()), clean(request.address()), clean(request.notes()), request.archived(), now(), id);
        db.audit(actors.get().id(), "CUSTOMER_UPDATED", "customers", id, request.archived() ? "ARCHIVED" : "CONTACT_UPDATED");
        return detail(id);
    }
}
