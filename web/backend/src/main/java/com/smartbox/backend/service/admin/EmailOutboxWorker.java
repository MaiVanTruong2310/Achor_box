package com.smartbox.backend.service.admin;

import com.smartbox.backend.entity.MessageTemplate;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.repository.MessageTemplateRepository;
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

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
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

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private MessageTemplateRepository templateRepository;

    @Value("${smartbox.mail.enabled:false}")
    private boolean enabled;

    @Value("${smartbox.mail.sender-address:}")
    private String from;

    @Value("${smartbox.mail.sender-name:AnchorBox Vietnam}")
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

    private boolean dispatch(UUID id, UUID token, Map<String, Object> row) {
        try {
            JavaMailSender sender = senderProvider.getIfAvailable();
            if (sender == null || from.isBlank()) {
                throw new IllegalStateException("SMTP_SENDER_NOT_CONFIGURED");
            }
            var payload = outbox.payload(row);
            String template = Objects.toString(row.get("template"), "");
            String recipient = Objects.toString(row.get("recipient"), "");

            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from, senderName != null && !senderName.isBlank() ? senderName : "AnchorBox Vietnam");
            helper.setTo(recipient);

            if ("TEST_EMAIL_VERIFICATION".equalsIgnoreCase(template)) {
                String sub = payload.get("subject") != null ? payload.get("subject").toString() : "[AnchorBox Test] Kiểm thử hệ thống gửi Email";
                String body = payload.get("body") != null ? payload.get("body").toString() : (emailService != null ? emailService.buildTestEmailTemplate(recipient) : "AnchorBox Test Content");
                helper.setSubject(sub);
                helper.setText(body, true);
            } else if (template.startsWith("TEMPLATE_TEST:")) {
                String sub = payload.get("subject") != null ? payload.get("subject").toString() : "[AnchorBox Test] " + template;
                String body = payload.get("body") != null ? payload.get("body").toString() : "Nội dung kiểm thử mẫu thông báo AnchorBox";
                helper.setSubject(sub);
                helper.setText(body, true);
            } else {
                // Check if a dynamic template is configured in the database (message_templates table)
                Optional<MessageTemplate> optDbTemplate = (templateRepository != null)
                        ? templateRepository.findByCode(template)
                        : Optional.empty();

                if (optDbTemplate.isPresent()
                        && Boolean.TRUE.equals(optDbTemplate.get().getIsActive())
                        && optDbTemplate.get().getBody() != null
                        && !optDbTemplate.get().getBody().isBlank()) {
                    MessageTemplate dbTemplate = optDbTemplate.get();
                    String subjectPattern = (dbTemplate.getSubject() != null && !dbTemplate.getSubject().isBlank())
                            ? dbTemplate.getSubject()
                            : "📦 [AnchorBox] " + title(template) + " #" + Objects.toString(payload.get("orderId"), "");
                    String renderedSubject = renderDynamicText(subjectPattern, payload);
                    String renderedBody = renderDynamicText(dbTemplate.getBody(), payload);
                    helper.setSubject(renderedSubject);
                    helper.setText(renderedBody, true);
                    log.info("[EMAIL OUTBOX] Đã gửi email sử dụng mẫu động CSDL cho mã: '{}' tới: '{}'", template, recipient);
                } else {
                    // Fallback to Thymeleaf template if DB template is not present or inactive
                    var context = new Context(Locale.forLanguageTag("vi-VN"));
                    String title = title(template);
                    context.setVariables(payload);
                    context.setVariable("title", title);
                    NumberFormat currency = NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN"));
                    currency.setMaximumFractionDigits(0);
                    if (payload.get("total") != null) {
                        try {
                            context.setVariable("totalFormatted", currency.format(new BigDecimal(payload.get("total").toString())) + " ₫");
                        } catch (Exception ignored) {
                            context.setVariable("totalFormatted", payload.get("total").toString());
                        }
                    }
                    if (payload.get("time") != null) {
                        try {
                            context.setVariable("timeFormatted", OffsetDateTime.parse(payload.get("time").toString()).atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh")).format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
                        } catch (Exception ignored) {
                            context.setVariable("timeFormatted", payload.get("time").toString());
                        }
                    }
                    context.setVariable("orderUrl", (shopUrl == null || shopUrl.isBlank()) ? null : shopUrl + "/account/orders/" + payload.get("orderId"));
                    helper.setSubject("[AnchorBox] " + title + " #" + Objects.toString(payload.get("orderId"), ""));
                    helper.setText(templates.process("mail/order-notification", context), true);
                    log.info("[EMAIL OUTBOX] Đã gửi email sử dụng mẫu mặc định Thymeleaf cho mã: '{}' tới: '{}'", template, recipient);
                }
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

    private String renderDynamicText(String pattern, Map<String, Object> payload) {
        if (pattern == null || pattern.isBlank()) {
            return "";
        }

        // Format total / currency
        NumberFormat currency = NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN"));
        currency.setMaximumFractionDigits(0);
        String totalFormatted = "0 ₫";
        if (payload.get("total") != null) {
            try {
                totalFormatted = currency.format(new BigDecimal(payload.get("total").toString())) + " ₫";
            } catch (Exception ignored) {
                totalFormatted = payload.get("total").toString();
            }
        }

        // Format time
        String timeFormatted = "";
        if (payload.get("time") != null) {
            try {
                timeFormatted = OffsetDateTime.parse(payload.get("time").toString())
                        .atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh"))
                        .format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
            } catch (Exception ignored) {
                timeFormatted = payload.get("time").toString();
            }
        }

        String orderIdStr = Objects.toString(payload.get("orderId"), Objects.toString(payload.get("order_id"), ""));
        String shortId = orderIdStr.length() > 8 ? orderIdStr.substring(0, 8).toUpperCase() : orderIdStr;
        String orderUrl = (shopUrl == null || shopUrl.isBlank())
                ? "https://anchorbox.vn/account/orders/" + orderIdStr
                : shopUrl + "/account/orders/" + orderIdStr;

        String customerName = Objects.toString(payload.get("name"),
                Objects.toString(payload.get("customer_name"), "Quý khách"));

        String address = Objects.toString(payload.get("shipping_address"),
                Objects.toString(payload.get("shippingAddress"), "Tại địa chỉ đăng ký tài khoản"));

        String reason = Objects.toString(payload.get("reason"),
                Objects.toString(payload.get("cancel_reason"), "Theo quy định hệ thống"));

        // Build substitution map
        Map<String, String> replacements = new LinkedHashMap<>();
        replacements.put("customer_name", customerName);
        replacements.put("name", customerName);
        replacements.put("order_id", orderIdStr);
        replacements.put("orderId", orderIdStr);
        replacements.put("total_amount", totalFormatted);
        replacements.put("totalFormatted", totalFormatted);
        replacements.put("total", totalFormatted);
        replacements.put("time_formatted", timeFormatted);
        replacements.put("timeFormatted", timeFormatted);
        replacements.put("order_date", timeFormatted);
        replacements.put("shipping_address", address);
        replacements.put("shippingAddress", address);
        replacements.put("payment_method", Objects.toString(payload.get("paymentMethod"), Objects.toString(payload.get("payment_method"), "VNPay / Chuyển khoản")));
        replacements.put("order_url", orderUrl);
        replacements.put("orderUrl", orderUrl);
        replacements.put("hotline", "1900 8888");
        replacements.put("support_email", "support@anchorbox.vn");

        // Logistics & Technical variables
        replacements.put("technician_name", Objects.toString(payload.get("technician_name"), "Kỹ thuật viên AnchorBox"));
        replacements.put("technician_phone", Objects.toString(payload.get("technician_phone"), "1900 8888"));
        replacements.put("scheduled_time", Objects.toString(payload.get("scheduled_time"), "Trong vòng 24h - 48h tới"));
        replacements.put("shipping_carrier", Objects.toString(payload.get("shipping_carrier"), "Giao Hàng Tiết Kiệm (GHTK)"));
        replacements.put("tracking_number", Objects.toString(payload.get("tracking_number"), "VN" + shortId));
        replacements.put("estimated_delivery", Objects.toString(payload.get("estimated_delivery"), "1 - 3 ngày làm việc"));
        replacements.put("device_name", Objects.toString(payload.get("device_name"), "Hộp Giao Nhận AnchorBox"));
        replacements.put("serial_number", Objects.toString(payload.get("serial_number"), "BOX-" + shortId));
        replacements.put("acceptance_date", Objects.toString(payload.get("acceptance_date"), timeFormatted));
        replacements.put("warranty_months", Objects.toString(payload.get("warranty_months"), "12"));
        replacements.put("warranty_period", Objects.toString(payload.get("warranty_period"), "12 tháng chính hãng"));
        replacements.put("reason", reason);
        replacements.put("cancel_reason", reason);
        replacements.put("return_reason", reason);
        replacements.put("solution", Objects.toString(payload.get("solution"), "Vui lòng cập nhật thông tin trên ứng dụng hoặc liên hệ tổng đài"));
        replacements.put("otp_code", Objects.toString(payload.get("otp_code"), ""));
        replacements.put("expire_minutes", Objects.toString(payload.get("expire_minutes"), "5"));

        // Direct payload entries
        for (Map.Entry<String, Object> e : payload.entrySet()) {
            if (e.getValue() != null && !(e.getValue() instanceof List || e.getValue() instanceof Map)) {
                replacements.putIfAbsent(e.getKey(), e.getValue().toString());
            }
        }

        String result = pattern;
        for (Map.Entry<String, String> entry : replacements.entrySet()) {
            result = result.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }

        return result;
    }

    private String title(String template) {
        return switch (template) {
            case "ORDER_PAID" -> "Xác nhận thanh toán";
            case "ORDER_CONFIRMED" -> "Đơn hàng đã được xác nhận";
            case "ORDER_AWAITING_PAYMENT", "ORDER_APPROVED_AWAITING_PAYMENT" -> "Đơn hàng chờ thanh toán";
            case "TICKET_RETURNED" -> "Yêu cầu bổ sung thông tin đơn hàng";
            case "TICKET_REJECTED", "ORDER_REJECTED" -> "Đơn hàng bị từ chối";
            case "TICKET_RESUBMITTED" -> "Đã tiếp nhận giải trình";
            case "ORDER_CANCELLED" -> "Đơn hàng đã hủy";
            case "ORDER_REFUNDED" -> "Xác nhận hoàn tiền";
            case "ORDER_SHIPPED" -> "Đơn hàng đang được giao";
            case "ORDER_DELIVERED" -> "Đơn hàng đã giao thành công";
            case "ORDER_COMPLETED" -> "Đơn hàng đã hoàn tất";
            case "INSTALLATION_SCHEDULED" -> "Lịch giao và lắp đặt AnchorBox";
            case "DEVICE_DELIVERED" -> "Thiết bị đã giao, đang lắp đặt";
            case "INSTALLATION_DELAYED" -> "Điều chỉnh lịch giao và lắp đặt";
            case "INSTALLATION_COMPLETED" -> "AnchorBox đã được lắp đặt và nghiệm thu";
            default -> "Cập nhật đơn hàng";
        };
    }
}
