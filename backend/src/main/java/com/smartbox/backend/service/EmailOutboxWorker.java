package com.smartbox.backend.service;

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
import java.text.NumberFormat;
import java.time.ZoneId;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import static com.smartbox.backend.service.OrderWorkflowService.uuid;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name="smartbox.jobs.enabled",havingValue="true")
public class EmailOutboxWorker {
    private final OutboxService outbox;
    private final ObjectProvider<JavaMailSender> senderProvider;
    private final TemplateEngine templates;
    @Value("${smartbox.mail.enabled:false}") private boolean enabled;
    @Value("${smartbox.mail.sender-address:}") private String from;
    @Value("${smartbox.mail.sender-name:SmartBox}") private String senderName;
    @Value("${smartbox.mail.backoff-seconds:60}") private long backoff;
    @Value("${smartbox.mail.claim-seconds:1800}") private int lease;
    @Value("${smartbox.shop-url:}") private String shopUrl;

    @Scheduled(fixedDelayString="${smartbox.mail.worker-delay-ms:10000}")
    public void run() {
        if(!enabled) return;
        UUID token=UUID.randomUUID();
        for(var row:outbox.claim(token,lease)) {
            UUID id=uuid(row.get("id"));
            try {
                JavaMailSender sender=senderProvider.getIfAvailable();
                if(sender==null || from.isBlank()) throw new IllegalStateException("SMTP_SENDER_NOT_CONFIGURED");
                var payload=outbox.payload(row); var context=new Context(Locale.forLanguageTag("vi-VN"));
                String template=row.get("template").toString();
                String title=title(template);
                context.setVariables(payload); context.setVariable("title",title);
                NumberFormat currency=NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN"));
                currency.setMaximumFractionDigits(0);
                context.setVariable("totalFormatted",currency.format(new java.math.BigDecimal(payload.get("total").toString()))+" ₫");
                context.setVariable("timeFormatted",OffsetDateTime.parse(payload.get("time").toString()).atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh")).format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
                context.setVariable("orderUrl",shopUrl.isBlank()?null:shopUrl+"/account/orders/"+payload.get("orderId"));
                MimeMessage message=sender.createMimeMessage();
                MimeMessageHelper helper=new MimeMessageHelper(message,false,"UTF-8");
                helper.setFrom(from,senderName);helper.setTo(row.get("recipient").toString());
                helper.setSubject("[SmartBox] "+title+" #"+payload.get("orderId"));
                helper.setText(templates.process("mail/order-notification",context),true);
                // No business or claim transaction is held while SMTP runs.
                sender.send(message);outbox.sent(id,token);
            } catch(Exception ex) {
                log.warn("Email outbox {} attempt failed ({})",id,ex.getClass().getSimpleName());
                outbox.failed(id,token,"SMTP_DELIVERY_FAILED: "+ex.getClass().getSimpleName(),backoff);
            }
        }
    }
    private String title(String template) {
        return switch(template) {
            case "ORDER_PAID" -> "Xác nhận thanh toán";
            case "ORDER_CONFIRMED" -> "Đơn hàng đã được phê duyệt";
            case "TICKET_RETURNED" -> "Yêu cầu bổ sung thông tin đơn hàng";
            case "TICKET_REJECTED" -> "Đơn hàng bị từ chối";
            case "TICKET_RESUBMITTED" -> "Đã tiếp nhận giải trình";
            case "ORDER_CANCELLED" -> "Đơn hàng đã hủy";
            case "ORDER_REFUNDED" -> "Xác nhận hoàn tiền";
            case "ORDER_SHIPPED" -> "Đơn hàng đang được giao";
            case "ORDER_DELIVERED" -> "Đơn hàng đã giao thành công";
            default -> "Cập nhật đơn hàng";
        };
    }
}
