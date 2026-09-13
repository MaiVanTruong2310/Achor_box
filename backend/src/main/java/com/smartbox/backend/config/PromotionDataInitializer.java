package com.smartbox.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PromotionDataInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            log.info("Khởi tạo cấu trúc bảng promotions và đồng bộ các cột...");
            
            // 1. Tạo bảng nếu chưa tồn tại
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS public.promotions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    code VARCHAR(50) NOT NULL UNIQUE,
                    description TEXT,
                    discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
                    discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
                    min_order_value NUMERIC(12,2) DEFAULT 0,
                    max_discount NUMERIC(12,2),
                    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    end_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 year'),
                    usage_limit INT NOT NULL DEFAULT 100,
                    used_count INT NOT NULL DEFAULT 0,
                    is_active BOOLEAN NOT NULL DEFAULT true,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            """);

            // 2. Đảm bảo mọi cột tồn tại (nếu bảng đã được tạo trước đó thiếu cột)
            jdbcTemplate.execute("ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS code VARCHAR(50);");
            jdbcTemplate.execute("ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS description TEXT;");
            jdbcTemplate.execute("ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'percentage';");
            jdbcTemplate.execute("ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12,2) DEFAULT 0;");
            jdbcTemplate.execute("ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(12,2) DEFAULT 0;");
            jdbcTemplate.execute("ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS max_discount NUMERIC(12,2);");
            jdbcTemplate.execute("ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ DEFAULT NOW();");
            jdbcTemplate.execute("ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 year');");
            jdbcTemplate.execute("ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS usage_limit INT DEFAULT 100;");
            jdbcTemplate.execute("ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS used_count INT DEFAULT 0;");
            jdbcTemplate.execute("ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;");
            jdbcTemplate.execute("ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();");
            jdbcTemplate.execute("ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();");

            // 2.5 Đảm bảo cột email tồn tại trong bảng profiles và cập nhật email mẫu nếu trống
            try {
                jdbcTemplate.execute("ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);");
                jdbcTemplate.execute("UPDATE public.profiles SET email = 'admin@smartbox.vn' WHERE role = 'super_admin' AND (email IS NULL OR email = '');");
                jdbcTemplate.execute("UPDATE public.profiles SET email = CONCAT('user_', REPLACE(SUBSTRING(id::text, 1, 8), '-', ''), '@smartbox.vn') WHERE (email IS NULL OR email = '');");
            } catch (Exception ex) {
                log.warn("Không thể tự động thêm cột email vào profiles: {}", ex.getMessage());
            }

            // 2.6 Khởi tạo cấu trúc và đồng bộ các mẫu thông báo (message_templates)
            initMessageTemplates();

            // 3. Chèn dữ liệu mẫu nếu bảng đang trống
            Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM public.promotions", Integer.class);
            if (count != null && count == 0) {
                log.info("Chèn dữ liệu mã khuyến mãi mẫu khởi tạo...");
                jdbcTemplate.execute("""
                    INSERT INTO public.promotions 
                    (code, description, discount_type, discount_value, min_order_value, max_discount, start_date, end_date, usage_limit, used_count, is_active, created_at, updated_at)
                    VALUES
                    ('SMARTBOX2026', 'Ưu đãi mở bán đầu năm giảm 15% cho toàn bộ đơn hàng SmartBox', 'percentage', 15.00, 2000000.00, 500000.00, NOW(), NOW() + INTERVAL '1 year', 100, 34, true, NOW(), NOW()),
                    ('KTVFREESHIP', 'Miễn phí giao hàng & lắp đặt tận nơi cho hộ gia đình', 'fixed_amount', 150000.00, 1500000.00, NULL, NOW(), NOW() + INTERVAL '6 months', 200, 89, true, NOW(), NOW()),
                    ('VIPTECH500K', 'Voucher tri ân khách hàng doanh nghiệp lắp đặt trạm SmartBox Cluster', 'fixed_amount', 500000.00, 10000000.00, NULL, NOW(), NOW() + INTERVAL '9 months', 50, 12, true, NOW(), NOW()),
                    ('SUMMERFLASH', 'Flash sale hè giảm 10% dòng SmartBox Standard', 'percentage', 10.00, 1000000.00, 300000.00, NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 month', 80, 80, false, NOW(), NOW())
                    ON CONFLICT (code) DO NOTHING;
                """);
                log.info("Đã khởi tạo thành công 4 mã khuyến mãi mặc định vào Database.");
            }

            // 4. Khởi tạo Storage Bucket 'products' và phân quyền công khai trên Supabase Storage
            try {
                jdbcTemplate.execute("""
                    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
                    VALUES ('products', 'products', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
                    ON CONFLICT (id) DO UPDATE SET public = true;
                """);

                jdbcTemplate.execute("""
                    DO $$
                    BEGIN
                        DROP POLICY IF EXISTS "Public View Products" ON storage.objects;
                        DROP POLICY IF EXISTS "Allow All Upload Products" ON storage.objects;
                        DROP POLICY IF EXISTS "Allow All Update Products" ON storage.objects;
                        DROP POLICY IF EXISTS "Allow All Delete Products" ON storage.objects;

                        CREATE POLICY "Public View Products" ON storage.objects 
                            FOR SELECT USING (bucket_id = 'products');

                        CREATE POLICY "Allow All Upload Products" ON storage.objects 
                            FOR INSERT WITH CHECK (bucket_id = 'products');

                        CREATE POLICY "Allow All Update Products" ON storage.objects 
                            FOR UPDATE USING (bucket_id = 'products');

                        CREATE POLICY "Allow All Delete Products" ON storage.objects 
                            FOR DELETE USING (bucket_id = 'products');
                    END $$;
                """);
                log.info("Đã khởi tạo thành công Bucket 'products' và phân quyền upload trên Supabase Storage.");
            } catch (Exception ex) {
                log.warn("Lưu ý cấu hình storage bucket: {}", ex.getMessage());
            }
        } catch (Exception e) {
            log.warn("Lỗi khởi tạo hoặc đồng bộ bảng promotions: {}", e.getMessage());
        }
    }

    private void initMessageTemplates() {
        try {
            log.info("Khởi tạo cấu trúc và đồng bộ các mẫu thông báo message_templates...");
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS public.message_templates (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    code VARCHAR(100) NOT NULL UNIQUE,
                    name VARCHAR(255),
                    description TEXT,
                    channel VARCHAR(50) NOT NULL,
                    subject VARCHAR(255),
                    body TEXT NOT NULL,
                    variables TEXT,
                    is_active BOOLEAN DEFAULT true,
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            """);

            jdbcTemplate.execute("ALTER TABLE public.message_templates ADD COLUMN IF NOT EXISTS name VARCHAR(255);");
            jdbcTemplate.execute("ALTER TABLE public.message_templates ADD COLUMN IF NOT EXISTS description TEXT;");
            jdbcTemplate.execute("ALTER TABLE public.message_templates ADD COLUMN IF NOT EXISTS variables TEXT;");
            jdbcTemplate.execute("ALTER TABLE public.message_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;");
            jdbcTemplate.execute("ALTER TABLE public.message_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();");

            jdbcTemplate.execute("""
                INSERT INTO public.message_templates (code, name, description, channel, subject, body, variables, is_active, updated_at)
                VALUES 
                (
                  'OTP_RESET_PASSWORD', 
                  'Mã OTP Đặt Lại Mật Khẩu Hotline', 
                  'Gửi email mã OTP 6 số xác thực khi khách hàng liên hệ hotline tổng đài yêu cầu reset mật khẩu', 
                  'email', 
                  '🔒 [SmartBox] Mã OTP đặt lại mật khẩu: {{otp_code}}', 
                  '<p>Xin chào <strong>{{customer_name}}</strong>,</p><p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu tài khoản SmartBox của bạn qua Tổng đài hỗ trợ.</p><p>Mã OTP xác thực của bạn là: <span style="font-size:24px;font-weight:bold;color:#0284c7;letter-spacing:4px;">{{otp_code}}</span></p><p>Mã có hiệu lực trong vòng <strong>{{expire_minutes}} phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai!</p><p>Hotline hỗ trợ: {{hotline}}</p>',
                  'customer_name, otp_code, expire_minutes, hotline',
                  true,
                  NOW()
                ),
                (
                  'ORDER_CONFIRMED',
                  'Xác Nhận Đơn Hàng Mua SmartBox',
                  'Gửi email tự động ngay khi khách hàng đặt mua trạm SmartBox hoặc phụ kiện thành công',
                  'email',
                  '📦 [SmartBox] Xác nhận đơn hàng #{{order_id}} thành công',
                  '<p>Xin chào <strong>{{customer_name}}</strong>,</p><p>Cảm ơn bạn đã tin tưởng lựa chọn Hệ sinh thái Smart Delivery Box!</p><p>Đơn hàng <strong>#{{order_id}}</strong> với tổng thanh toán <strong>{{total_amount}}</strong> đã được tiếp nhận và đang được đóng gói chuẩn bị giao tới địa chỉ: <em>{{shipping_address}}</em>.</p><p>Phương thức thanh toán: <strong>{{payment_method}}</strong>.</p><p>Mọi thắc mắc xin vui lòng liên hệ tổng đài: {{hotline}}.</p>',
                  'customer_name, order_id, total_amount, shipping_address, payment_method, hotline',
                  true,
                  NOW()
                ),
                (
                  'ORDER_SHIPPING',
                  'Thông Báo Xuất Kho & Đang Giao Hàng',
                  'Gửi email / SMS khi đơn hàng được bàn giao cho đối tác vận chuyển GHTK / Viettel Post',
                  'email',
                  '🚚 [SmartBox] Đơn hàng #{{order_id}} đang trên đường giao tới bạn',
                  '<p>Xin chào <strong>{{customer_name}}</strong>,</p><p>Đơn hàng <strong>#{{order_id}}</strong> của bạn đã được xuất kho và bàn giao cho đơn vị vận chuyển <strong>{{shipping_carrier}}</strong>.</p><p>Mã vận đơn tra cứu hành trình: <strong style="color:#0284c7;">{{tracking_number}}</strong>.</p><p>Thời gian dự kiến giao hàng: <strong>{{estimated_delivery}}</strong>.</p><p>Vui lòng chú ý điện thoại để nhận hàng.</p>',
                  'customer_name, order_id, shipping_carrier, tracking_number, estimated_delivery, hotline',
                  true,
                  NOW()
                ),
                (
                  'PARCEL_DELIVERED',
                  'Bưu Kiện Đã Được Bỏ Vào Tủ SmartBox',
                  'Tin nhắn SMS / Thông báo gửi ngay khi Shipper bỏ bưu kiện vào tủ và chốt cửa thành công',
                  'sms',
                  'SmartBox - Bưu kiện mới đã đến',
                  '[SmartBox] Chào {{customer_name}}, bưu kiện mới đã được giao vào trạm {{device_name}} (Trọng lượng: {{weight_kg}}kg). Mã PIN mở tủ: {{pickup_pin}}. Hotline: {{hotline}}',
                  'customer_name, device_name, weight_kg, pickup_pin, address, hotline',
                  true,
                  NOW()
                ),
                (
                  'WARRANTY_COMPLETED',
                  'Nghiệm Thu & Hoàn Tất Sửa Chữa Thiết Bị',
                  'Gửi email thông báo cho khách hàng khi kỹ thuật viên hoàn tất sửa chữa và kiểm định linh kiện',
                  'email',
                  '✅ [SmartBox] Thiết bị {{device_name}} đã hoàn tất bảo hành và nghiệm thu',
                  '<p>Xin chào <strong>{{customer_name}}</strong>,</p><p>Yêu cầu bảo hành <strong>#{{claim_id}}</strong> cho thiết bị <strong>{{device_name}}</strong> (Số Serial: {{serial_number}}) đã được xử lý hoàn tất bởi kỹ thuật viên <strong>{{technician_name}}</strong>.</p><p>Nội dung nghiệm thu: <em>{{inspection_summary}}</em>.</p><p>Thiết bị đã được kiểm định đầy đủ 4 tiêu chí an toàn và sẵn sàng bàn giao lại cho bạn.</p>',
                  'customer_name, claim_id, device_name, serial_number, technician_name, inspection_summary, hotline',
                  true,
                  NOW()
                ),
                (
                  'DEVICE_ALERT_CRITICAL',
                  'Cảnh Báo Sự Cố Thiết Bị IoT Khẩn Cấp',
                  'Thông báo đẩy / Email gửi tức thì khi cảm biến phát hiện nắp kẹt hoặc pin yếu dưới 15%',
                  'push',
                  '🚨 [SmartBox Cảnh Báo] Phát hiện sự cố trạm {{device_name}}',
                  'Cảnh báo: Trạm SmartBox [{{device_name}} - {{serial_number}}] phát hiện sự cố: {{alert_type}} lúc {{time_occurred}} (Mức pin: {{battery_level}}%). Vui lòng kiểm tra trên ứng dụng quản trị!',
                  'customer_name, device_name, serial_number, alert_type, battery_level, time_occurred, hotline',
                  true,
                  NOW()
                )
                ON CONFLICT (code) DO UPDATE SET
                  name = EXCLUDED.name,
                  description = EXCLUDED.description,
                  variables = EXCLUDED.variables;
            """);
            log.info("Đã đồng bộ thành công 6 mẫu thông báo chuẩn vào bảng message_templates.");
        } catch (Exception ex) {
            log.warn("Lỗi khởi tạo hoặc đồng bộ bảng message_templates: {}", ex.getMessage());
        }
    }
}
