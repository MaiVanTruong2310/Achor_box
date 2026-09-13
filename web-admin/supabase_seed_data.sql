-- ==============================================================================
-- SMART DELIVERY BOX - SEED DATA SCRIPT (KHỚP 100% CẤU TRÚC SUPABASE HIỆN TẠI)
-- ==============================================================================

DO $$
DECLARE
  v_admin_id UUID;
  v_user1_id UUID;
  v_user2_id UUID;
  v_user3_id UUID;

  v_cat_iot_id UUID := '11111111-1111-1111-1111-111111111111';
  v_cat_acc_id UUID := '22222222-2222-2222-2222-222222222222';

  v_prod_std_id UUID := '33333333-3333-3333-3333-333333333331';
  v_prod_pro_id UUID := '33333333-3333-3333-3333-333333333332';
  v_prod_keypad_id UUID := '33333333-3333-3333-3333-333333333333';
  v_prod_solar_id UUID := '33333333-3333-3333-3333-333333333334';

  v_dev1_id UUID := '44444444-4444-4444-4444-444444444441';
  v_dev2_id UUID := '44444444-4444-4444-4444-444444444442';
  v_dev3_id UUID := '44444444-4444-4444-4444-444444444443';
  v_dev4_id UUID := '44444444-4444-4444-4444-444444444444';

  v_ord1_id UUID := '55555555-5555-5555-5555-555555555551';
  v_ord2_id UUID := '55555555-5555-5555-5555-555555555552';
  v_ord3_id UUID := '55555555-5555-5555-5555-555555555553';

  v_item1_id UUID := '66666666-6666-6666-6666-666666666661';
  v_item2_id UUID := '66666666-6666-6666-6666-666666666662';

  v_war1_id UUID := '77777777-7777-7777-7777-777777777771';
  v_war2_id UUID := '77777777-7777-7777-7777-777777777772';
  v_war3_id UUID := '77777777-7777-7777-7777-777777777773';

BEGIN
  -- 1. Lấy ID tài khoản Admin hiện có hoặc tạo ID mẫu
  SELECT id INTO v_admin_id FROM auth.users LIMIT 1;
  IF v_admin_id IS NULL THEN
    v_admin_id := gen_random_uuid();
  END IF;

  v_user1_id := gen_random_uuid();
  v_user2_id := gen_random_uuid();
  v_user3_id := gen_random_uuid();

  -- 2. CẬP NHẬT/TẠO PROFILES
  INSERT INTO public.profiles (id, full_name, phone, default_address, role, is_locked)
  VALUES 
    (v_admin_id, 'Tổng Quản Trị Hệ Thống', '0901234567', 'Trụ sở SmartBox VN', 'super_admin'::user_role, FALSE)
  ON CONFLICT (id) DO UPDATE SET role = 'super_admin'::user_role, full_name = 'Tổng Quản Trị Hệ Thống';

  -- 3. DANH MỤC SẢN PHẨM (product_categories)
  INSERT INTO public.product_categories (id, name, slug)
  VALUES 
    (v_cat_iot_id, 'Hộp Nhận Hàng IoT', 'hop-nhan-hang-iot'),
    (v_cat_acc_id, 'Phụ Kiện & Linh Kiện', 'phu-kien-linh-kien')
  ON CONFLICT (id) DO NOTHING;

  -- 4. SẢN PHẨM (products)
  INSERT INTO public.products (id, category_id, sku, name, description, price, images, stock_quantity, is_active)
  VALUES
    (v_prod_std_id, v_cat_iot_id, 'SDB-STD-01', 'Hộp nhận hàng thông minh SmartBox Standard (Bản Tiêu Chuẩn)', 'Tích hợp cảm biến siêu âm HC-SR04, chốt điện cơ học, kết nối Wi-Fi MQTT và nạp năng lượng mặt trời.', 1850000, '["https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400"]'::jsonb, 42, true),
    (v_prod_pro_id, v_cat_iot_id, 'SDB-PRO-02', 'Hộp nhận hàng thông minh SmartBox Pro (Bản Cao Cấp)', 'Bổ sung cảm biến cân nặng Loadcell 24-bit HX711, bàn phím mã PIN Keypad kim loại chống nước IP65, pin sạc dự phòng 10.000mAh.', 2650000, '["https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=400"]'::jsonb, 6, true),
    (v_prod_keypad_id, v_cat_acc_id, 'ACC-KEYPAD-01', 'Phụ kiện: Bàn phím chống nước Keypad 4x4 kim loại', 'Bàn phím nhập mã PIN dự phòng lắp ngoài trời chống mưa bụi IP65, giao tiếp GPIO ma trận.', 150000, '["https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=400"]'::jsonb, 85, true),
    (v_prod_solar_id, v_cat_acc_id, 'ACC-SOLAR-02', 'Phụ kiện: Tấm pin năng lượng mặt trời 10W IP67', 'Tấm pin quang năng mini kèm mạch sạc MPPT chống chai pin Li-ion cho ESP32.', 280000, '["https://images.unsplash.com/photo-1509391365360-2e959784a276?w=400"]'::jsonb, 15, true)
  ON CONFLICT (id) DO NOTHING;

  -- 5. THIẾT BỊ IOT (devices)
  INSERT INTO public.devices (id, product_id, owner_id, serial_number, name, location_label, status, battery_level, firmware_version, last_seen_at)
  VALUES
    (v_dev1_id, v_prod_std_id, v_admin_id, 'BOX-2026-001', 'Hộp nhận hàng cổng chính', 'Hà Đông, Hà Nội', 'online'::device_status, 95, 'v1.2.0', NOW()),
    (v_dev2_id, v_prod_pro_id, v_admin_id, 'BOX-2026-002', 'SmartBox Ban Công Biệt Thự', 'Quận 7, TP.HCM', 'online'::device_status, 88, 'v1.2.0', NOW()),
    (v_dev3_id, v_prod_std_id, v_admin_id, 'BOX-2026-003', 'Hộp nhận hàng gia đình', 'Thanh Xuân, Hà Nội', 'error'::device_status, 14, 'v1.1.8', NOW() - INTERVAL '15 minutes'),
    (v_dev4_id, v_prod_pro_id, v_admin_id, 'BOX-PRO-004', 'Hộp SmartBox Cửa Hàng', 'Hải Châu, Đà Nẵng', 'maintenance'::device_status, 62, 'v1.2.0', NOW() - INTERVAL '30 minutes')
  ON CONFLICT (id) DO NOTHING;

  -- 6. SỰ KIỆN CẢM BIẾN TELEMETRY (device_events)
  INSERT INTO public.device_events (device_id, event_type, payload, created_at)
  VALUES
    (v_dev1_id, 'WEIGHT_STABLE', '{"weight_grams": 450, "delta_grams": 450, "tare_applied": true}'::jsonb, NOW() - INTERVAL '10 minutes'),
    (v_dev1_id, 'SERVO_LOCKED', '{"lock_state": "locked", "angle_deg": 90, "duration_ms": 320}'::jsonb, NOW() - INTERVAL '12 minutes'),
    (v_dev1_id, 'ULTRASONIC_TRIGGER', '{"distance_cm": 8.4, "threshold_cm": 15.0, "parcel_present": true}'::jsonb, NOW() - INTERVAL '13 minutes'),
    (v_dev3_id, 'SENSOR_ECHO_TIMEOUT', '{"sensor": "HC-SR04", "error_code": "E_ECHO_TIMEOUT_15M"}'::jsonb, NOW() - INTERVAL '15 minutes'),
    (v_dev4_id, 'BATTERY_LOW_WARNING', '{"voltage_v": 3.42, "battery_pct": 12}'::jsonb, NOW() - INTERVAL '25 minutes')
  ON CONFLICT (id) DO NOTHING;

  -- 7. ĐƠN HÀNG (orders)
  INSERT INTO public.orders (id, user_id, status, shipping_address, tracking_number, total, created_at)
  VALUES
    (v_ord1_id, v_admin_id, 'processing'::order_status, 'Số 12 Chùa Bộc, Đống Đa, Hà Nội', 'VNPOST-8891230', 2650000, NOW() - INTERVAL '2 hours'),
    (v_ord2_id, v_admin_id, 'shipping'::order_status, 'Tòa nhà Landmark 81, Bình Thạnh, TP.HCM', 'GHTK-9901234', 1850000, NOW() - INTERVAL '1 day'),
    (v_ord3_id, v_admin_id, 'completed'::order_status, 'Số 45 Lê Duẩn, Quận Hải Châu, Đà Nẵng', 'EMS-VN-556102', 5580000, NOW() - INTERVAL '2 days')
  ON CONFLICT (id) DO NOTHING;

  -- 8. CHI TIẾT ĐƠN HÀNG (order_items)
  INSERT INTO public.order_items (id, order_id, product_id, quantity, unit_price)
  VALUES
    (v_item1_id, v_ord1_id, v_prod_pro_id, 1, 2650000),
    (v_item2_id, v_ord2_id, v_prod_std_id, 1, 1850000)
  ON CONFLICT (id) DO NOTHING;

  -- 9. BẢO HÀNH (warranties)
  INSERT INTO public.warranties (id, order_item_id, device_id, start_date, end_date, status)
  VALUES
    (v_war1_id, v_item1_id, v_dev1_id, CURRENT_DATE - 30, CURRENT_DATE + 335, 'active'::warranty_status),
    (v_war2_id, v_item2_id, v_dev2_id, CURRENT_DATE - 60, CURRENT_DATE + 305, 'active'::warranty_status),
    (v_war3_id, v_item1_id, v_dev3_id, CURRENT_DATE - 90, CURRENT_DATE + 275, 'active'::warranty_status)
  ON CONFLICT (id) DO NOTHING;

  -- 10. YÊU CẦU BẢO HÀNH (warranty_claims)
  INSERT INTO public.warranty_claims (id, warranty_id, description, images, status, assigned_to, internal_notes, created_at)
  VALUES
    (gen_random_uuid(), v_war1_id, 'Cảm biến siêu âm HC-SR04 không nhận diện kiện hàng khi shipper bỏ gói hàng vào thùng.', '["https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500"]'::jsonb, 'new'::claim_status, NULL, 'Cần đo kiểm tín hiệu Trigger/Echo chân GPIO 19 của ESP32.', NOW() - INTERVAL '2 hours'),
    (gen_random_uuid(), v_war2_id, 'Động cơ Servo MG90S bị kẹt chốt cơ học khi gặp độ ẩm cao sau cơn mưa lớn. Nắp không đóng kín.', '["https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=500"]'::jsonb, 'in_progress'::claim_status, v_admin_id, 'Đã gửi linh kiện chốt khóa chống rỉ hợp kim nhôm.', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), v_war3_id, 'Mạch giải mã HX711 báo sai cân nặng (lệch khoảng 350g so với trọng lượng thực tế).', '["https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=500"]'::jsonb, 'resolved'::claim_status, v_admin_id, 'Đã nạp lại Firmware hiệu chuẩn Tare cân từ xa (OTA).', NOW() - INTERVAL '3 days')
  ON CONFLICT (id) DO NOTHING;

  -- 11. NHẬT KÝ QUẢN TRỊ (audit_logs)
  INSERT INTO public.audit_logs (actor_id, action, target_table, target_id, meta, created_at)
  VALUES
    (v_admin_id, 'UPDATE_STATUS', 'orders', v_ord2_id, '{"old_status": "processing", "new_status": "shipping"}'::jsonb, NOW() - INTERVAL '1 hour'),
    (v_admin_id, 'ASSIGN_CLAIM', 'warranty_claims', v_war2_id, '{"action": "send_replacement_part"}'::jsonb, NOW() - INTERVAL '4 hours');

  -- 12. PHƯƠNG THỨC THANH TOÁN & VẬN CHUYỂN
  INSERT INTO public.payment_methods (name, is_active)
  VALUES ('Thanh toán khi nhận hàng (COD)', true), ('VNPay QR', true), ('Ví MoMo', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.shipping_methods (name, fee, is_active)
  VALUES ('Giao Hàng Tiết Kiệm (GHTK)', 30000, true), ('Viettel Post', 35000, true)
  ON CONFLICT DO NOTHING;

  -- 13. MẪU TIN NHẮN (message_templates)
  INSERT INTO public.message_templates (code, channel, subject, body)
  VALUES 
    ('ORDER_CONFIRMED', 'email', '[SmartBox] Xác nhận đơn hàng thành công', 'Cảm ơn bạn đã mua Smart Delivery Box. Đơn hàng #[ORDER_ID] đang được xử lý.'),
    ('WARRANTY_RECEIVED', 'sms', NULL, 'SmartBox đã tiếp nhận yêu cầu bảo hành #[TICKET_ID]. Kỹ thuật viên sẽ liên hệ trong 24h.')
  ON CONFLICT (code) DO NOTHING;

END $$;
