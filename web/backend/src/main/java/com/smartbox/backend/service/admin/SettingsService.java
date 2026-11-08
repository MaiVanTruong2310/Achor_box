package com.smartbox.backend.service.admin;

import com.smartbox.backend.config.TemplateDataSeeder;
import com.smartbox.backend.dto.request.admin.TemplateUpdateRequest;
import com.smartbox.backend.dto.request.admin.TestSendTemplateRequest;
import com.smartbox.backend.dto.response.admin.SystemSettingsResponse;
import com.smartbox.backend.dto.response.admin.TestSendResponse;
import com.smartbox.backend.entity.MessageTemplate;
import com.smartbox.backend.exception.ResourceNotFoundException;
import com.smartbox.backend.repository.MessageTemplateRepository;
import com.smartbox.backend.repository.PaymentMethodRepository;
import com.smartbox.backend.repository.ShippingMethodRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SettingsService {

    private final MessageTemplateRepository templateRepository;
    private final ShippingMethodRepository shippingRepository;
    private final PaymentMethodRepository paymentRepository;
    private final EmailService emailService;
    private final OutboxService outboxService;

    @Transactional(readOnly = true)
    public SystemSettingsResponse getSettings() {
        return SystemSettingsResponse.builder()
                .messageTemplates(templateRepository.findAll())
                .shippingMethods(shippingRepository.findAll())
                .paymentMethods(paymentRepository.findAll())
                .build();
    }

    @Transactional(readOnly = true)
    public List<MessageTemplate> getAllTemplates() {
        return templateRepository.findAll();
    }

    @Transactional(readOnly = true)
    public MessageTemplate getTemplateByCode(String code) {
        return templateRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Mẫu thông báo", "code", code));
    }

    @Transactional
    public MessageTemplate saveTemplate(TemplateUpdateRequest req) {
        MessageTemplate template = templateRepository.findByCode(req.getCode())
                .orElse(MessageTemplate.builder().code(req.getCode()).build());

        if (req.getName() != null && !req.getName().trim().isEmpty()) {
            template.setName(req.getName().trim());
        }
        if (req.getDescription() != null) {
            template.setDescription(req.getDescription().trim());
        }
        if (req.getChannel() != null && !req.getChannel().trim().isEmpty()) {
            template.setChannel(req.getChannel().trim());
        }
        if (req.getSubject() != null) {
            template.setSubject(req.getSubject().trim());
        }
        if (req.getBody() != null) {
            template.setBody(req.getBody().trim());
        }
        if (req.getVariables() != null) {
            template.setVariables(req.getVariables().trim());
        }
        if (req.getIsActive() != null) {
            template.setIsActive(req.getIsActive());
        }
        template.setUpdatedAt(ZonedDateTime.now());

        log.info("[SETTINGS SERVICE] Đã lưu cập nhật template code: '{}', channel: '{}'", template.getCode(), template.getChannel());
        return templateRepository.save(template);
    }

    @Transactional
    public MessageTemplate resetToDefault(String code) {
        MessageTemplate template = templateRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Mẫu thông báo", "code", code));

        var stdOpt = TemplateDataSeeder.getStandardTemplates().stream()
                .filter(s -> s.getCode().equalsIgnoreCase(code))
                .findFirst();

        if (stdOpt.isPresent()) {
            MessageTemplate std = stdOpt.get();
            template.setName(std.getName());
            template.setChannel(std.getChannel());
            template.setSubject(std.getSubject());
            template.setBody(std.getBody());
            template.setVariables(std.getVariables());
            template.setDescription(std.getDescription());
        } else {
            switch (code.toUpperCase()) {
                case "PARCEL_DELIVERED" -> {
                    template.setName("Bưu Kiện Đã Được Bỏ Vào Tủ AnchorBox");
                    template.setChannel("sms");
                    template.setSubject("AnchorBox - Bưu kiện mới đã đến");
                    template.setBody("[AnchorBox] Chào {{customer_name}}, bưu kiện mới đã được giao vào trạm {{device_name}} (Trọng lượng: {{weight_kg}}kg). Mã PIN mở tủ: {{pickup_pin}}. Hotline: {{hotline}}");
                    template.setVariables("customer_name, device_name, weight_kg, pickup_pin, address, hotline");
                }
                case "WARRANTY_COMPLETED" -> {
                    template.setName("Nghiệm Thu & Hoàn Tất Sửa Chữa Thiết Bị");
                    template.setChannel("email");
                    template.setSubject("✅ [AnchorBox] Thiết bị {{device_name}} đã hoàn tất bảo hành và nghiệm thu");
                    template.setBody("<p>Xin chào <strong>{{customer_name}}</strong>,</p><p>Yêu cầu bảo hành <strong>#{{claim_id}}</strong> cho thiết bị <strong>{{device_name}}</strong> (Số Serial: {{serial_number}}) đã được xử lý hoàn tất bởi kỹ thuật viên <strong>{{technician_name}}</strong>.</p><p>Nội dung nghiệm thu: <em>{{inspection_summary}}</em>.</p><p>Thiết bị đã được kiểm định đầy đủ 4 tiêu chí an toàn và sẵn sàng bàn giao lại cho bạn.</p>");
                    template.setVariables("customer_name, claim_id, device_name, serial_number, technician_name, inspection_summary, hotline");
                }
                case "DEVICE_ALERT_CRITICAL" -> {
                    template.setName("Cảnh Báo Sự Cố Thiết Bị IoT Khẩn Cấp");
                    template.setChannel("push");
                    template.setSubject("🚨 [AnchorBox Cảnh Báo] Phát hiện sự cố trạm {{device_name}}");
                    template.setBody("Cảnh báo: Trạm AnchorBox [{{device_name}} - {{serial_number}}] phát hiện sự cố: {{alert_type}} lúc {{time_occurred}} (Mức pin: {{battery_level}}%). Vui lòng kiểm tra trên ứng dụng quản trị!");
                    template.setVariables("customer_name, device_name, serial_number, alert_type, battery_level, time_occurred, hotline");
                }
                default -> log.warn("Không có mẫu mặc định đặc biệt cho mã: {}", code);
            }
        }

        template.setIsActive(true);
        template.setUpdatedAt(ZonedDateTime.now());
        log.info("[SETTINGS SERVICE] Đã khôi phục template '{}' về mặc định hệ thống.", code);
        return templateRepository.save(template);
    }

    public TestSendResponse testSendTemplate(TestSendTemplateRequest req) {
        String code = req.getTemplateCode();
        MessageTemplate template = templateRepository.findByCode(code).orElse(null);

        String channel = (template != null) ? template.getChannel() : "email";
        String subjectPattern = (req.getCustomSubject() != null && !req.getCustomSubject().trim().isEmpty())
                ? req.getCustomSubject()
                : (template != null && template.getSubject() != null ? template.getSubject() : "[AnchorBox Test Notification]");

        String bodyPattern = (req.getCustomBody() != null && !req.getCustomBody().trim().isEmpty())
                ? req.getCustomBody()
                : (template != null ? template.getBody() : "Nội dung thông báo thử nghiệm.");

        // Dữ liệu mẫu thay thế
        Map<String, String> values = new HashMap<>();
        values.put("customer_name", "Nguyễn Văn An (Thử Nghiệm)");
        values.put("name", "Nguyễn Văn An (Thử Nghiệm)");
        values.put("otp_code", "689215");
        values.put("expire_minutes", "5");
        values.put("order_id", "SB-2026-8899");
        values.put("orderId", "SB-2026-8899");
        values.put("order_date", "13/09/2026 09:30");
        values.put("time_formatted", "13/09/2026 09:30");
        values.put("timeFormatted", "13/09/2026 09:30");
        values.put("total_amount", "4.850.000 ₫");
        values.put("totalFormatted", "4.850.000 ₫");
        values.put("shipping_address", "Tòa Landmark 81, P.22, Q. Bình Thạnh, TP.HCM");
        values.put("shippingAddress", "Tòa Landmark 81, P.22, Q. Bình Thạnh, TP.HCM");
        values.put("payment_method", "VNPay QR");
        values.put("shipping_carrier", "Giao Hàng Tiết Kiệm (GHTK)");
        values.put("tracking_number", "GHTK-HCM-2026-882");
        values.put("estimated_delivery", "15/09/2026");
        values.put("device_name", "AnchorBox Resident Pro");
        values.put("serial_number", "BOX-2026-001");
        values.put("weight_kg", "2.45");
        values.put("pickup_pin", "849201");
        values.put("claim_id", "TCK-9901");
        values.put("technician_name", "Trần Kỹ Thuật");
        values.put("technician_phone", "0912 345 678");
        values.put("scheduled_time", "14:00 - 16:00, Ngày mai (14/09/2026)");
        values.put("acceptance_date", "14/09/2026 16:30");
        values.put("warranty_months", "12");
        values.put("warranty_period", "12 tháng chính hãng (Kích hoạt tự động)");
        values.put("cancel_reason", "Khách hàng đổi ý mua phiên bản cao cấp hơn");
        values.put("return_reason", "Cần bổ sung hình ảnh vị trí lắp đặt hộp ngoài trời");
        values.put("reason", "Cần bổ sung hình ảnh vị trí lắp đặt hộp ngoài trời");
        values.put("solution", "Quý khách vui lòng đăng nhập ứng dụng để tải lại ảnh");
        values.put("support_email", "support@anchorbox.vn");
        values.put("order_url", "https://anchorbox.vn/account/orders/SB-2026-8899");
        values.put("hotline", "1900 8888");

        // Merge custom variables if any
        if (req.getMockVariables() != null) {
            values.putAll(req.getMockVariables());
        }

        // Thay thế các biến {{variable}}
        String renderedSubject = subjectPattern;
        String renderedBody = bodyPattern;
        for (Map.Entry<String, String> entry : values.entrySet()) {
            renderedSubject = renderedSubject.replace("{{" + entry.getKey() + "}}", entry.getValue());
            renderedBody = renderedBody.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }

        boolean isRealSent = false;
        boolean queued = false;
        String outboxId = null;
        String recipient = (req.getRecipientEmail() != null && !req.getRecipientEmail().trim().isEmpty())
                ? req.getRecipientEmail().trim()
                : (req.getRecipientPhone() != null ? req.getRecipientPhone().trim() : "test@smartbox.vn");

        String statusMsg;
        if ("email".equalsIgnoreCase(channel) && req.getRecipientEmail() != null && !req.getRecipientEmail().trim().isEmpty()) {
            java.util.UUID id = outboxService.sendCustomAsync("TEMPLATE_TEST:" + code, recipient, renderedSubject, renderedBody);
            queued = true;
            outboxId = id.toString();
            statusMsg = "Mẫu thông báo đã được đưa vào hàng đợi gửi trong nền tới: " + recipient;
        } else {
            statusMsg = "Mẫu " + channel.toUpperCase() + " đã render thành công (Chế độ mô phỏng Test Sandbox)!";
        }

        return TestSendResponse.builder()
                .success(true)
                .queued(queued)
                .outboxId(outboxId)
                .channel(channel)
                .recipient(recipient)
                .renderedSubject(renderedSubject)
                .renderedBody(renderedBody)
                .message(statusMsg)
                .isRealSent(isRealSent)
                .build();
    }
}
