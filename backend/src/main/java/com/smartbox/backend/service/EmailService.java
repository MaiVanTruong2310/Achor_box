package com.smartbox.backend.service;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailSenderAddress;

    @Value("${smartbox.mail.sender-name:SmartBox IoT Ecosystem}")
    private String senderName;

    /**
     * Gửi email mã OTP xác thực đặt lại mật khẩu theo template HTML hiện đại
     *
     * @param toEmail      Địa chỉ email người nhận
     * @param customerName Tên khách hàng
     * @param otpCode      Mã OTP 6 chữ số
     * @return true nếu gửi SMTP thành công, false nếu có lỗi hoặc chưa cấu hình SMTP
     */
    public boolean sendResetPasswordOtpEmail(String toEmail, String customerName, String otpCode) {
        if (mailSender == null || mailSenderAddress == null || mailSenderAddress.trim().isEmpty()) {
            log.warn("[EMAIL SERVICE] Chưa cấu hình đầy đủ spring.mail.username hoặc mail server trong application.properties. Chưa thể gửi mail thật ra Internet.");
            return false;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(mailSenderAddress, senderName);
            helper.setTo(toEmail);
            helper.setSubject("🔒 [SmartBox] Mã OTP đặt lại mật khẩu: " + otpCode);

            String htmlBody = buildOtpEmailTemplate(customerName, otpCode);
            helper.setText(htmlBody, true);

            mailSender.send(mimeMessage);
            log.info("[EMAIL SERVICE] ✅ Đã gửi email OTP THẬT thành công tới '{}' cho khách hàng '{}'", toEmail, customerName);
            return true;
        } catch (Exception e) {
            log.error("[EMAIL SERVICE] ❌ Lỗi khi gửi email SMTP tới '{}': {}", toEmail, e.getMessage());
            return false;
        }
    }

    /**
     * Gửi email HTML bất kỳ theo nội dung tùy chỉnh
     */
    public boolean sendHtmlEmail(String toEmail, String subject, String htmlBody) {
        if (mailSender == null || mailSenderAddress == null || mailSenderAddress.trim().isEmpty()) {
            log.warn("[EMAIL SERVICE] Chưa cấu hình spring.mail.username. Không thể gửi mail thật.");
            return false;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(mailSenderAddress, senderName);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            mailSender.send(mimeMessage);
            log.info("[EMAIL SERVICE] ✅ Đã gửi email tùy chỉnh thành công tới '{}' với tiêu đề '{}'", toEmail, subject);
            return true;
        } catch (Exception e) {
            log.error("[EMAIL SERVICE] ❌ Lỗi khi gửi email tới '{}': {}", toEmail, e.getMessage());
            return false;
        }
    }

    /**
     * Xây dựng template HTML email hiện đại, chuẩn Responsive cho cả Mobile và Desktop
     */
    private String buildOtpEmailTemplate(String customerName, String otpCode) {
        String displayName = (customerName != null && !customerName.trim().isEmpty()) ? customerName : "Quý khách";

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Mã OTP Đặt Lại Mật Khẩu SmartBox</title>
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  background-color: #f1f5f9;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                  color: #1e293b;
                  -webkit-font-smoothing: antialiased;
                }
                .wrapper {
                  width: 100%%;
                  background-color: #f1f5f9;
                  padding: 30px 15px;
                  box-sizing: border-box;
                }
                .container {
                  max-width: 560px;
                  margin: 0 auto;
                  background: #ffffff;
                  border-radius: 16px;
                  overflow: hidden;
                  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
                  border: 1px solid #e2e8f0;
                }
                .header {
                  background: linear-gradient(135deg, #0284c7 0%%, #0369a1 50%%, #0f172a 100%%);
                  padding: 36px 30px;
                  text-align: center;
                  color: #ffffff;
                }
                .logo-title {
                  font-size: 24px;
                  font-weight: 800;
                  letter-spacing: 1.5px;
                  margin: 0;
                  text-transform: uppercase;
                }
                .sub-title {
                  font-size: 13px;
                  color: #bae6fd;
                  margin-top: 6px;
                  font-weight: 500;
                }
                .content {
                  padding: 36px 32px;
                }
                .greeting {
                  font-size: 17px;
                  font-weight: 700;
                  color: #0f172a;
                  margin-bottom: 14px;
                }
                .description {
                  font-size: 14.5px;
                  line-height: 1.6;
                  color: #475569;
                  margin-bottom: 24px;
                }
                .otp-card {
                  background: #f8fafc;
                  border: 2px dashed #0284c7;
                  border-radius: 14px;
                  padding: 24px 20px;
                  text-align: center;
                  margin-bottom: 24px;
                }
                .otp-label {
                  font-size: 12px;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  color: #0284c7;
                  margin-bottom: 8px;
                }
                .otp-number {
                  font-family: 'Courier New', Courier, monospace;
                  font-size: 36px;
                  font-weight: 800;
                  letter-spacing: 8px;
                  color: #0f172a;
                  display: inline-block;
                  padding: 6px 12px;
                  background: #ffffff;
                  border-radius: 8px;
                  border: 1px solid #cbd5e1;
                }
                .otp-expire {
                  margin-top: 10px;
                  font-size: 12.5px;
                  color: #e11d48;
                  font-weight: 600;
                }
                .warning-box {
                  background: #fffbeb;
                  border-left: 4px solid #f59e0b;
                  padding: 14px 16px;
                  border-radius: 6px;
                  font-size: 13px;
                  color: #92400e;
                  line-height: 1.5;
                  margin-bottom: 24px;
                }
                .warning-box strong {
                  color: #78350f;
                }
                .footer {
                  background: #f8fafc;
                  padding: 24px 30px;
                  border-top: 1px solid #e2e8f0;
                  text-align: center;
                  font-size: 12px;
                  color: #64748b;
                  line-height: 1.6;
                }
                .footer a {
                  color: #0284c7;
                  text-decoration: none;
                }
              </style>
            </head>
            <body>
              <div class="wrapper">
                <div class="container">
                  <!-- Header -->
                  <div class="header">
                    <h1 class="logo-title">SMARTBOX</h1>
                    <div class="sub-title">Hệ Sinh Thái Tủ Giao Nhận Hàng Thông Minh IoT</div>
                  </div>

                  <!-- Nội dung chính -->
                  <div class="content">
                    <div class="greeting">Xin chào %s,</div>
                    <div class="description">
                      Chúng tôi nhận được yêu cầu hỗ trợ <strong>đặt lại mật khẩu tài khoản</strong> của bạn thông qua Tổng đài Chăm sóc khách hàng Hotline SmartBox.
                      <br><br>
                      Vui lòng đọc mã xác thực OTP dưới đây cho nhân viên tổng đài đang hỗ trợ bạn:
                    </div>

                    <!-- Hộp hiển thị mã OTP -->
                    <div class="otp-card">
                      <div class="otp-label">MÃ XÁC THỰC OTP 6 CHỮ SỐ</div>
                      <div class="otp-number">%s</div>
                      <div class="otp-expire">⏳ Mã có hiệu lực trong vòng 05 phút</div>
                    </div>

                    <!-- Khuyến cáo an toàn -->
                    <div class="warning-box">
                      <strong>⚠️ LƯU Ý BẢO MẬT:</strong>
                      Tuyệt đối không chia sẻ mã này cho người lạ. Nhân viên SmartBox chỉ hỏi mã này khi bạn chủ động gọi lên Hotline yêu cầu hỗ trợ. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ ngay hotline để khóa tài khoản.
                    </div>

                    <div style="font-size: 13.5px; color: #475569;">
                      Trân trọng cảm ơn bạn đã đồng hành cùng Smart Delivery Box!
                    </div>
                  </div>

                  <!-- Footer -->
                  <div class="footer">
                    <div>© 2026 SmartBox Vietnam Co., Ltd. Tất cả quyền được bảo lưu.</div>
                    <div style="margin-top: 4px;">
                      Hotline: <strong>1900 8888</strong> &bull; Email: <a href="mailto:support@smartbox.vn">support@smartbox.vn</a>
                    </div>
                    <div style="margin-top: 4px; font-size: 11px; color: #94a3b8;">
                      Email này được gửi tự động từ hệ thống quản trị trung tâm SmartBox Admin Portal.
                    </div>
                  </div>
                </div>
              </div>
            </body>
            </html>
            """.formatted(displayName, otpCode);
    }
}
