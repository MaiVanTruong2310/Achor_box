# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

IoT Smart Delivery Box (graduation thesis). The repo is split by platform:
- `device/` — ESP32-S3 firmware (`device/firmware/`), Wokwi diagram (`device/hardware/`), Altium PCB (`device/pcb/`).
- `app/` — Flutter mobile app plus the Supabase backend (Postgres + Auth + Storage + Realtime) in `app/supabase/`.
- `web/` — Spring Boot REST API (`web/backend/`), React admin (`web/web-admin/`) and shop (`web/web-shop/`), local Docker stack (`web/docker-compose.yml`); see `web/README.md`. Its secrets come only from env vars (`web/.env`, `web/backend/.env`), never defaults in code.

The user communicates in Vietnamese; user-facing strings in the app are bilingual (vi/en).

**Supabase is the real backend for the device and app.** Root-level `backend/`, `docker/` and `database/` (if present locally) are a legacy design (Express + local Postgres + Mosquitto), gitignored and not on the main data path. The schema is fully reproducible from `app/supabase/migrations/` — `20260901000000_baseline_core_schema.sql` rebuilds the dashboard-created base (tables, profile trigger, base RLS) that predates migration history.

## Commands

### Firmware (PlatformIO, ESP32-S3 — run from `device/firmware/`)
```powershell
cd device/firmware
& "$env:USERPROFILE\.platformio\penv\Scripts\platformio.exe" run                                   # build
& "$env:USERPROFILE\.platformio\penv\Scripts\platformio.exe" run --target upload --upload-port COM4 # flash
& "$env:USERPROFILE\.platformio\penv\Scripts\platformio.exe" device monitor -b 115200              # serial log
```
- The real target is `device/firmware/platformio.ini` → env `esp32s3` (16MB flash, PSRAM, LCD lib). `device/platformio.ini` (env `esp32dev`, src_dir pointing into `device/firmware/`) is the old Wokwi/DevKit V1 config — don't build from `device/` unless targeting the simulator.
- `device/firmware/include/device_secrets.h` (gitignored) holds Wi-Fi, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DEVICE_AUTH_TOKEN`. Copy from `device_secrets.example.h` if missing.
- `device/firmware/backups/`, `device/firmware/recovery_backup_*`, `_firmware_baseline_46660f8/` are manual snapshots of known-good firmware; `device/firmware/solenoid_test/`, `solenoid_retest/` are standalone PlatformIO hardware test projects. Don't edit these when changing the main firmware.

### Mobile app (`app/`)
```bash
flutter pub get
flutter run
dart format <changed files>
flutter analyze --no-pub
flutter test                         # unit + widget tests in app/test/
flutter test test/language_rebuild_test.dart --plain-name "<name>"   # single test
```
Only build an APK when the user asks (or a native/Gradle issue needs verifying). After adding/upgrading a native plugin, a full restart is required.

### Supabase migrations (`app/supabase/`)
```bash
supabase migration list --linked     # confirm only the intended migration is pending
supabase db push                     # avoid --include-all
supabase migration list --linked     # verify local == remote
```
Every schema/RLS/bucket change must be a timestamped file in `app/supabase/migrations/` (idempotent: `IF [NOT] EXISTS`, `ON CONFLICT`, `create or replace`). Never apply ad-hoc production changes. `document/database.txt` and `app/supabase_schema.sql` are context-only schema dumps, not runnable.

## Architecture

### Data flow between device, cloud and app
- **Firmware → Supabase (HTTP RPC, primary path):** the ESP32 calls PostgREST RPCs directly with the anon key + `DEVICE_AUTH_TOKEN`: `report_device_telemetry`, `get_device_owner_id`, `verify_device_pin` (fallback `verify_passcode`), and polls `get_pending_device_command`. All device-facing logic lives in `SECURITY DEFINER` functions defined in the migrations — when changing what the device can do, change the RPC in a new migration and the matching call in `device/firmware/src/main.cpp`.
- **App → device commands:** the app inserts into `public.device_commands`; the firmware polls the queue and de-duplicates by command id (recent ids persisted in NVS namespace `command_ids`). MQTT `delivery_box/<id>/command` also exists as a faster secondary path.
- **MQTT (public broker `broker.hivemq.com:1883`, app web uses WS 8884):** topics `delivery_box/<boxId>/{status,sensor,event,command}` (`device/firmware/include/config.h`, `app/lib/core/constants/mqtt_topics.dart`). Used for live telemetry display; not the source of truth. Keep topic definitions in both files in sync.
- **Pairing / provisioning:** device QR carries the serial (e.g. `DBX-...`); app flow is `start_device_pairing` → device `get_pending_device_pairing` → `confirm_device_pairing` (`claim_device_by_serial` legacy). Wi-Fi credentials are sent over BLE (`wifi_provisioning_screen.dart` via `flutter_blue_plus`) to the firmware's BLE GATT server; service/characteristic UUIDs must match between `main.cpp` and that screen. Credentials are stored in ESP32 `Preferences` (NVS).
- **Events vs notifications:** IoT events go to `device_events` first; notifications for owner/members are derived from them (`notifications`, gated by `notification_preferences`). `device_events` = technical log, `notifications` = user inbox, `audit_logs` = audit trail — don't mix.

### Firmware (`device/firmware/src/main.cpp`, single file, cooperative `loop()`)
Non-blocking, millis-based tasks: network maintenance (Wi-Fi reconnect → BLE provisioning fallback), MQTT, door reed switch (debounced), HX711 weight → `packageDetected`, PCF8574 I2C keypad (PIN entry, admin/owner key sequences, lockout), I2C LCD, and an actuator state machine `ActuatorState { IDLE, SOLENOID_PULSE, LOCK_PRECHARGE, SERVO_UNLOCKING, UNLOCKED, SERVO_LOCKING, LOCK_HOLD }` driving a solenoid (MOSFET) + servo. Pins, timings and calibration constants live in `device/firmware/include/config.h` — the pinout matches the real PCB (e.g. GPIO14 is the yellow LED, so direct keypad matrix scanning is disabled). Avoid `delay()` in new code.

### Flutter app (`app/lib/`)
- `services/` — all Supabase/MQTT/notification/app-lock I/O. `SupabaseService` is the single gateway; screens/widgets should not call Supabase directly. MQTT client is created via a conditional-import factory (`mqtt_client_factory/` native vs web).
- `core/` — app-wide controllers (theme, `LanguageController` with `context.tr(vi:, en:)`, notifications, app lock) and constants (`supabase_config.dart` holds URL + publishable key only).
- `presentation/screens/` (auth, home, security) — `MainLayout` hosts main tabs in a `PageView`; detail screens are pushed with `Navigator`. `AppLockGate` covers logged-in content on start/resume.
- `presentation/widgets/` — shared Liquid Glass UI kit.

## App development rules (summary of `app/rule.txt` — read it in full before UI/Supabase work)
- UI is "iOS 26 Liquid Glass": reuse `LiquidGlassContainer` (no ad-hoc `BackdropFilter`), `Ios26BackButton`, `AppToast` (not SnackBar), `LiquidGlassSegmentedControl`, Liquid Glass dialogs (not default `AlertDialog`). Must work in Light and Dark mode — no hard-coded `AppColors.textPrimary` on dark backgrounds.
- Every user-visible string uses `context.tr(vi: ..., en: ...)`; never inside `const` widgets/collections.
- Check `mounted` after every `await` before using context/`setState`; loading flags must reset on success, failure and exception. Don't report success if any step (e.g. Storage upload vs profile update) failed.
- Avatars: bucket `avatars`, path `<auth.uid()>/avatar.<ext>`, ≤5 MB, cache-busting query param after upload.
- Notifications: stable `event_type` values (`low_battery, device_offline, device_online, remote_unlock, parcel_detected, device_added, access_invited, access_revoked, pin_created, pin_used, pin_expired, profile_updated, password_changed, security_alert, system`), never translated in DB; badge counts come from `notifications.is_read = false`; lists use Realtime; RLS scoped to `auth.uid()`.
- App-lock PIN: 6 digits, salted hash in `flutter_secure_storage` per user, constant-time compare, never synced to Supabase. Keep `flutter_secure_storage` pinned at `10.0.0` (compileSdk 36). Android uses `FlutterFragmentActivity`. Face ID stays disabled (no iOS target yet).
- Only the publishable/anon key may appear in the Flutter app; `service_role` keys only in server env (`web/backend/.env`).
- When reporting completion: state what changed, where data is stored, what was verified, and remaining limitations. If the user says they'll build themselves, don't build.
