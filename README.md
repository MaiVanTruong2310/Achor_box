# ANCHOR BOX — HỘP NHẬN HÀNG THÔNG MINH SỬ DỤNG IoT VÀ ỨNG DỤNG DI ĐỘNG
> **Development of an IoT-based Smart Delivery Box with a Mobile Application**
> *Đồ Án Tốt Nghiệp*

Repo chia theo 3 nền tảng:

| Thư mục | Nền tảng | Công nghệ |
|---|---|---|
| `device/` | Thiết bị: firmware hộp, sơ đồ mạch, PCB | ESP32-S3, PlatformIO (Arduino), Altium |
| `app/` | Ứng dụng di động + backend Supabase (`app/supabase/migrations/`) | Flutter (Android), Supabase (Postgres, Auth, Storage, Realtime) |
| `web/` | Web quản trị, web bán hàng và REST API | Spring Boot, React + Vite |

---

## Kiến trúc

```
 ┌──────────────┐   HTTPS RPC (telemetry, PIN, lệnh)   ┌──────────────┐   Realtime / REST   ┌──────────────┐
 │  ESP32-S3    │ ───────────────────────────────────▶ │   Supabase   │ ◀─────────────────▶ │  Flutter App │
 │  (firmware)  │ ◀── hàng đợi device_commands ─────── │              │                     │              │
 └──────┬───────┘                                      └──────────────┘                     └──────┬───────┘
        │  MQTT delivery_box/<id>/{status,sensor,event,command} (broker.hivemq.com) — hiển thị trực tiếp  │
        └─────────────────────────────────────────────────────────────────────────────────────────────────┘
                         BLE: App gửi cấu hình Wi-Fi cho hộp khi ghép thiết bị
```

- **Firmware → Supabase:** hộp gọi trực tiếp các RPC `report_device_telemetry`, `report_device_event`, `get_device_owner_id`, `verify_device_pin`, `get_pending_device_command`. Hộp xác thực bằng `DEVICE_AUTH_TOKEN`; Supabase chỉ lưu SHA-256 của token trong bảng `device_credentials`.
- **App → hộp:** App ghi lệnh (`UNLOCK` / `LOCK` / `TARE`) vào bảng `device_commands`; firmware định kỳ lấy lệnh và chống thực thi trùng.
- **Ghép thiết bị:** quét QR serial (`DBX-...`) → `start_device_pairing` → hộp hiện OTP → `confirm_device_pairing`. Wi-Fi được gửi qua BLE.
- **Thông báo:** sự kiện IoT ghi vào `device_events`, sau đó sinh `notifications` cho chủ hộp (theo `notification_preferences`).

### Cấu trúc thư mục

```
├── device/                       # THIẾT BỊ
│   ├── firmware/                 # Mã nguồn ESP32-S3 (PlatformIO)
│   │   ├── platformio.ini        # env esp32s3 (16MB flash, PSRAM)
│   │   ├── include/config.h      # Pinout, ngưỡng cảm biến, MQTT topic
│   │   ├── include/device_secrets.example.h
│   │   ├── src/main.cpp          # Cảm biến, bàn phím, LCD, máy trạng thái khóa, MQTT, BLE
│   │   └── solenoid_test/, solenoid_retest/   # Project test phần cứng riêng
│   ├── hardware/                 # Sơ đồ mạch & mô phỏng Wokwi
│   ├── pcb/                      # Thiết kế mạch in Altium (SchDoc, PcbDoc, PDF)
│   └── platformio.ini, wokwi.toml  # Cấu hình mô phỏng Wokwi (ESP32 DevKit)
├── app/                          # ỨNG DỤNG DI ĐỘNG
│   ├── lib/core/                 # Theme, ngôn ngữ (vi/en), cache, constants
│   ├── lib/services/             # Supabase, MQTT, thông báo, khóa ứng dụng
│   ├── lib/presentation/         # Màn hình & component Liquid Glass
│   ├── supabase/migrations/      # Toàn bộ schema, RLS, RPC của Supabase
│   └── rule.txt                  # Quy tắc phát triển app (đọc trước khi sửa)
├── web/                          # WEB
│   ├── backend/                  # Spring Boot REST API
│   ├── web-admin/                # Trang quản trị (React, Vite)
│   ├── web-shop/                 # Trang bán hàng (React, Vite)
│   └── docker-compose.yml        # Postgres, Redis, Mailpit, pgAdmin cho môi trường local
├── branding/                     # Logo & script sinh ảnh thương hiệu
└── CLAUDE.md                     # Hướng dẫn cho Claude Code
```

---

## Cài đặt

### 1. Supabase

1. Tạo project mới trên [supabase.com](https://supabase.com).
2. Cài [Supabase CLI](https://supabase.com/docs/guides/cli), liên kết và đẩy migration:
   ```bash
   cd app
   supabase login
   supabase link --project-ref <PROJECT_REF>
   supabase migration list --linked   # kiểm tra các migration đang chờ
   supabase db push
   ```
3. Cấp token cho hộp vật lý (chỉ lưu hash, không commit token thật). Chạy trong SQL Editor:
   ```sql
   insert into public.device_credentials (device_id, token_hash)
   select id, encode(extensions.digest('<DEVICE_AUTH_TOKEN>', 'sha256'), 'hex')
   from public.devices where serial_number = 'DBX-98C377AD9D60'
   on conflict (device_id) do update set token_hash = excluded.token_hash, rotated_at = now();
   ```

### 2. Ứng dụng di động

```bash
cd app
cp lib/core/constants/supabase_config.example.dart lib/core/constants/supabase_config.dart
# điền supabaseUrl và publishable/anon key (Dashboard → Settings → API)
flutter pub get
flutter run
```

Kiểm tra trước khi commit: `dart format <file>` và `flutter analyze --no-pub`.

### 3. Firmware ESP32-S3

```powershell
cd device\firmware
copy include\device_secrets.example.h include\device_secrets.h
# điền WIFI_SSID, WIFI_PASSWORD, SUPABASE_URL, SUPABASE_ANON_KEY, DEVICE_AUTH_TOKEN
& "$env:USERPROFILE\.platformio\penv\Scripts\platformio.exe" run --target upload --upload-port COM4
& "$env:USERPROFILE\.platformio\penv\Scripts\platformio.exe" device monitor -b 115200
```

Hoặc mở thư mục `device/firmware/` bằng VS Code có extension PlatformIO và bấm **Upload**.

### 4. Web (Spring Boot + React)

```powershell
cd web
copy .env.example .env               # đặt POSTGRES_PASSWORD, PGADMIN_DEFAULT_PASSWORD
docker compose up -d                 # Postgres, Redis, Mailpit, pgAdmin
cd backend
copy .env.example .env               # cấu hình DB, Supabase, VNPAY sandbox, SMTP...
.\run-local.ps1                      # hoặc .\gradlew.bat bootRun sau khi export biến môi trường
```

Chi tiết web-admin, web-shop và API: xem [web/README.md](web/README.md).

---

## Bảo mật

Không commit các file sau (đã có trong `.gitignore`):
- `device/firmware/include/device_secrets.h`
- `app/lib/core/constants/supabase_config.dart`
- `app/supabase/.temp/`
- mọi file `.env` (web dùng `.env.example` làm mẫu, không chứa giá trị thật)

Ứng dụng Flutter chỉ dùng publishable/anon key. Mọi quyền truy cập dữ liệu được kiểm soát bằng RLS theo `auth.uid()` và các hàm `SECURITY DEFINER` trong migration.
