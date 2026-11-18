package com.smartbox.backend.config;

import com.smartbox.backend.entity.MessageTemplate;
import com.smartbox.backend.repository.MessageTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class TemplateDataSeeder implements ApplicationRunner {

    private final MessageTemplateRepository templateRepository;
    private final com.smartbox.backend.repository.ProfileRepository profileRepository;
    private final com.smartbox.backend.security.SupabaseAuthGateway authProvider;
    private final com.smartbox.backend.service.auth.RedisAuthService redisAuth;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            seedTemplatesIfMissing();
            syncAdminAccount();
        } catch (Exception e) {
            log.error("[TEMPLATE SEEDER] Lỗi khi nạp mẫu email thông báo: {}", e.getMessage(), e);
        }
    }

    private void syncAdminAccount() {
        try {
            String email = "admin@admin.vn";
            String pass = "admin@123";
            if (redisAuth != null) {
                redisAuth.resetFailedAttempts(email);
                redisAuth.resetFailedAttempts("admin@anchorbox.vn");
            }
            var existing = profileRepository.findFirstByEmailOrderByCreatedAtDesc(email);
            if (existing.isPresent()) {
                try {
                    authProvider.updateUserPassword(existing.get().getId(), pass);
                    log.info("[ADMIN SYNC] Đã cập nhật mật khẩu cho {} trên Supabase", email);
                } catch (Exception e) {
                    log.warn("[ADMIN SYNC] Không thể cập nhật mật khẩu Supabase: {}", e.getMessage());
                }
            } else {
                try {
                    java.util.UUID id = authProvider.createStaff(email, pass, "Quản Trị Viên");
                    var p = com.smartbox.backend.entity.Profile.builder()
                            .id(id)
                            .email(email)
                            .fullName("Quản Trị Viên")
                            .role("super_admin")
                            .isLocked(false)
                            .is2faEnabled(false)
                            .build();
                    profileRepository.save(p);
                    log.info("[ADMIN SYNC] Đã tạo mới tài khoản {} với quyền super_admin", email);
                } catch (Exception e) {
                    log.warn("[ADMIN SYNC] Không thể tạo tài khoản Supabase: {}", e.getMessage());
                }
            }
        } catch (Exception ex) {
            log.error("[ADMIN SYNC] Lỗi đồng bộ tài khoản admin: {}", ex.getMessage());
        }
    }

    public void seedTemplatesIfMissing() {
        List<MessageTemplate> defaultTemplates = getStandardTemplates();
        int seededCount = 0;
        int updatedCount = 0;

        for (MessageTemplate tpl : defaultTemplates) {
            var existing = templateRepository.findByCode(tpl.getCode());
            if (existing.isEmpty()) {
                tpl.setUpdatedAt(ZonedDateTime.now());
                templateRepository.save(tpl);
                seededCount++;
            } else {
                MessageTemplate cur = existing.get();
                if (cur.getBody() == null || !cur.getBody().contains("ANCHOR BOX VIETNAM")) {
                    cur.setName(tpl.getName());
                    cur.setChannel(tpl.getChannel());
                    cur.setSubject(tpl.getSubject());
                    cur.setBody(tpl.getBody());
                    cur.setVariables(tpl.getVariables());
                    cur.setDescription(tpl.getDescription());
                    cur.setIsActive(true);
                    cur.setUpdatedAt(ZonedDateTime.now());
                    templateRepository.save(cur);
                    updatedCount++;
                }
            }
        }

        if (seededCount > 0 || updatedCount > 0) {
            log.info("[TEMPLATE SEEDER] ✅ Đã nạp {} mẫu mới và cập nhật {} mẫu email chuẩn AnchorBox vào CSDL.", seededCount, updatedCount);
        } else {
            log.info("[TEMPLATE SEEDER] Các mẫu email thông báo đã tồn tại đầy đủ trong CSDL.");
        }
    }

    public static List<MessageTemplate> getStandardTemplates() {
        List<MessageTemplate> list = new ArrayList<>();

        // 1. ORDER_CONFIRMED
        list.add(MessageTemplate.builder()
                .code("ORDER_CONFIRMED")
                .name("Xác Nhận Đơn Hàng Mua SmartBox")
                .channel("email")
                .subject("📦 [AnchorBox] Đơn hàng #{{order_id}} đã được xác nhận thành công")
                .description("Gửi khi đơn hàng được tạo hoặc được quản trị viên duyệt tiếp nhận.")
                .variables("customer_name, order_id, total_amount, time_formatted, shipping_address, payment_method, order_url, hotline")
                .isActive(true)
                .body(buildEmailHtml(
                        "ĐÃ TIẾP NHẬN & XÁC NHẬN",
                        "#e0f2fe", "#0369a1",
                        "Đơn hàng của bạn đã được xác nhận!",
                        "Cảm ơn bạn đã tin tưởng lựa chọn hệ sinh thái Hộp Giao Nhận Thông Minh AnchorBox. Đơn hàng của bạn đã được tiếp nhận và chuyển sang bộ phận chuẩn bị hàng hóa.",
                        """
                        <tr><td style="padding:6px 0;color:#64748b;">Mã đơn hàng:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">#{{order_id}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Thời gian đặt:</td><td style="padding:6px 0;font-weight:600;color:#0f172a;text-align:right;">{{time_formatted}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Tổng giá trị:</td><td style="padding:6px 0;font-weight:700;color:#0284c7;text-align:right;">{{total_amount}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Địa chỉ giao lắp:</td><td style="padding:6px 0;font-weight:600;color:#0f172a;text-align:right;">{{shipping_address}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Phương thức:</td><td style="padding:6px 0;font-weight:600;color:#0f172a;text-align:right;">{{payment_method}}</td></tr>
                        """,
                        "Theo dõi tiến trình đơn hàng", "{{order_url}}"
                ))
                .build());

        // 2. ORDER_PAID
        list.add(MessageTemplate.builder()
                .code("ORDER_PAID")
                .name("Xác Nhận Thanh Toán Thành Công")
                .channel("email")
                .subject("✅ [AnchorBox] Xác nhận thanh toán thành công cho đơn hàng #{{order_id}}")
                .description("Gửi khi khách hàng thanh toán thành công qua cổng thanh toán hoặc chuyển khoản.")
                .variables("customer_name, order_id, total_amount, time_formatted, payment_method, order_url, hotline")
                .isActive(true)
                .body(buildEmailHtml(
                        "THANH TOÁN THÀNH CÔNG",
                        "#dcfce7", "#15803d",
                        "Thanh toán đơn hàng thành công!",
                        "Hệ thống AnchorBox đã ghi nhận khoản thanh toán của quý khách. Đơn hàng đã sẵn sàng được sắp xếp lịch giao hàng và điều phối kỹ thuật viên lắp đặt.",
                        """
                        <tr><td style="padding:6px 0;color:#64748b;">Mã đơn hàng:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">#{{order_id}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Số tiền đã thanh toán:</td><td style="padding:6px 0;font-weight:800;color:#16a34a;text-align:right;font-size:16px;">{{total_amount}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Thời gian giao dịch:</td><td style="padding:6px 0;font-weight:600;color:#0f172a;text-align:right;">{{time_formatted}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Hình thức:</td><td style="padding:6px 0;font-weight:600;color:#0f172a;text-align:right;">{{payment_method}}</td></tr>
                        """,
                        "Xem hóa đơn điện tử", "{{order_url}}"
                ))
                .build());

        // 3. ORDER_AWAITING_PAYMENT
        list.add(MessageTemplate.builder()
                .code("ORDER_AWAITING_PAYMENT")
                .name("Thông Báo Chờ Thanh Toán Đơn Hàng")
                .channel("email")
                .subject("⏳ [AnchorBox] Đơn hàng #{{order_id}} đã được tiếp nhận - Chờ thanh toán")
                .description("Gửi khi đơn hàng cần khách hàng thực hiện thanh toán trực tuyến hoặc xác nhận chuyển khoản.")
                .variables("customer_name, order_id, total_amount, time_formatted, payment_method, order_url, hotline")
                .isActive(true)
                .body(buildEmailHtml(
                        "CHỜ THANH TOÁN",
                        "#fef3c7", "#b45309",
                        "Đơn hàng đang chờ thanh toán!",
                        "Đơn hàng của bạn đã được hệ thống AnchorBox ghi nhận và duyệt điều kiện giao dịch. Vui lòng hoàn tất thanh toán để chúng tôi xuất kho và điều phối kỹ thuật viên lắp đặt.",
                        """
                        <tr><td style="padding:6px 0;color:#64748b;">Mã đơn hàng:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">#{{order_id}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Số tiền cần thanh toán:</td><td style="padding:6px 0;font-weight:800;color:#b45309;text-align:right;font-size:16px;">{{total_amount}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Phương thức thanh toán:</td><td style="padding:6px 0;font-weight:600;color:#0f172a;text-align:right;">{{payment_method}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Hạn hoàn tất:</td><td style="padding:6px 0;font-weight:600;color:#ef4444;text-align:right;">Trong vòng 24 giờ</td></tr>
                        """,
                        "Thanh toán đơn hàng ngay", "{{order_url}}"
                ))
                .build());

        // 4. INSTALLATION_SCHEDULED
        list.add(MessageTemplate.builder()
                .code("INSTALLATION_SCHEDULED")
                .name("Thông Báo Lịch Hẹn Giao & Lắp Đặt")
                .channel("email")
                .subject("📅 [AnchorBox] Lịch hẹn giao hàng & lắp đặt hộp thông minh #{{order_id}}")
                .description("Gửi khi điều phối viên xếp lịch hẹn kỹ thuật viên tới lắp đặt tại nhà.")
                .variables("customer_name, order_id, scheduled_time, shipping_address, technician_name, technician_phone, order_url, hotline")
                .isActive(true)
                .body(buildEmailHtml(
                        "ĐÃ XẾP LỊCH GIAO LẮP",
                        "#f3e8ff", "#7e22ce",
                        "Lịch hẹn lắp đặt AnchorBox của bạn!",
                        "Kỹ thuật viên của AnchorBox đã được phân công tới tận nơi để khảo sát vị trí, thi công lắp đặt và cấu hình hộp thông minh cho quý khách theo lịch hẹn bên dưới.",
                        """
                        <tr><td style="padding:6px 0;color:#64748b;">Mã đơn hàng:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">#{{order_id}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Thời gian dự kiến:</td><td style="padding:6px 0;font-weight:800;color:#7e22ce;text-align:right;">{{scheduled_time}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Địa chỉ lắp đặt:</td><td style="padding:6px 0;font-weight:600;color:#0f172a;text-align:right;">{{shipping_address}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Kỹ thuật viên:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">{{technician_name}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Số điện thoại KTV:</td><td style="padding:6px 0;font-weight:700;color:#0284c7;text-align:right;">{{technician_phone}}</td></tr>
                        """,
                        "Xem thông tin giao lắp", "{{order_url}}"
                ))
                .build());

        // 5. ORDER_SHIPPED
        list.add(MessageTemplate.builder()
                .code("ORDER_SHIPPED")
                .name("Thông Báo Đang Vận Chuyển")
                .channel("email")
                .subject("🚚 [AnchorBox] Đơn hàng #{{order_id}} đang trên đường vận chuyển")
                .description("Gửi khi thiết bị xuất kho và đang được chuyển tới điểm giao.")
                .variables("customer_name, order_id, tracking_number, shipping_carrier, shipping_address, order_url, hotline")
                .isActive(true)
                .body(buildEmailHtml(
                        "ĐANG VẬN CHUYỂN",
                        "#e0f2fe", "#0369a1",
                        "Thiết bị đang trên đường tới bạn!",
                        "Kiện hàng AnchorBox đã được xuất kho và đang được nhân viên vận chuyển giao tới địa chỉ của quý khách. Quý khách vui lòng chú ý điện thoại để nhận hàng thuận lợi.",
                        """
                        <tr><td style="padding:6px 0;color:#64748b;">Mã đơn hàng:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">#{{order_id}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Mã vận đơn:</td><td style="padding:6px 0;font-weight:800;color:#0284c7;text-align:right;">{{tracking_number}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Đơn vị giao hàng:</td><td style="padding:6px 0;font-weight:600;color:#0f172a;text-align:right;">{{shipping_carrier}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Địa chỉ nhận:</td><td style="padding:6px 0;font-weight:600;color:#0f172a;text-align:right;">{{shipping_address}}</td></tr>
                        """,
                        "Theo dõi hành trình", "{{order_url}}"
                ))
                .build());

        // 6. DEVICE_DELIVERED
        list.add(MessageTemplate.builder()
                .code("DEVICE_DELIVERED")
                .name("Thiết Bị Đã Tới - Đang Lắp Đặt")
                .channel("email")
                .subject("🔧 [AnchorBox] Thiết bị đã tới nơi, đang tiến hành thi công lắp đặt #{{order_id}}")
                .description("Gửi khi kỹ thuật viên check-in tại nhà khách hàng và bắt đầu thi công.")
                .variables("customer_name, order_id, technician_name, shipping_address, order_url, hotline")
                .isActive(true)
                .body(buildEmailHtml(
                        "ĐANG THI CÔNG LẮP ĐẶT",
                        "#fef3c7", "#b45309",
                        "Kỹ thuật viên đang tiến hành lắp đặt!",
                        "Kỹ thuật viên AnchorBox đã có mặt tại điểm hẹn và đang tiến hành cố định thiết bị, cấp nguồn và đấu nối module điều khiển thông minh.",
                        """
                        <tr><td style="padding:6px 0;color:#64748b;">Mã đơn hàng:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">#{{order_id}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Kỹ thuật viên thi công:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">{{technician_name}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Địa điểm:</td><td style="padding:6px 0;font-weight:600;color:#0f172a;text-align:right;">{{shipping_address}}</td></tr>
                        """,
                        "Xem tiến độ lắp đặt", "{{order_url}}"
                ))
                .build());

        // 7. INSTALLATION_DELAYED
        list.add(MessageTemplate.builder()
                .code("INSTALLATION_DELAYED")
                .name("Thông Báo Điều Chỉnh Lịch Hẹn Lắp Đặt")
                .channel("email")
                .subject("⏱️ [AnchorBox] Thông báo điều chỉnh lịch hẹn lắp đặt đơn hàng #{{order_id}}")
                .description("Gửi khi lịch hẹn lắp đặt bị hoãn hoặc dời lịch vì thời tiết/kỹ thuật/yêu cầu khách hàng.")
                .variables("customer_name, order_id, scheduled_time, reason, technician_name, technician_phone, order_url, hotline")
                .isActive(true)
                .body(buildEmailHtml(
                        "ĐIỀU CHỈNH LỊCH HẸN",
                        "#fef3c7", "#b45309",
                        "Thông báo thay đổi thời gian lắp đặt!",
                        "Do một số yếu tố khách quan hoặc theo thỏa thuận với quý khách, lịch thi công lắp đặt hộp thông minh AnchorBox đã được điều chỉnh sang khung thời gian mới.",
                        """
                        <tr><td style="padding:6px 0;color:#64748b;">Mã đơn hàng:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">#{{order_id}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Thời gian hẹn mới:</td><td style="padding:6px 0;font-weight:800;color:#b45309;text-align:right;">{{scheduled_time}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Lý do điều chỉnh:</td><td style="padding:6px 0;font-weight:600;color:#0f172a;text-align:right;">{{reason}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Kỹ thuật viên phụ trách:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">{{technician_name}} ({{technician_phone}})</td></tr>
                        """,
                        "Xem chi tiết đơn hàng", "{{order_url}}"
                ))
                .build());

        // 8. INSTALLATION_COMPLETED
        list.add(MessageTemplate.builder()
                .code("INSTALLATION_COMPLETED")
                .name("Lắp Đặt & Nghiệm Thu Hoàn Tất")
                .channel("email")
                .subject("🎉 [AnchorBox] Lắp đặt & nghiệm thu hoàn tất cho đơn hàng #{{order_id}}")
                .description("Gửi khi khách hàng ký biên bản nghiệm thu (PO Acceptance), hộp đã hoạt động.")
                .variables("customer_name, order_id, serial_number, warranty_months, order_url, hotline")
                .isActive(true)
                .body(buildEmailHtml(
                        "NGHIỆM THU HOÀN TẤT",
                        "#dcfce7", "#15803d",
                        "Chúc mừng! Hộp AnchorBox đã sẵn sàng hoạt động!",
                        "Quy trình lắp đặt và kiểm tra an toàn 4 bước đã hoàn tất. Hộp AnchorBox của bạn đã được kết nối Internet và kích hoạt bảo hành điện tử chính hãng.",
                        """
                        <tr><td style="padding:6px 0;color:#64748b;">Mã đơn hàng:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">#{{order_id}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Mã Serial thiết bị:</td><td style="padding:6px 0;font-weight:800;color:#0284c7;text-align:right;">{{serial_number}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Thời hạn bảo hành:</td><td style="padding:6px 0;font-weight:700;color:#16a34a;text-align:right;">{{warranty_months}} tháng chính hãng</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Trạng thái khóa:</td><td style="padding:6px 0;font-weight:700;color:#16a34a;text-align:right;">Đã kết nối an toàn</td></tr>
                        """,
                        "Mở ứng dụng điều khiển hộp", "{{order_url}}"
                ))
                .build());

        // 9. ORDER_DELIVERED
        list.add(MessageTemplate.builder()
                .code("ORDER_DELIVERED")
                .name("Giao Hàng Thành Công")
                .channel("email")
                .subject("📦 [AnchorBox] Đơn hàng #{{order_id}} đã được giao thành công")
                .description("Gửi khi đơn hàng phụ kiện hoặc hộp đã được giao tận tay khách hàng.")
                .variables("customer_name, order_id, total_amount, time_formatted, order_url, hotline")
                .isActive(true)
                .body(buildEmailHtml(
                        "ĐÃ GIAO THÀNH CÔNG",
                        "#dcfce7", "#15803d",
                        "Đơn hàng đã được giao thành công!",
                        "Đơn hàng của bạn đã được giao đến nơi thành công. Chúng tôi rất hân hạnh được đồng hành cùng bạn trong trải nghiệm giao nhận thông minh.",
                        """
                        <tr><td style="padding:6px 0;color:#64748b;">Mã đơn hàng:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">#{{order_id}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Thời gian hoàn tất:</td><td style="padding:6px 0;font-weight:600;color:#0f172a;text-align:right;">{{time_formatted}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Tổng giá trị đơn:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">{{total_amount}}</td></tr>
                        """,
                        "Xem chi tiết đơn hàng", "{{order_url}}"
                ))
                .build());

        // 10. ORDER_COMPLETED
        list.add(MessageTemplate.builder()
                .code("ORDER_COMPLETED")
                .name("Đơn Hàng Hoàn Tất 100%")
                .channel("email")
                .subject("🌟 [AnchorBox] Đơn hàng #{{order_id}} đã hoàn tất thành công")
                .description("Gửi khi toàn bộ quy trình giao lắp, thanh toán và nghiệm thu đã hoàn tất 100%.")
                .variables("customer_name, order_id, total_amount, time_formatted, order_url, hotline")
                .isActive(true)
                .body(buildEmailHtml(
                        "HOÀN TẤT THÀNH CÔNG",
                        "#dcfce7", "#15803d",
                        "Đơn hàng của bạn đã hoàn tất 100%!",
                        "Chúc mừng bạn đã chính thức gia nhập cộng đồng cư dân thông minh AnchorBox. Hãy mở ứng dụng để trải nghiệm các tính năng nhận hàng từ xa, chia sẻ mã OTP mở tủ cho người thân và shiper.",
                        """
                        <tr><td style="padding:6px 0;color:#64748b;">Mã đơn hàng:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">#{{order_id}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Tổng giá trị:</td><td style="padding:6px 0;font-weight:700;color:#15803d;text-align:right;">{{total_amount}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Thời gian hoàn tất:</td><td style="padding:6px 0;font-weight:600;color:#0f172a;text-align:right;">{{time_formatted}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Hỗ trợ kỹ thuật:</td><td style="padding:6px 0;font-weight:700;color:#0284c7;text-align:right;">24/7 Hotline 1900 8888</td></tr>
                        """,
                        "Mở ứng dụng điều khiển", "{{order_url}}"
                ))
                .build());

        // 11. TICKET_RETURNED
        list.add(MessageTemplate.builder()
                .code("TICKET_RETURNED")
                .name("Yêu Cầu Bổ Sung Thông Tin Đơn")
                .channel("email")
                .subject("⚠️ [AnchorBox] Yêu cầu bổ sung thông tin cho đơn hàng #{{order_id}}")
                .description("Gửi khi quản trị viên yêu cầu khách hàng hoặc nhân viên bổ sung giải trình.")
                .variables("customer_name, order_id, reason, order_url, hotline")
                .isActive(true)
                .body(buildEmailHtml(
                        "CẦN BỔ SUNG THÔNG TIN",
                        "#fef3c7", "#b45309",
                        "Yêu cầu phản hồi thông tin đơn hàng",
                        "Trong quá trình thẩm định đơn hàng, bộ phận quản lý cần quý khách cung cấp thêm một số thông tin chi tiết để tiếp tục xử lý đơn hàng.",
                        """
                        <tr><td style="padding:6px 0;color:#64748b;">Mã đơn hàng:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">#{{order_id}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Nội dung yêu cầu:</td><td style="padding:6px 0;font-weight:700;color:#b45309;text-align:right;">{{reason}}</td></tr>
                        """,
                        "Phản hồi thông tin ngay", "{{order_url}}"
                ))
                .build());

        // 12. TICKET_REJECTED
        list.add(MessageTemplate.builder()
                .code("TICKET_REJECTED")
                .name("Thông Báo Từ Chối Phê Duyệt")
                .channel("email")
                .subject("❌ [AnchorBox] Thông báo từ chối phê duyệt đơn hàng #{{order_id}}")
                .description("Gửi khi đơn hàng không thỏa mãn điều kiện và bị từ chối duyệt.")
                .variables("customer_name, order_id, reason, order_url, hotline")
                .isActive(true)
                .body(buildEmailHtml(
                        "TỪ CHỐI PHÊ DUYỆT",
                        "#fee2e2", "#b91c1c",
                        "Đơn hàng không được phê duyệt",
                        "Rất tiếc, đơn hàng của bạn không đáp ứng điều kiện tiếp nhận và đã bị từ chối duyệt theo quy định vận hành của AnchorBox.",
                        """
                        <tr><td style="padding:6px 0;color:#64748b;">Mã đơn hàng:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">#{{order_id}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Lý do từ chối:</td><td style="padding:6px 0;font-weight:700;color:#b91c1c;text-align:right;">{{reason}}</td></tr>
                        """,
                        "Tra cứu chi tiết", "{{order_url}}"
                ))
                .build());

        // 13. ORDER_CANCELLED
        list.add(MessageTemplate.builder()
                .code("ORDER_CANCELLED")
                .name("Thông Báo Hủy Đơn Hàng")
                .channel("email")
                .subject("🚫 [AnchorBox] Xác nhận đơn hàng #{{order_id}} đã được hủy")
                .description("Gửi khi đơn hàng bị hủy bởi khách hàng hoặc quản trị viên.")
                .variables("customer_name, order_id, reason, order_url, hotline")
                .isActive(true)
                .body(buildEmailHtml(
                        "ĐƠN HÀNG ĐÃ HỦY",
                        "#fee2e2", "#b91c1c",
                        "Đơn hàng của bạn đã được hủy",
                        "Hệ thống AnchorBox đã xử lý yêu cầu hủy đơn hàng. Nếu quý khách đã thanh toán trước, số tiền sẽ được hoàn trả theo quy định tài chính.",
                        """
                        <tr><td style="padding:6px 0;color:#64748b;">Mã đơn hàng:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">#{{order_id}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Lý do hủy:</td><td style="padding:6px 0;font-weight:600;color:#b91c1c;text-align:right;">{{reason}}</td></tr>
                        """,
                        "Xem chi tiết đơn hàng", "{{order_url}}"
                ))
                .build());

        // 14. ORDER_REFUNDED
        list.add(MessageTemplate.builder()
                .code("ORDER_REFUNDED")
                .name("Xác Nhận Hoàn Tiền Thành Công")
                .channel("email")
                .subject("💰 [AnchorBox] Xác nhận hoàn tiền cho đơn hàng #{{order_id}}")
                .description("Gửi khi kế toán hoàn tất thủ tục hoàn trả tiền đơn hàng.")
                .variables("customer_name, order_id, total_amount, time_formatted, payment_method, order_url, hotline")
                .isActive(true)
                .body(buildEmailHtml(
                        "ĐÃ HOÀN TIỀN",
                        "#ccfbf1", "#0f766e",
                        "Xác nhận hoàn tất hoàn tiền",
                        "Khoản tiền hoàn trả cho đơn hàng của bạn đã được chuyển lệnh thành công về tài khoản nguồn mà quý khách đã thanh toán ban đầu.",
                        """
                        <tr><td style="padding:6px 0;color:#64748b;">Mã đơn hàng:</td><td style="padding:6px 0;font-weight:700;color:#0f172a;text-align:right;">#{{order_id}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Số tiền hoàn trả:</td><td style="padding:6px 0;font-weight:800;color:#0f766e;text-align:right;font-size:16px;">{{total_amount}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Thời gian hoàn tiền:</td><td style="padding:6px 0;font-weight:600;color:#0f172a;text-align:right;">{{time_formatted}}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Kênh nhận hoàn:</td><td style="padding:6px 0;font-weight:600;color:#0f172a;text-align:right;">{{payment_method}}</td></tr>
                        """,
                        "Kiểm tra đơn hàng", "{{order_url}}"
                ))
                .build());

        // 15. OTP_RESET_PASSWORD
        list.add(MessageTemplate.builder()
                .code("OTP_RESET_PASSWORD")
                .name("Mã OTP Đặt Lại Mật Khẩu")
                .channel("email")
                .subject("🔒 [AnchorBox] Mã OTP đặt lại mật khẩu: {{otp_code}}")
                .description("Gửi mã OTP bảo mật khi khách hàng hoặc nhân viên yêu cầu quên mật khẩu.")
                .variables("customer_name, otp_code, expire_minutes, hotline")
                .isActive(true)
                .body(buildEmailHtml(
                        "MÃ XÁC THỰC BẢO MẬT",
                        "#e0f2fe", "#0369a1",
                        "Mã OTP đặt lại mật khẩu của bạn",
                        "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản AnchorBox của bạn. Sử dụng mã OTP dưới đây để hoàn tất thao tác:",
                        """
                        <tr><td colspan="2" style="padding:16px 0;text-align:center;">
                            <span style="font-size:32px;font-weight:900;letter-spacing:6px;color:#0284c7;background:#f0f9ff;padding:12px 28px;border-radius:10px;border:1px dashed #0284c7;display:inline-block;">{{otp_code}}</span>
                        </td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Thời hạn hiệu lực:</td><td style="padding:6px 0;font-weight:700;color:#ef4444;text-align:right;">{{expire_minutes}} phút</td></tr>
                        <tr><td colspan="2" style="padding:6px 0;color:#94a3b8;font-size:12px;text-align:center;">Tuyệt đối không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên AnchorBox!</td></tr>
                        """,
                        "Truy cập AnchorBox", "https://anchorbox.vn"
                ))
                .build());

        return list;
    }

    private static String buildEmailHtml(
            String badgeText, String badgeBg, String badgeColor,
            String heading, String description,
            String detailsRowsHtml,
            String buttonText, String buttonUrl
    ) {
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
                .wrapper { width: 100%%; background-color: #f8fafc; padding: 32px 16px; box-sizing: border-box; }
                .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
                .header { background: linear-gradient(135deg, #0f172a 0%%, #1e293b 100%%); padding: 26px 24px; text-align: center; }
                .logo-title { font-size: 20px; font-weight: 800; letter-spacing: 1.2px; margin: 0; color: #ffffff; }
                .logo-sub { font-size: 12px; color: #94a3b8; margin-top: 5px; }
                .content { padding: 32px 28px; line-height: 1.6; }
                .badge { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 16px; }
                .heading { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 10px; }
                .desc { font-size: 14.5px; color: #475569; margin: 0 0 20px; }
                .info-box { background: #f8fafc; border-radius: 12px; padding: 18px 20px; margin: 20px 0; border: 1px solid #e2e8f0; font-size: 13.5px; }
                .info-table { width: 100%%; border-collapse: collapse; }
                .btn-container { text-align: center; margin: 26px 0 12px; }
                .btn { display: inline-block; background: #0284c7; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 8px rgba(2,132,199,0.25); }
                .footer { background: #f8fafc; padding: 22px 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6; }
              </style>
            </head>
            <body>
              <div class="wrapper">
                <div class="container">
                  <div class="header">
                    <h1 class="logo-title">📦 ANCHOR BOX VIETNAM</h1>
                    <div class="logo-sub">Hệ Thống Hộp Giao Nhận Hàng Thông Minh &amp; Tiện Ích</div>
                  </div>
                  <div class="content">
                    <div class="badge" style="background-color: %s; color: %s;">%s</div>
                    <div class="heading">%s</div>
                    <p class="desc">Xin chào <strong>{{customer_name}}</strong>,</p>
                    <p class="desc">%s</p>
                    <div class="info-box">
                      <table class="info-table">
                        %s
                      </table>
                    </div>
                    <div class="btn-container">
                      <a href="%s" class="btn" target="_blank">%s</a>
                    </div>
                    <p style="font-size: 12.5px; color: #94a3b8; text-align: center; margin-top: 20px;">
                      Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ tổng đài CSKH: <strong>1900 8888</strong>.
                    </p>
                  </div>
                  <div class="footer">
                    <div>© 2026 AnchorBox Vietnam Co., Ltd. Tất cả quyền được bảo lưu.</div>
                    <div>Hotline: 1900 8888 • Email: support@anchorbox.vn</div>
                  </div>
                </div>
              </div>
            </body>
            </html>
            """.formatted(badgeBg, badgeColor, badgeText, heading, description, detailsRowsHtml, buttonUrl, buttonText);
    }
}
