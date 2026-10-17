# -*- coding: utf-8 -*-
import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def create_document():
    doc = Document()
    
    # Page Margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.2)
        section.right_margin = Inches(1.0)
        
    # Styles Setup
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(13)
    normal_style.font.color.rgb = RGBColor(0x22, 0x22, 0x22)
    normal_style.paragraph_format.line_spacing = 1.25
    normal_style.paragraph_format.space_after = Pt(4)

    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = p_title.add_run("BỘ GIÁO DỤC VÀ ĐÀO TẠO — TRƯỜNG ĐẠI HỌC\n")
    run_sub.font.bold = True
    run_sub.font.size = Pt(12)
    
    p_main_title = doc.add_paragraph()
    p_main_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_main_title.paragraph_format.space_before = Pt(12)
    p_main_title.paragraph_format.space_after = Pt(6)
    run_t = p_main_title.add_run("ĐỀ CƯƠNG ĐỒ ÁN TỐT NGHỆP\n")
    run_t.font.bold = True
    run_t.font.size = Pt(18)
    run_t.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D) # Navy Blue
    
    run_topic = p_main_title.add_run("XÂY DỰNG HỆ THỐNG HỘP NHẬN HÀNG THÔNG MINH SỬ DỤNG IoT VÀ ỨNG DỤNG DI ĐỘNG\n")
    run_topic.font.bold = True
    run_topic.font.size = Pt(15)
    run_topic.font.color.rgb = RGBColor(0xC0, 0x00, 0x00) # Dark Red

    run_eng = p_main_title.add_run("Tên tiếng Anh: Development of an IoT-based Smart Delivery Box with a Mobile Application\n")
    run_eng.font.italic = True
    run_eng.font.size = Pt(12)
    run_eng.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    def add_heading_1(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(14)
        h.paragraph_format.space_after = Pt(6)
        h.paragraph_format.keep_with_next = True
        r = h.add_run(text)
        r.font.bold = True
        r.font.size = Pt(14)
        r.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)
        return h

    def add_heading_2(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(10)
        h.paragraph_format.space_after = Pt(4)
        h.paragraph_format.keep_with_next = True
        r = h.add_run(text)
        r.font.bold = True
        r.font.size = Pt(13)
        r.font.color.rgb = RGBColor(0x2E, 0x75, 0xB6)
        return h

    # Section 1
    add_heading_1("1. Lý do chọn đề tài")
    p = doc.add_paragraph(
        "Hiện nay, cùng với sự bùng nổ của thương mại điện tử và các dịch vụ giao hàng tận nơi (Express Delivery, E-commerce), nhu cầu nhận hàng tại nhà của người dân ngày càng lớn. Tuy nhiên, trong nhiều trường hợp thực tế, người nhận không có mặt tại nhà khi nhân viên giao hàng (Shipper) đến. Việc để hàng hóa phía trước cửa nhà hoặc nhờ người quen nhận hộ dễ dẫn đến nguy cơ thất lạc, hư hỏng do thời tiết hoặc ảnh hưởng đến sự an toàn, riêng tư của đơn hàng."
    )
    p = doc.add_paragraph(
        "Đề tài hướng đến việc nghiên cứu và xây dựng một Hộp nhận hàng thông minh (Smart Delivery Box) có khả năng tự động tiếp nhận, xác thực và bảo quản hàng hóa an toàn khi người dùng không có mặt tại nhà."
    )
    p = doc.add_paragraph(
        "Hệ thống sử dụng vi điều khiển ESP32 làm bộ điều khiển trung tâm, kết hợp với cụm cảm biến HC-SR04 (phát hiện hàng), cảm biến từ MC-38 (xác định trạng thái nắp hộp) và cảm biến trọng lượng Load Cell + HX711 (đo khối lượng hàng). Thiết bị kết nối Internet qua Wi-Fi và giao tiếp thời gian thực với server qua giao thức MQTT. Người dùng sử dụng ứng dụng di động Flutter để giám sát thiết bị, nhận thông báo đẩy tức thì và điều khiển đóng/mở khóa từ xa."
    )

    # Section 2
    add_heading_1("2. Mục tiêu đề tài")
    add_heading_2("2.1. Mục tiêu tổng quát")
    p = doc.add_paragraph("Xây dựng một mô hình hoàn chỉnh của Hệ thống Hộp nhận hàng thông minh đáp ứng các tiêu chuẩn:")
    bullet_items = [
        "Tự động phát hiện khi có hàng hóa được đặt vào bên trong hộp.",
        "Xác định chính xác trạng thái đóng/mở nắp hộp thông qua cảm biến từ.",
        "Đo lường và hiển thị chính xác khối lượng của gói hàng.",
        "Tự động kích hoạt cơ cấu Servo khóa hộp ngay sau khi nắp được đóng kín.",
        "Cho phép người dùng theo dõi và điều khiển mở khóa hộp từ xa thông qua App di động.",
        "Gửi thông báo thời gian thực (Push Notification) đến điện thoại thông minh ngay khi giao nhận hàng thành công.",
        "Lưu trữ toàn bộ nhật ký sự kiện và lịch sử giao nhận hàng vào cơ sở dữ liệu.",
        "Hiển thị trực quan trực tuyến trạng thái hộp, cảm biến và kết nối trên Dashboard di động."
    ]
    for b in bullet_items:
        p_b = doc.add_paragraph(b, style='List Bullet')
        p_b.paragraph_format.space_after = Pt(2)

    add_heading_2("2.2. Mục tiêu cụ thể")
    p = doc.add_paragraph("Các nhiệm vụ kỹ thuật cụ thể bao gồm:")
    specific_goals = [
        "Thiết kế cơ khí và mô hình phần cứng của hộp nhận hàng.",
        "Lập trình Firmware C++ cho ESP32 để xử lý tín hiệu cảm biến và điều khiển khóa.",
        "Thiết lập kết nối mạng Wi-Fi và giao thức MQTT Broker thời gian thực.",
        "Xây dựng hệ thống Backend API (Node.js/Spring Boot) quản lý thiết bị và người dùng.",
        "Thiết kế Cơ sở dữ liệu PostgreSQL lưu trữ lịch sử giao dịch và nhật ký sự kiện.",
        "Phát triển Ứng dụng di động Flutter đa nền tảng (iOS/Android).",
        "Triển khai cơ chế xác thực người dùng và mã PIN bảo mật.",
        "Xây dựng và tích hợp hệ thống thông báo đẩy (Notification Engine).",
        "Tiến hành thử nghiệm, đánh giá độ tin cậy và hoàn thiện mô hình thực tế."
    ]
    for sg in specific_goals:
        p_sg = doc.add_paragraph(sg, style='List Bullet')
        p_sg.paragraph_format.space_after = Pt(2)

    # Section 3
    add_heading_1("3. Đối tượng và phạm vi nghiên cứu")
    add_heading_2("3.1. Đối tượng nghiên cứu")
    p = doc.add_paragraph("– Công nghệ Internet of Things (IoT) và giao thức truyền thông không dây.\n"
                          "– Vi điều khiển ESP32 DevKit V1 (Wi-Fi & Bluetooth Dual Core).\n"
                          "– Các cảm biến phụ trợ: HC-SR04 (Siêu âm), MC-38 (Từ tính), Load Cell 5kg + Module HX711.\n"
                          "– Chấp hành: Dong cơ Servo MG90S kim loại.\n"
                          "– Giao thức truyền thông thời gian thực MQTT & WebSocket.\n"
                          "– Hệ quản trị CSDL PostgreSQL & Backend RESTful API.\n"
                          "– Khung phát triển ứng dụng di động Flutter / Dart.")

    add_heading_2("3.2. Phạm vi đề tài")
    p = doc.add_paragraph("– Đề tài tập trung thiết kế và triển khai mô hình thử nghiệm dạng Prototype đạt chuẩn Production Architecture.\n"
                          "– Quy mô áp dụng: 1 Hộp nhận hàng thông minh, 1 Thiết bị vi điều khiển ESP32, 1 Tài khoản quản trị chính trên ứng dụng di động.\n"
                          "– Các chức năng như nhận diện khuôn mặt AI, GPS tracking hay tích hợp trực tiếp API sàn thương mại điện tử (Shopee, Lazada) được xem là hướng phát triển nâng cao trong tương lai.")

    # Section 4
    add_heading_1("4. Kiến trúc hệ thống")
    p = doc.add_paragraph("Hệ thống được thiết kế theo sơ đồ dòng dữ liệu 3 lớp (3-Tier IoT Architecture): Lớp Thiết bị (Device Layer), Lớp Mạng & Broker (Network Layer), và Lớp Ứng dụng & Dịch vụ (Application Layer).")
    
    # Textual diagram representation box
    p_diag = doc.add_paragraph()
    p_diag.paragraph_format.space_before = Pt(6)
    p_diag.paragraph_format.space_after = Pt(6)
    r_diag = p_diag.add_run(
        "┌────────────────────────────────────────────────────────────────────────┐\n"
        "│                        FLUTTER MOBILE APP                              │\n"
        "└───────────────────┬────────────────────────────────┬───────────────────┘\n"
        "                    │ REST API (HTTPS)               │ MQTT (WebSocket)\n"
        "                    ▼                                ▼\n"
        "┌──────────────────────────────────────┐   ┌─────────────────────────────┐\n"
        "│            BACKEND SERVER            │───│         DATABASE            │\n"
        "│  (Express/Spring Boot API & Service) │   │        PostgreSQL           │\n"
        "└───────────────────┬──────────────────┘   └─────────────────────────────┘\n"
        "                    │ MQTT Commands\n"
        "                    ▼\n"
        "┌────────────────────────────────────────────────────────────────────────┐\n"
        "│                           MQTT BROKER                                  │\n"
        "│                       (EMQX / Mosquitto)                               │\n"
        "└───────────────────────────────────┬────────────────────────────────────┘\n"
        "                                    │ Wi-Fi MQTT (Pub/Sub)\n"
        "                                    ▼\n"
        "┌────────────────────────────────────────────────────────────────────────┐\n"
        "│                        ESP32 DEVKIT V1 FIRMWARE                        │\n"
        "├───────────────┬──────────────────┬─────────────────┬───────────────────┤\n"
        "│  Cảm biến     │    Cảm biến      │    Cảm biến     │    Chấp hành &    │\n"
        "│ HC-SR04       │     MC-38        │  HX711/LoadCell │ Keypad, Servo, LED│\n"
        "└───────────────┴──────────────────┴─────────────────┴───────────────────┘"
    )
    r_diag.font.name = 'Consolas'
    r_diag.font.size = Pt(9.5)
    r_diag.font.color.rgb = RGBColor(0x33, 0x33, 0x33)

    # Section 5
    add_heading_1("5. Thành phần phần cứng và Linh kiện")
    
    table_hw = doc.add_table(rows=1, cols=4)
    table_hw.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr_cells = table_hw.rows[0].cells
    headers = ['Linh kiện', 'Thông số kỹ thuật', 'Chức năng trong hệ thống', 'Chân kết nối ESP32']
    for i, h in enumerate(headers):
        hdr_cells[i].text = h
        hdr_cells[i].paragraphs[0].runs[0].font.bold = True
        hdr_cells[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        set_cell_background(hdr_cells[i], '1B365D')

    hw_data = [
        ('ESP32 DevKit V1', 'Dual-core Xtensa 240MHz, Wi-Fi 802.11 b/g/n, BLE', 'Bộ điều khiển trung tâm xử lý dữ liệu, Wi-Fi, MQTT & Servo', 'Trung tâm'),
        ('HC-SR04', 'Siêu âm 2cm - 400cm, góc quét 15 độ, 5V DC', 'Đo khoảng cách để phát hiện có hàng hóa xuất hiện trong hộp', 'Trig: D5, Echo: D18'),
        ('MC-38 Reed Switch', 'Công tắc từ đóng/ngắt tiếp điểm, PULL-UP', 'Phát hiện trạng thái ĐÓNG / MỞ của nắp hộp nhận hàng', 'D15 (Internal Pullup)'),
        ('Load Cell 5kg + HX711', 'Độ phân giải 24-bit ADC, tải trọng tối đa 5kg', 'Đo khối lượng chính xác của kiện hàng vừa giao', 'DT: D19, SCK: D21'),
        ('MG90S Servo', 'Mô-men xoắn 2.2kg/cm, bánh răng kim loại, 180 độ', 'Điều khiển chốt khóa mở (90 độ) hoặc khóa (0 độ)', 'PWM: D13'),
        ('Keypad 4x4', 'Bàn phím ma trận 16 phím cơ bấm', 'Nhập mã PIN mật khẩu mở khóa trực tiếp tại thiết bị', 'Rows: 12,14,27,26 | Cols: 25,33,32,35'),
        ('Buzzer & Dual LED', 'Active Buzzer 5V, LED Red/Green 3mm', 'Phát âm thanh bíp và hiển thị trạng thái ổ khóa / sai PIN', 'Red: D4, Green: D16, Buzz: D17')
    ]

    for row in hw_data:
        row_cells = table_hw.add_row().cells
        for i, val in enumerate(row):
            row_cells[i].text = val
            row_cells[i].paragraphs[0].runs[0].font.size = Pt(10.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # Section 6 & 7 & 8
    add_heading_1("6. Firmware & Giao thức MQTT")
    p = doc.add_paragraph(
        "Firmware được lập trình bằng C++ chuẩn modular clean architecture trên nền tảng PlatformIO. Cấu trúc chương trình áp dụng mô hình Máy trạng thái hữu hạn (Finite State Machine - FSM) gồm 5 trạng thái chính: WAITING, DOOR_OPEN, PACKAGE_PLACED, DOOR_CLOSED, LOCKED_STATE."
    )
    
    add_heading_2("Cấu trúc các Topic MQTT chuẩn & Supabase Realtime Sync:")
    mqtt_topics = [
        ("delivery_box/001/status", "ESP32 -> MQTT -> Supabase", '{"box_id":"001", "door":"closed", "lock":"locked"}'),
        ("delivery_box/001/sensor", "ESP32 -> MQTT -> Supabase", '{"box_id":"001", "package_detected":true, "weight":1.42, "distance_cm":8.5}'),
        ("delivery_box/001/command", "App/Supabase -> ESP32", '{"action":"UNLOCK", "requested_by":"Owner_Mobile_App"}'),
        ("delivery_box/001/event", "ESP32 -> Supabase Realtime", '{"box_id":"001", "event_type":"PACKAGE_DELIVERED", "description":"Package 1.42kg received"}')
    ]
    
    t_mqtt = doc.add_table(rows=1, cols=3)
    t_mqtt.alignment = WD_TABLE_ALIGNMENT.CENTER
    h_m = t_mqtt.rows[0].cells
    h_m[0].text = "Topic MQTT"
    h_m[1].text = "Hướng truyền"
    h_m[2].text = "Cấu trúc Payload (JSON)"
    for i in range(3):
        h_m[i].paragraphs[0].runs[0].font.bold = True
        h_m[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        set_cell_background(h_m[i], '2E75B6')

    for row in mqtt_topics:
        r_c = t_mqtt.add_row().cells
        r_c[0].text = row[0]
        r_c[1].text = row[1]
        r_c[2].text = row[2]
        r_c[0].paragraphs[0].runs[0].font.name = 'Consolas'
        r_c[0].paragraphs[0].runs[0].font.size = Pt(9.5)
        r_c[2].paragraphs[0].runs[0].font.name = 'Consolas'
        r_c[2].paragraphs[0].runs[0].font.size = Pt(9.0)

    # Section 7 & 8
    add_heading_1("7. Backend API & Cơ sở dữ liệu Supabase PostgreSQL (Schema v2)")
    p = doc.add_paragraph(
        "Hệ thống Cơ sở dữ liệu áp dụng nền tảng Supabase Cloud với CSDL PostgreSQL (phiên bản v2 nâng cấp). Mô hình dữ liệu phân chia rõ ràng giữa Trạng thái biến đổi (Mutable State) và Nhật ký không thể thay đổi (Immutable Fact), kết hợp cơ chế bảo mật Row Level Security (RLS) ngăn chặn giả mạo dữ liệu từ phía Client:"
    )
    
    db_schema_text = (
        "1. user_profiles (id UUID -> auth.users, full_name, fcm_token, created_at)\n"
        "2. delivery_boxes (id, name, user_id, pincode_hash, door_status, lock_status, package_detected, current_weight, current_distance_cm, is_online, last_seen_at, updated_at)\n"
        "3. packages (id UUID, box_id, weight, detected_at, collected_at, status)\n"
        "4. sensor_data (id BIGSERIAL, box_id, distance_cm, weight_kg, door_status, created_at) [Index: box_id + created_at DESC]\n"
        "5. events (id UUID, box_id, event_type, description, created_at)"
    )
    p_db = doc.add_paragraph()
    r_db = p_db.add_run(db_schema_text)
    r_db.font.name = 'Consolas'
    r_db.font.size = Pt(9.5)
    r_db.font.color.rgb = RGBColor(0x22, 0x55, 0x22)

    p_rls = doc.add_paragraph(
        "★ Nguyên tắc Bảo mật RLS (Row Level Security):\n"
        "– Khách hàng (User App) CHỈ ĐƯỢC PHÉP ĐỌC (SELECT) trạng thái hộp và lịch sử của chính mình qua JWT Auth UID.\n"
        "– Mọi thao tác cập nhật trạng thái ổ khóa, nắp hộp hay khối lượng bắt buộc phải thông qua Service Role (Backend/MQTT Bridge) để đảm bảo tính xác thực từ phần cứng ESP32 thật."
    )
    p_rls.runs[0].font.bold = True
    p_rls.runs[0].font.color.rgb = RGBColor(0xC0, 0x00, 0x00)

    # Section 9 & 10
    add_heading_1("8. Quy trình Hoạt động 8 Bước Chi tiết")
    flow_steps = [
        ("Bước 1: Trạng thái chờ (WAITING)", "Hộp đóng, khóa Servo đóng (0 độ), hộp trống. Đèn LED đỏ sáng."),
        ("Bước 2: Shipper mở hộp", "Shipper mở nắp hộp -> Cảm biến MC-38 hở (HIGH) -> Chuyển sang DOOR_OPEN."),
        ("Bước 3: Đặt hàng vào hộp", "Hàng được đặt vào -> HC-SR04 đo khoảng cách < 15cm, Load Cell đo trọng lượng > 50g -> Chuyển sang PACKAGE_PLACED."),
        ("Bước 4: Shipper đóng nắp", "Shipper đóng nắp hộp -> MC-38 tiếp xúc (LOW) -> Chuyển sang DOOR_CLOSED."),
        ("Bước 5: Tự động khóa", "ESP32 điều khiển Servo quay về 0 độ (LOCKED) lập tức sau khi nắp đóng."),
        ("Bước 6: Gửi dữ liệu MQTT", "ESP32 gửi gói tin JSON chứa trọng lượng, khoảng cách và trạng thái lên MQTT Broker."),
        ("Bước 7: Thông báo App", "Backend/MQTT Service nhận gói tin và gửi thông báo Push Notification tới điện thoại người dùng."),
        ("Bước 8: Người dùng nhận hàng", "Chủ nhà bấm [🔓 UNLOCK] trên App hoặc nhập PIN 2310 trên Keypad -> Servo quay 90 độ -> Lấy hàng -> Tự động tare cân về 0.")
    ]
    
    for title, desc in flow_steps:
        p_fs = doc.add_paragraph()
        r_t = p_fs.add_run(f"• {title}: ")
        r_t.font.bold = True
        r_t.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)
        r_d = p_fs.add_run(desc)
        p_fs.paragraph_format.space_after = Pt(3)

    # Section 13
    add_heading_1("9. Dự toán Chi phí Phần cứng")
    table_cost = doc.add_table(rows=1, cols=3)
    table_cost.alignment = WD_TABLE_ALIGNMENT.CENTER
    h_c = table_cost.rows[0].cells
    h_c[0].text = "Hạng mục linh kiện"
    h_c[1].text = "Số lượng"
    h_c[2].text = "Chi phí dự kiến (VNĐ)"
    for i in range(3):
        h_c[i].paragraphs[0].runs[0].font.bold = True
        h_c[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        set_cell_background(h_c[i], '1B365D')

    costs = [
        ("Mạch ESP32 DevKit V1", "1", "120.000 - 150.000"),
        ("Cảm biến siêu âm HC-SR04", "1", "20.000 - 30.000"),
        ("Cảm biến từ MC-38", "1", "10.000 - 15.000"),
        ("Load Cell 5kg + Module HX711", "1 bộ", "60.000 - 90.000"),
        ("Động cơ Servo MG90S (Kim loại)", "1", "45.000 - 60.000"),
        ("Bàn phím ma trận Keypad 4x4", "1", "25.000 - 35.000"),
        ("Buzzer còi báo + LED + Trở", "1 bộ", "15.000 - 20.000"),
        ("Vật liệu khung hộp & Dây nối", "1 bộ", "150.000 - 250.000"),
        ("TỔNG CHI PHÍ DỰ KIẾN", "Hoàn chỉnh", "445.000 - 650.000 VNĐ")
    ]

    for row in costs:
        r_cells = table_cost.add_row().cells
        r_cells[0].text = row[0]
        r_cells[1].text = row[1]
        r_cells[2].text = row[2]
        if row[0].startswith("TỔNG"):
            r_cells[0].paragraphs[0].runs[0].font.bold = True
            r_cells[2].paragraphs[0].runs[0].font.bold = True
            r_cells[2].paragraphs[0].runs[0].font.color.rgb = RGBColor(0xC0, 0x00, 0x00)

    # Section 16 & 17
    add_heading_1("10. Tiến độ Thực hiện & Sản phẩm Bàn giao")
    p = doc.add_paragraph("Kế hoạch thực hiện trải qua 7 giai đoạn: Phân tích -> Phần cứng -> IoT/Firmware -> Backend -> Mobile App -> Tích hợp -> Hoàn thiện Báo cáo.")
    p = doc.add_paragraph("Sản phẩm cuối cùng của Đồ án tốt nghiệp bao gồm:\n"
                          "1. Mô hình thực nghiệm Hộp nhận hàng thông minh (Smart Delivery Box Physical Model).\n"
                          "2. Mã nguồn Firmware C++ ESP32 chuẩn PlatformIO.\n"
                          "3. Mã nguồn Backend REST API & MQTT Client (Node.js/Express).\n"
                          "4. Cơ sở dữ liệu PostgreSQL & Docker Compose deployment.\n"
                          "5. Ứng dụng di động Flutter (Android APK).\n"
                          "6. Báo cáo thuyết minh Đồ án Tốt nghiệp hoàn chỉnh & Slide bảo vệ.")

    # Save document
    out_dir = r"d:\Mon Hoc\DO AN TOT NGHIEP\docs"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "De_Cuong_Do_An_Smart_Delivery_Box.docx")
    doc.save(out_path)
    print(f"Document successfully created at: {out_path}")

if __name__ == "__main__":
    create_document()
