# ⚡ Hướng Dẫn Tích Hợp Supabase Cloud Cho Smart Delivery Box

## 1. Khởi Tạo Dự Án Trên Supabase Cloud
1. Đăng ký/Đăng nhập tài khoản miễn phí tại [https://supabase.com](https://supabase.com).
2. Bấm **New Project**, nhập tên dự án `Smart Delivery Box` và tạo mật khẩu Database.
3. Trong giao diện Supabase Dashboard, chuyển sang mục **SQL Editor**.
4. Dán toàn bộ nội dung file `database/supabase_schema.sql` và nhấn **RUN** để khởi tạo Bảng, RLS Policies và Supabase Realtime.

## 2. Lấy Keys & API Credentials
Vào **Project Settings -> API**:
- **Project URL**: `https://<your-project-id>.supabase.co`
- **anon public key**: Dùng cho App Flutter
- **service_role secret key**: Dùng cho Backend Node.js / MQTT Bridge Listener

## 3. Chạy Supabase MQTT Bridge Listener
```bash
cd backend
npm install
npm run start
```
MQTT Listener sẽ tự động nhận dữ liệu từ ESP32 và ghi trực tiếp vào Supabase PostgreSQL Cloud qua Realtime Sync!
