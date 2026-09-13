package com.smartbox.backend.service;

import com.smartbox.backend.dto.SettingsDTO;
import com.smartbox.backend.model.MessageTemplate;
import com.smartbox.backend.repository.MessageTemplateRepository;
import com.smartbox.backend.repository.PaymentMethodRepository;
import com.smartbox.backend.repository.ShippingMethodRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    @Transactional(readOnly = true)
    public SettingsDTO.SystemSettingsResponse getSettings() {
        return SettingsDTO.SystemSettingsResponse.builder()
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
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mẫu thông báo với mã: " + code));
    }

    @Transactional
    public MessageTemplate saveTemplate(SettingsDTO.TemplateUpdateRequest req) {
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
                .orElseThrow(() -> new RuntimeException("Mẫu thông báo không tồn tại: " + code));

        switch (code.toUpperCase()) {
            case "OTP_RESET_PASSWORD" -> {
                template.setName("Mã OTP Đặt Lại Mật Khẩu Hotline");
                template.setChannel("email");
                template.setSubject("🔒 [SmartBox] Mã OTP đặt lại mật khẩu: {{otp_code}}");
                template.setBody("<p>Xin chào <strong>{{customer_name}}</strong>,</p><p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu tài khoản SmartBox của bạn qua Tổng đài hỗ trợ.</p><p>Mã OTP xác thực của bạn là: <span style=\"font-size:24px;font-weight:bold;color:#0284c7;letter-spacing:4px;\">{{otp_code}}</span></p><p>Mã có hiệu lực trong vòng <strong>{{expire_minutes}} phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai!</p><p>Hotline hỗ trợ: {{hotline}}</p>");
                template.setVariables("customer_name, otp_code, expire_minutes, hotline");
            }
            case "ORDER_CONFIRMED" -> {
                template.setName("Xác Nhận Đơn Hàng Mua SmartBox");
                template.setChannel("email");
                template.setSubject("📦 [SmartBox] Xác nhận đơn hàng #{{order_id}} thành công");
                template.setBody("<p>Xin chào <strong>{{customer_name}}</strong>,</p><p>Cảm ơn bạn đã tin tưởng lựa chọn Hệ sinh thái Smart Delivery Box!</p><p>Đơn hàng <strong>#{{order_id}}</strong> với tổng thanh toán <strong>{{total_amount}}</strong> đã được tiếp nhận và đang được đóng gói chuẩn bị giao tới địa chỉ: <em>{{shipping_address}}</em>.</p><p>Phương thức thanh toán: <strong>{{payment_method}}</strong>.</p><p>Mọi thắc mắc xin vui lòng liên hệ tổng đài: {{hotline}}.</p>");
                template.setVariables("customer_name, order_id, total_amount, shipping_address, payment_method, hotline");
            }
            case "ORDER_SHIPPING" -> {
                template.setName("Thông Báo Xuất Kho & Đang Giao Hàng");
                template.setChannel("email");
                template.setSubject("🚚 [SmartBox] Đơn hàng #{{order_id}} đang trên đường giao tới bạn");
                template.setBody("<p>Xin chào <strong>{{customer_name}}</strong>,</p><p>Đơn hàng <strong>#{{order_id}}</strong> của bạn đã được xuất kho và bàn giao cho đơn vị vận chuyển <strong>{{shipping_carrier}}</strong>.</p><p>Mã vận đơn tra cứu hành trình: <strong style=\"color:#0284c7;\">{{tracking_number}}</strong>.</p><p>Thời gian dự kiến giao hàng: <strong>{{estimated_delivery}}</strong>.</p><p>Vui lòng chú ý điện thoại để nhận hàng.</p>");
                template.setVariables("customer_name, order_id, shipping_carrier, tracking_number, estimated_delivery, hotline");
            }
            case "PARCEL_DELIVERED" -> {
                template.setName("Bưu Kiện Đã Được Bỏ Vào Tủ SmartBox");
                template.setChannel("sms");
                template.setSubject("SmartBox - Bưu kiện mới đã đến");
                template.setBody("[SmartBox] Chào {{customer_name}}, bưu kiện mới đã được giao vào trạm {{device_name}} (Trọng lượng: {{weight_kg}}kg). Mã PIN mở tủ: {{pickup_pin}}. Hotline: {{hotline}}");
                template.setVariables("customer_name, device_name, weight_kg, pickup_pin, address, hotline");
            }
            case "WARRANTY_COMPLETED" -> {
                template.setName("Nghiệm Thu & Hoàn Tất Sửa Chữa Thiết Bị");
                template.setChannel("email");
                template.setSubject("✅ [SmartBox] Thiết bị {{device_name}} đã hoàn tất bảo hành và nghiệm thu");
                template.setBody("<p>Xin chào <strong>{{customer_name}}</strong>,</p><p>Yêu cầu bảo hành <strong>#{{claim_id}}</strong> cho thiết bị <strong>{{device_name}}</strong> (Số Serial: {{serial_number}}) đã được xử lý hoàn tất bởi kỹ thuật viên <strong>{{technician_name}}</strong>.</p><p>Nội dung nghiệm thu: <em>{{inspection_summary}}</em>.</p><p>Thiết bị đã được kiểm định đầy đủ 4 tiêu chí an toàn và sẵn sàng bàn giao lại cho bạn.</p>");
                template.setVariables("customer_name, claim_id, device_name, serial_number, technician_name, inspection_summary, hotline");
            }
            case "DEVICE_ALERT_CRITICAL" -> {
                template.setName("Cảnh Báo Sự Cố Thiết Bị IoT Khẩn Cấp");
                template.setChannel("push");
                template.setSubject("🚨 [SmartBox Cảnh Báo] Phát hiện sự cố trạm {{device_name}}");
                template.setBody("Cảnh báo: Trạm SmartBox [{{device_name}} - {{serial_number}}] phát hiện sự cố: {{alert_type}} lúc {{time_occurred}} (Mức pin: {{battery_level}}%). Vui lòng kiểm tra trên ứng dụng quản trị!");
                template.setVariables("customer_name, device_name, serial_number, alert_type, battery_level, time_occurred, hotline");
            }
            default -> log.warn("Không có mẫu mặc định đặc biệt cho mã: {}", code);
        }

        template.setIsActive(true);
        template.setUpdatedAt(ZonedDateTime.now());
        log.info("[SETTINGS SERVICE] Đã khôi phục template '{}' về mặc định hệ thống.", code);
        return templateRepository.save(template);
    }

    public SettingsDTO.TestSendResponse testSendTemplate(SettingsDTO.TestSendTemplateRequest req) {
        String code = req.getTemplateCode();
        MessageTemplate template = templateRepository.findByCode(code).orElse(null);

        String channel = (template != null) ? template.getChannel() : "email";
        String subjectPattern = (req.getCustomSubject() != null && !req.getCustomSubject().trim().isEmpty())
                ? req.getCustomSubject()
                : (template != null && template.getSubject() != null ? template.getSubject() : "[SmartBox Test Notification]");

        String bodyPattern = (req.getCustomBody() != null && !req.getCustomBody().trim().isEmpty())
                ? req.getCustomBody()
                : (template != null ? template.getBody() : "Nội dung thông báo thử nghiệm.");

        // Dữ liệu mẫu thay thế
        Map<String, String> values = new HashMap<>();
        values.put("customer_name", "Nguyễn Văn An (Test)");
        values.put("otp_code", "689215");
        values.put("expire_minutes", "5");
        values.put("order_id", "SB-2026-8899");
        values.put("order_date", "13/09/2026 09:30");
        values.put("total_amount", "4.850.000 đ");
        values.put("shipping_address", "Tòa Landmark 81, P.22, Q. Bình Thạnh, TP.HCM");
        values.put("payment_method", "VNPay QR");
        values.put("shipping_carrier", "Giao Hàng Tiết Kiệm (GHTK)");
        values.put("tracking_number", "GHTK-HCM-2026-882");
        values.put("estimated_delivery", "15/09/2026");
        values.put("device_name", "SmartBox Resident Pro");
        values.put("serial_number", "BOX-2026-001");
        values.put("weight_kg", "2.45");
        values.put("pickup_pin", "849201");
        values.put("claim_id", "TCK-9901");
        values.put("technician_name", "Trần Kỹ Thuật");
        values.put("inspection_summary", "Đã thay cảm biến siêu âm, kiểm tra khóa cơ Servo đạt 100%");
        values.put("alert_type", "Cảm biến MC-38 cảnh báo kẹt nắp hộp");
        values.put("battery_level", "12");
        values.put("time_occurred", "02:15 AM");
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
        String recipient = (req.getRecipientEmail() != null && !req.getRecipientEmail().trim().isEmpty())
                ? req.getRecipientEmail().trim()
                : (req.getRecipientPhone() != null ? req.getRecipientPhone().trim() : "test@smartbox.vn");

        String statusMsg;
        if ("email".equalsIgnoreCase(channel) && req.getRecipientEmail() != null && !req.getRecipientEmail().trim().isEmpty()) {
            isRealSent = emailService.sendHtmlEmail(recipient, renderedSubject, renderedBody);
            statusMsg = isRealSent
                    ? "Đã gửi thử nghiệm thành công tới hộp thư: " + recipient
                    : "Mẫu đã render hoàn hảo! (Email thật chưa gửi ra ngoài do SMTP chưa điền tài khoản)";
        } else {
            statusMsg = "Mẫu " + channel.toUpperCase() + " đã render thành công (Chế độ mô phỏng Test Sandbox)!";
        }

        return SettingsDTO.TestSendResponse.builder()
                .success(true)
                .channel(channel)
                .recipient(recipient)
                .renderedSubject(renderedSubject)
                .renderedBody(renderedBody)
                .message(statusMsg)
                .isRealSent(isRealSent)
                .build();
    }
}
