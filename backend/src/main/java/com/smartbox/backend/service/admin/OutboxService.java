package com.smartbox.backend.service.admin;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.exception.ResourceNotFoundException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;

@Service
@RequiredArgsConstructor
public class OutboxService {

    private final CommerceRepository db;
    private final ObjectMapper json;
    private final CurrentActor actors;

    /** Must join the caller's business transaction, never SMTP here. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void enqueue(String template, UUID orderId, String eventKey, String reason) {
        var order = db.one("SELECT o.*,p.email,p.full_name FROM public.orders o JOIN public.profiles p ON p.id=o.user_id WHERE o.id=?", orderId);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("orderId", orderId.toString());
        payload.put("name", order.get("full_name"));
        payload.put("total", order.get("total"));
        payload.put("status", order.get("status"));
        payload.put("reason", reason);
        payload.put("time", now().toString());
        payload.put("items", db.list("SELECT product_name_snapshot AS name,sku_snapshot AS sku,variant_name_snapshot AS variant,quantity,unit_price AS price,unit_price*quantity AS subtotal FROM public.order_items WHERE order_id=? ORDER BY variant_id", orderId));
        String recipient = Objects.toString(order.get("email"), "");
        boolean valid = recipient.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
        try {
            db.update("INSERT INTO public.email_outbox(id,template,reference_id,event_key,recipient,payload,status,next_attempt_at,last_error,created_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(event_key) DO NOTHING",
                    UUID.randomUUID(), template, orderId, eventKey, recipient, json.writeValueAsString(payload), valid ? "PENDING" : "FAILED", now(), valid ? null : "EMAIL_RECIPIENT_MISSING", now());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Cannot serialize email snapshot", ex);
        }
    }

    @Transactional
    public List<Map<String, Object>> claim(UUID token, int leaseSeconds) {
        var rows = db.list("SELECT * FROM public.email_outbox WHERE status='PENDING' AND next_attempt_at<=? AND (claimed_until IS NULL OR claimed_until<?) ORDER BY id LIMIT 50 FOR UPDATE SKIP LOCKED", now(), now());
        for (var row : rows) {
            db.update("UPDATE public.email_outbox SET claim_token=?,claimed_until=? WHERE id=?", token, now().plusSeconds(leaseSeconds), row.get("id"));
        }
        return rows;
    }

    @Transactional
    public void sent(UUID id, UUID token) {
        db.update("UPDATE public.email_outbox SET status='SENT',sent_at=?,claim_token=NULL,claimed_until=NULL WHERE id=? AND claim_token=?", now(), id, token);
    }

    @Transactional
    public void failed(UUID id, UUID token, String error, long backoffSeconds) {
        var rows = db.list("SELECT * FROM public.email_outbox WHERE id=? AND claim_token=? FOR UPDATE", id, token);
        if (rows.isEmpty()) return;
        int attempts = ((Number) rows.getFirst().get("attempts")).intValue() + 1;
        db.update("UPDATE public.email_outbox SET attempts=?,status=?,next_attempt_at=?,last_error=?,claim_token=NULL,claimed_until=NULL WHERE id=? AND claim_token=?",
                attempts, attempts >= 5 ? "FAILED" : "PENDING", now().plusSeconds(backoffSeconds * (1L << (attempts - 1))), error.substring(0, Math.min(error.length(), 1000)), id, token);
    }

    public Map<String, Object> payload(Map<String, Object> row) {
        try {
            return json.readValue(row.get("payload").toString(), new TypeReference<>() {});
        } catch (Exception ex) {
            throw new IllegalStateException("Invalid outbox payload", ex);
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(String status, int page, int size) {
        actors.get().requireRoles("super_admin", "product_manager");
        if (!Set.of("PENDING", "SENT", "FAILED").contains(status) || page < 0 || size < 1 || size > 100) {
            throw new BadRequestException("VALIDATION_ERROR");
        }
        return Map.of("content", db.list("SELECT id,template,reference_id,recipient,status,attempts,last_error,next_attempt_at,created_at,sent_at FROM public.email_outbox WHERE status=? ORDER BY created_at DESC LIMIT ? OFFSET ?", status, size, (long) page * size),
                "page", page, "size", size, "totalElements", db.one("SELECT count(*) AS total FROM public.email_outbox WHERE status=?", status).get("total"));
    }

    @Transactional
    public Map<String, Object> resend(UUID id) {
        actors.get().requireRoles("super_admin", "product_manager");
        var list = db.list("SELECT * FROM public.email_outbox WHERE id=? AND status='FAILED'", id);
        if (list.isEmpty()) {
            throw new ConflictException("EMAIL_NOT_RESENDABLE");
        }
        var row = list.getFirst();
        String recipient = Objects.toString(row.get("recipient"), "");
        String template = Objects.toString(row.get("template"), "");

        db.update("UPDATE public.email_outbox SET status='PENDING',attempts=0,next_attempt_at=?,last_error=NULL,claimed_until=NULL,claim_token=NULL WHERE id=?", now(), id);

        // Run resend in background asynchronously
        CompletableFuture.runAsync(() -> {
            boolean sent = false;
            String error = null;
            try {
                if ("TEST_EMAIL_VERIFICATION".equalsIgnoreCase(template) || template.startsWith("TEMPLATE_TEST:")) {
                    var payload = payload(row);
                    String sub = Objects.toString(payload.get("subject"), "📧 [SmartBox Test] Gửi lại kiểm thử");
                    String b = Objects.toString(payload.get("body"), "");
                    if (b.isBlank()) {
                        b = emailService != null ? emailService.buildTestEmailTemplate(recipient) : "SmartBox Email SMTP Test Content";
                    }
                    if (emailService != null) {
                        sent = emailService.sendHtmlEmail(recipient, sub, b);
                        if (!sent) {
                            error = "SMTP_SEND_FAILED: Kiểm tra tài khoản mail server hoặc mạng kết nối.";
                        }
                    } else {
                        error = "EMAIL_SERVICE_NOT_INITIALIZED";
                    }
                    if (sent) {
                        db.update("UPDATE public.email_outbox SET status='SENT',sent_at=?,attempts=attempts+1,last_error=NULL WHERE id=?", now(), id);
                    } else {
                        String errStr = error != null ? error.substring(0, Math.min(error.length(), 1000)) : "UNKNOWN_SMTP_ERROR";
                        db.update("UPDATE public.email_outbox SET status='FAILED',attempts=attempts+1,last_error=? WHERE id=?", errStr, id);
                    }
                } else if (outboxWorker != null) {
                    outboxWorker.processSingle(id);
                }
            } catch (Exception ex) {
                String errStr = ex.getMessage() != null ? ex.getMessage().substring(0, Math.min(ex.getMessage().length(), 1000)) : "RESEND_ERROR";
                db.update("UPDATE public.email_outbox SET status='FAILED',attempts=attempts+1,last_error=? WHERE id=?", errStr, id);
            }
        });

        return Map.of(
                "queued", true,
                "id", id.toString(),
                "recipient", recipient,
                "message", "Email đã được đưa vào hàng đợi gửi lại trong nền."
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStatus(UUID id) {
        actors.get().requireRoles("super_admin", "product_manager");
        var rows = db.list("SELECT id, template, recipient, status, attempts, last_error, created_at, sent_at, next_attempt_at FROM public.email_outbox WHERE id=?", id);
        if (rows.isEmpty()) {
            throw new ResourceNotFoundException("Email outbox", "id", id);
        }
        var row = rows.getFirst();
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", row.get("id").toString());
        res.put("template", Objects.toString(row.get("template"), ""));
        res.put("recipient", Objects.toString(row.get("recipient"), ""));
        res.put("status", Objects.toString(row.get("status"), "PENDING"));
        res.put("attempts", row.get("attempts") != null ? ((Number) row.get("attempts")).intValue() : 0);
        res.put("lastError", Objects.toString(row.get("last_error"), ""));
        res.put("sentAt", Objects.toString(row.get("sent_at"), ""));
        res.put("createdAt", Objects.toString(row.get("created_at"), ""));
        return res;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private EmailService emailService;

    @org.springframework.context.annotation.Lazy
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private EmailOutboxWorker outboxWorker;

    public UUID sendCustomAsync(String templateCode, String recipient, String subject, String body) {
        UUID id = UUID.randomUUID();
        Map<String, Object> payloadMap = new LinkedHashMap<>();
        payloadMap.put("recipient", recipient);
        payloadMap.put("subject", subject);
        payloadMap.put("body", body);
        payloadMap.put("templateCode", templateCode);
        payloadMap.put("type", "CUSTOM_ASYNC");
        payloadMap.put("time", now().toString());

        String payloadJson = "{}";
        try {
            payloadJson = json.writeValueAsString(payloadMap);
        } catch (Exception ignored) {}

        db.update("INSERT INTO public.email_outbox(id,template,reference_id,event_key,recipient,payload,status,attempts,next_attempt_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
                id, templateCode, id, "custom-email:" + id, recipient,
                payloadJson, "PENDING", 0, now(), now());

        CompletableFuture.runAsync(() -> {
            boolean sent = false;
            String error = null;
            try {
                if (emailService != null) {
                    sent = emailService.sendHtmlEmail(recipient, subject, body);
                    if (!sent) {
                        error = "SMTP_SEND_FAILED: Kiểm tra tài khoản mail server hoặc mạng kết nối.";
                    }
                } else {
                    error = "EMAIL_SERVICE_NOT_INITIALIZED";
                }
            } catch (Exception ex) {
                error = ex.getMessage();
            }

            if (sent) {
                db.update("UPDATE public.email_outbox SET status='SENT',sent_at=?,attempts=attempts+1,last_error=NULL WHERE id=?", now(), id);
            } else {
                String errStr = error != null ? error.substring(0, Math.min(error.length(), 1000)) : "UNKNOWN_SMTP_ERROR";
                db.update("UPDATE public.email_outbox SET status='FAILED',attempts=attempts+1,last_error=? WHERE id=?", errStr, id);
            }
        });

        return id;
    }

    public Map<String, Object> sendTest(String toEmail, String subject, String body) {
        actors.get().requireRoles("super_admin", "product_manager");
        String recipient = (toEmail != null && !toEmail.isBlank()) ? toEmail.trim() : "hoangquangdat2005@gmail.com";
        String mailSubject = (subject != null && !subject.isBlank()) ? subject.trim() : "📧 [SmartBox Test] Kiểm thử hệ thống gửi Email giao dịch";
        String mailBody = (body != null && !body.isBlank()) ? body.trim() : (emailService != null ? emailService.buildTestEmailTemplate(recipient) : "SmartBox Email SMTP Test Content");

        UUID id = sendCustomAsync("TEST_EMAIL_VERIFICATION", recipient, mailSubject, mailBody);

        return Map.of(
                "success", true,
                "queued", true,
                "id", id.toString(),
                "recipient", recipient,
                "subject", mailSubject,
                "message", "Yêu cầu gửi email kiểm thử đã được tiếp nhận và đang xử lý trong nền..."
        );
    }
}

