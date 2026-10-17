package com.smartbox.backend.service.admin;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import com.smartbox.backend.repository.CommerceRepository;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.uuid;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "smartbox.jobs.enabled", havingValue = "true")
public class EmailOutboxWorker {

    private final OutboxService outbox;
    private final ObjectProvider<JavaMailSender> senderProvider;
    private final TemplateEngine templates;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private CommerceRepository db;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private EmailService emailService;

    @Value("${smartbox.mail.enabled:false}")
    private boolean enabled;

    @Value("${smartbox.mail.sender-address:}")
    private String from;

    @Value("${smartbox.mail.sender-name:SmartBox}")
    private String senderName;

    @Value("${smartbox.mail.backoff-seconds:60}")
    private long backoff;

    @Value("${smartbox.mail.claim-seconds:1800}")
    private int lease;

    @Value("${smartbox.shop-url:}")
    private String shopUrl;

    @Scheduled(fixedDelayString = "${smartbox.mail.worker-delay-ms:10000}")
    public void run() {
        if (!enabled) return;
        UUID token = UUID.randomUUID();
        for (var row : outbox.claim(token, lease)) {
            UUID id = uuid(row.get("id"));
            dispatch(id, token, row);
        }
    }

    public boolean processSingle(UUID id) {
        if (db == null) return false;
        UUID token = UUID.randomUUID();
        var rows = db.list("SELECT * FROM public.email_outbox WHERE id=? AND status='PENDING' FOR UPDATE", id);
        if (rows.isEmpty()) return false;
        db.update("UPDATE public.email_outbox SET claim_token=?,claimed_until=? WHERE id=?", token, now().plusSeconds(lease), id);
        return dispatch(id, token, rows.getFirst());
    }

    private boolean dispatch(UUID id, UUID token, java.util.Map<String, Object> row) {
        try {
            JavaMailSender sender = senderProvider.getIfAvailable();
            if (sender == null || from.isBlank()) {
                throw new IllegalStateException("SMTP_SENDER_NOT_CONFIGURED");
            }
            var payload = outbox.payload(row);
            String template = java.util.Objects.toString(row.get("template"), "");
            String recipient = java.util.Objects.toString(row.get("recipient"), "");

            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from, senderName);
            helper.setTo(recipient);

            if ("TEST_EMAIL_VERIFICATION".equalsIgnoreCase(template)) {
                String sub = payload.get("subject") != null ? payload.get("subject").toString() : "[SmartBox Test] Kiểm thử hệ thống gửi Email";
                String body = payload.get("body") != null ? payload.get("body").toString() : (emailService != null ? emailService.buildTestEmailTemplate(recipient) : "SmartBox Test Content");
                helper.setSubject(sub);
                helper.setText(body, true);
            } else if (template.startsWith("TEMPLATE_TEST:") || payload.get("total") == null) {
                String sub = payload.get("subject") != null ? payload.get("subject").toString() : "[SmartBox] " + title(template);
                String body = payload.get("body") != null ? payload.get("body").toString() : "Nội dung thông báo SmartBox";
                helper.setSubject(sub);
                helper.setText(body, true);
            } else {
                var context = new Context(Locale.forLanguageTag("vi-VN"));
                String title = title(template);
                context.setVariables(payload);
                context.setVariable("title", title);
                NumberFormat currency = NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN"));
                currency.setMaximumFractionDigits(0);
                if (payload.get("total") != null) {
                    context.setVariable("totalFormatted", currency.format(new BigDecimal(payload.get("total").toString())) + " ₫");
                }
                if (payload.get("time") != null) {
                    try {
                        context.setVariable("timeFormatted", OffsetDateTime.parse(payload.get("time").toString()).atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh")).format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
                    } catch (Exception ignored) {
                        context.setVariable("timeFormatted", payload.get("time").toString());
                    }
                }
                context.setVariable("orderUrl", (shopUrl == null || shopUrl.isBlank()) ? null : shopUrl + "/account/orders/" + payload.get("orderId"));
                helper.setSubject("[SmartBox] " + title + " #" + java.util.Objects.toString(payload.get("orderId"), ""));
                helper.setText(templates.process("mail/order-notification", context), true);
            }

            // No business or claim transaction is held while SMTP runs.
            sender.send(message);
            outbox.sent(id, token);
            return true;
        } catch (Exception ex) {
            log.warn("Email outbox {} attempt failed ({}: {})", id, ex.getClass().getSimpleName(), ex.getMessage());
            outbox.failed(id, token, "SMTP_DELIVERY_FAILED: " + (ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName()), backoff);
            return false;
        }
    }

    private String title(String template) {
        return switch (template) {
            case "ORDER_PAID" -> "Xác nhận thanh toán";
            case "ORDER_CONFIRMED" -> "Đơn hàng đã được phê duyệt";
            case "TICKET_RETURNED" -> "Yêu cầu bổ sung thông tin đơn hàng";
            case "TICKET_REJECTED" -> "Đơn hàng bị từ chối";
            case "TICKET_RESUBMITTED" -> "Đã tiếp nhận giải trình";
            case "ORDER_CANCELLED" -> "Đơn hàng đã hủy";
            case "ORDER_REFUNDED" -> "Xác nhận hoàn tiền";
            case "ORDER_SHIPPED" -> "Đơn hàng đang được giao";
            case "ORDER_DELIVERED" -> "Đơn hàng đã giao thành công";
            case "INSTALLATION_SCHEDULED" -> "Lịch giao và lắp đặt SmartBox";
            case "DEVICE_DELIVERED" -> "Thiết bị đã giao, đang lắp đặt";
            case "INSTALLATION_DELAYED" -> "Điều chỉnh lịch giao và lắp đặt";
            case "INSTALLATION_COMPLETED" -> "SmartBox đã được lắp đặt và nghiệm thu";
            default -> "Cập nhật đơn hàng";
        };
    }
}
