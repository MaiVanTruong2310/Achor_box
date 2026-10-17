#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <LiquidCrystal_I2C.h>
#include <ESP32Servo.h>
#include <HX711.h>
#include <Preferences.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "config.h"
#include "device_secrets.h"

// ==================== GLOBAL OBJECTS & VARIABLES ====================
LiquidCrystal_I2C lcd(LCD_I2C_ADDRESS, 16, 2);
Servo alignmentServo;
HX711 weightScale;
Preferences preferences;

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// BLE Server & Characteristics
BLEServer* pBleServer = nullptr;
BLECharacteristic* pBleCharacteristic = nullptr;
bool bleProvisioningActive = false;
String storedSsid = "";
String storedPass = "";

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

String lcdLine1 = "";
String lcdLine2 = "";

uint8_t keypadI2cAddress = KEYPAD_I2C_ADDRESS;
bool keypadReady = false;
unsigned long lastKeypadProbe = 0;

String adminSequence = "";
String ownerSequence = "";

String ownerUserId = "";
bool ownerSyncCompleted = false;
unsigned long lastOwnerSync = 0;
unsigned long lastWifiAttempt = 0;
unsigned long lastTelemetryReport = 0;
unsigned long lastMqttPublish = 0;

unsigned long showDeviceIdUntil = 0;
unsigned long showOwnerIdUntil = 0;
unsigned long showWifiUntil = 0;
unsigned long unlockMessageUntil = 0;
unsigned long showDoorStatusUntil = 0;
unsigned long showOtpUntil = 0;
String currentOtpCode = "";

String wifiSequence = "";
String bleSequence = "";
String inputBuffer = "";
unsigned long lastKeyTime = 0;

// Cảm biến cửa MC-38
bool rawDoorOpen = false;
bool doorOpen = false;
unsigned long rawDoorChangedAt = 0;

// HX711 load cell. Reading is deliberately suspended while either actuator is
// moving so scale sampling can never disturb the timing of GPIO8 or the servo.
bool scaleReady = false;
bool packageDetected = false;
float weightKg = 0.0f;
unsigned long lastWeightReadAt = 0;
constexpr unsigned long WEIGHT_READ_INTERVAL_MS = 500;

// Điều khiển Chốt Solenoid & Servo Actuator
enum class ActuatorState { IDLE, SOLENOID_PULSE, LOCK_PRECHARGE, SERVO_UNLOCKING, UNLOCKED, SERVO_LOCKING, LOCK_HOLD };
ActuatorState actuatorState = ActuatorState::IDLE;
// The solenoid retracts first, then remains energized while the servo moves.
constexpr unsigned long SOLENOID_PULL_IN_MS = 100;
constexpr unsigned long LOCK_SOLENOID_HOLD_MS = 3000;
bool solenoidOn = false;
bool doorOpenedDuringAccess = false;
unsigned long unlockGrantedAt = 0;

uint8_t currentServoAngle = SERVO_LOCKED_ANGLE;
unsigned long actuatorTimer = 0;
unsigned long lastServoStepAt = 0;

// Servo 90 độ quay chậm 2.0s (2000ms / 90 steps = ~22ms/step)
const unsigned long SERVO_STEP_DELAY_SLOW = 22;
constexpr uint8_t RECENT_COMMAND_LIMIT = 12;
String recentCommandIds[RECENT_COMMAND_LIMIT];
uint8_t recentCommandCount = 0;

const char KEY_MAP[4][4] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};

// ==================== HELPER & FUNCTION PROTOTYPES ====================
bool verifyPasscodeWithSupabase(const String& passcode);
void triggerUnlockSequence();
void triggerLockSequence();
void attachServo();
void startBleProvisioning();
bool reportTelemetryToSupabase();
void publishMqttTelemetry();
void updateWeightSensor();

void energizeSolenoid() {
  digitalWrite(RELAY_LOCK_PIN, HIGH);
  solenoidOn = true;
  actuatorTimer = millis();
}

void releaseSolenoid() {
  digitalWrite(RELAY_LOCK_PIN, LOW);
  solenoidOn = false;
}

bool actuatorIsBusy() {
  return actuatorState == ActuatorState::SOLENOID_PULSE ||
         actuatorState == ActuatorState::LOCK_PRECHARGE ||
         actuatorState == ActuatorState::SERVO_UNLOCKING ||
         actuatorState == ActuatorState::SERVO_LOCKING ||
         actuatorState == ActuatorState::LOCK_HOLD;
}
void executeRemoteCommand(const String& command, const String& commandId);

void loadRecentCommandIds() {
  Preferences commandPreferences;
  commandPreferences.begin("command_ids", true);
  const String saved = commandPreferences.getString("recent", "");
  commandPreferences.end();
  int start = 0;
  while (start < saved.length() && recentCommandCount < RECENT_COMMAND_LIMIT) {
    const int separator = saved.indexOf('|', start);
    const int end = separator < 0 ? saved.length() : separator;
    if (end > start) {
      recentCommandIds[recentCommandCount++] = saved.substring(start, end);
    }
    if (separator < 0) break;
    start = separator + 1;
  }
}

bool wasCommandExecuted(const String& commandId) {
  if (commandId.isEmpty()) return false;
  for (uint8_t i = 0; i < recentCommandCount; ++i) {
    if (recentCommandIds[i] == commandId) return true;
  }
  return false;
}

void rememberCommandId(const String& commandId) {
  if (commandId.isEmpty()) return;
  if (recentCommandCount == RECENT_COMMAND_LIMIT) {
    for (uint8_t i = 1; i < RECENT_COMMAND_LIMIT; ++i) {
      recentCommandIds[i - 1] = recentCommandIds[i];
    }
    --recentCommandCount;
  }
  recentCommandIds[recentCommandCount++] = commandId;
  String saved;
  for (uint8_t i = 0; i < recentCommandCount; ++i) {
    if (i != 0) saved += '|';
    saved += recentCommandIds[i];
  }
  Preferences commandPreferences;
  commandPreferences.begin("command_ids", false);
  commandPreferences.putString("recent", saved);
  commandPreferences.end();
}

String fitLcd(const String& value) {
  String result = value.substring(0, min(16, static_cast<int>(value.length())));
  while (result.length() < 16) result += ' ';
  return result;
}

void showLcd(const String& line1, const String& line2) {
  if (line1 == lcdLine1 && line2 == lcdLine2) return;
  lcdLine1 = line1;
  lcdLine2 = line2;
  lcd.setCursor(0, 0); lcd.print(fitLcd(line1));
  lcd.setCursor(0, 1); lcd.print(fitLcd(line2));
}

void beep(uint16_t frequency, uint16_t durationMs) {
  tone(BUZZER_PIN, frequency, durationMs);
}

// ==================== KEYPAD (PCF8574 I2C) ====================

char readPcfKeyRaw() {
  for (uint8_t row = 0; row < 4; ++row) {
    const uint8_t output = static_cast<uint8_t>(0xFF & ~(1U << row));
    Wire.beginTransmission(keypadI2cAddress);
    Wire.write(output);
    if (Wire.endTransmission() != 0) {
      keypadReady = false;
      return 0;
    }
    delayMicroseconds(50);
    Wire.requestFrom(keypadI2cAddress, static_cast<uint8_t>(1));
    if (!Wire.available()) {
      keypadReady = false;
      return 0;
    }
    const uint8_t input = Wire.read();
    for (uint8_t col = 0; col < 4; ++col) {
      if ((input & (1U << (col + 4))) == 0) {
        Wire.beginTransmission(keypadI2cAddress);
        Wire.write(0xFF);
        Wire.endTransmission();
        return KEY_MAP[row][col];
      }
    }
  }
  Wire.beginTransmission(keypadI2cAddress);
  Wire.write(0xFF);
  Wire.endTransmission();
  return 0;
}

bool probeKeypadAddress() {
  const uint8_t ranges[][2] = {{0x20, 0x27}, {0x38, 0x3F}};
  for (const auto& range : ranges) {
    for (uint8_t address = range[0]; address <= range[1]; ++address) {
      if (address == LCD_I2C_ADDRESS) continue;
      Wire.beginTransmission(address);
      Wire.write(0xFF);
      if (Wire.endTransmission() == 0) {
        keypadI2cAddress = address;
        return true;
      }
    }
  }
  return false;
}

char getKey() {
  static char candidate = 0;
  static char reported = 0;
  static unsigned long candidateSince = 0;
  const char raw = readPcfKeyRaw();
  if (raw != candidate) { candidate = raw; candidateSince = millis(); }
  if (millis() - candidateSince < 35) return 0;
  if (!candidate) { reported = 0; return 0; }
  if (candidate == reported) return 0;
  reported = candidate;
  return candidate;
}

void handleKeypad() {
  const char key = getKey();
  if (!key) return;

  // Bíp phản hồi mỗi lần nhấn bất kỳ phím nào
  beep(1700, 60);

  // Khi nhấn phím '*' trên bàn phím: Kích hoạt ĐÓNG KHÓA THỦ CÔNG lập tức (Không cần bấm '#')
  // Giữ Solenoid HIGH (thụt chốt vào) -> Quay Servo 90 độ đóng nắp -> Thả Solenoid LOW để sập khóa!
  if (key == '*') {
    inputBuffer = "";
    adminSequence = ""; ownerSequence = ""; wifiSequence = "";
    Serial.println(F("[KEYPAD] '*' pressed -> Instant Manual Lock sequence!"));
    showLcd(" DANG DONG KHOA", " Giu chot điien...");
    beep(1600, 100);

    triggerLockSequence();
    return;
  }

  // Lưu chuỗi hiển thị 'Nhap: ...' trong 3.5s
  if (inputBuffer.length() >= 10) inputBuffer = "";
  inputBuffer += key;
  lastKeyTime = millis();

  // 1. Phím tắt D -> C -> B -> A -> # : Hiển thị ID Người sở hữu
  const String expectedOwnerSequence = "DCBA";
  if (key >= 'A' && key <= 'D') {
    const size_t ownerNext = ownerSequence.length();
    if (ownerNext < expectedOwnerSequence.length() && key == expectedOwnerSequence[ownerNext]) {
      ownerSequence += key;
    } else {
      ownerSequence = (key == 'D') ? "D" : "";
    }
  }

  // 2. Phím tắt A -> B -> C -> D -> # : Hiển thị Mã số hộp (Serial Number)
  const String expectedAdminSequence = "ABCD";
  if (key >= 'A' && key <= 'D') {
    const size_t nextIndex = adminSequence.length();
    if (nextIndex < expectedAdminSequence.length() && key == expectedAdminSequence[nextIndex]) {
      adminSequence += key;
    } else {
      adminSequence = (key == 'A') ? "A" : "";
    }
  }

  // 3. Phím tắt A -> D -> # : Hiển thị Thông tin Wi-Fi & IP
  const String expectedWifiSequence = "AD";
  if (key >= 'A' && key <= 'D') {
    const size_t wifiNext = wifiSequence.length();
    if (wifiNext < expectedWifiSequence.length() && key == expectedWifiSequence[wifiNext]) {
      wifiSequence += key;
    } else {
      wifiSequence = (key == 'A') ? "A" : "";
    }
  }

  // 4. Phím tắt C -> B -> A -> D -> # : Chuyển ngay sang chế độ kết nối Bluetooth BLE
  const String expectedBleSequence = "CBAD";
  if (key >= 'A' && key <= 'D') {
    const size_t bleNext = bleSequence.length();
    if (bleNext < expectedBleSequence.length() && key == expectedBleSequence[bleNext]) {
      bleSequence += key;
    } else {
      bleSequence = (key == 'C') ? "C" : "";
    }
  }

  // Khi nhấn '#' để kích hoạt phím tắt hoặc Xác thực Mật khẩu OTP từ Supabase
  if (key == '#') {
    if (bleSequence == expectedBleSequence) {
      adminSequence = ""; ownerSequence = ""; wifiSequence = ""; bleSequence = ""; inputBuffer = "";
      startBleProvisioning();
      beep(2300, 200);
      return;
    }
    if (adminSequence == expectedAdminSequence) {
      adminSequence = ""; ownerSequence = ""; wifiSequence = ""; bleSequence = ""; inputBuffer = "";
      showOwnerIdUntil = 0; showWifiUntil = 0;
      showDeviceIdUntil = millis() + 10000;
      beep(2100, 180);
      return;
    }
    if (ownerSequence == expectedOwnerSequence) {
      adminSequence = ""; ownerSequence = ""; wifiSequence = ""; bleSequence = ""; inputBuffer = "";
      showDeviceIdUntil = 0; showWifiUntil = 0;
      showOwnerIdUntil = millis() + 12000;
      beep(2200, 180);
      return;
    }
    if (wifiSequence == expectedWifiSequence) {
      adminSequence = ""; ownerSequence = ""; wifiSequence = ""; bleSequence = ""; inputBuffer = "";
      showDeviceIdUntil = 0; showOwnerIdUntil = 0;
      showWifiUntil = millis() + 10000;
      beep(1800, 180);
      return;
    }

    // Nếu không phải phím tắt -> Xác thực chuỗi Mật khẩu OTP với Supabase
    if (!inputBuffer.isEmpty()) {
      String passcodeToVerify = inputBuffer;
      // Loại bỏ ký tự '#' cuối cùng khỏi chuỗi
      if (passcodeToVerify.endsWith("#")) {
        passcodeToVerify = passcodeToVerify.substring(0, passcodeToVerify.length() - 1);
      }
      inputBuffer = "";
      adminSequence = ""; ownerSequence = ""; wifiSequence = "";

      showLcd("Dang xac thuc...", "Vui long cho...");
      beep(1500, 80);

      bool isPasscodeCorrect = verifyPasscodeWithSupabase(passcodeToVerify);
      if (isPasscodeCorrect) {
        triggerUnlockSequence();
      } else {
        showLcd("   SAI MAT KHAU", " Vui long thu lai");
        unlockMessageUntil = millis() + 3000;
        beep(500, 600); // Tiếng bíp báo lỗi
      }
      return;
    }
  }

  if (key != '#') {
    if (!(key >= 'A' && key <= 'D')) {
      adminSequence = "";
      ownerSequence = "";
      wifiSequence = "";
    }
  }
}

void maintainKeypad() {
  if (!keypadReady) {
    if (millis() - lastKeypadProbe < 2000) return;
    lastKeypadProbe = millis();
    keypadReady = probeKeypadAddress();
    if (keypadReady) {
      Serial.print(F("[KEYPAD] Connected at 0x"));
      Serial.println(keypadI2cAddress, HEX);
      beep(1450, 80);
    }
    return;
  }
  handleKeypad();
}

// ==================== SUPABASE SYNC ====================

// ==================== ACTUATOR CONTROL (SERVO & SOLENOID) ====================

void attachServo() {
  if (!alignmentServo.attached()) {
    alignmentServo.attach(SERVO_PIN, 500, 2400);
    alignmentServo.write(currentServoAngle);
  }
}

void triggerUnlockSequence() {
  Serial.println(F("[ACTUATOR] Triggering unlock sequence..."));
  // Give the latch time to retract before rotating the servo.
  energizeSolenoid();
  actuatorState = ActuatorState::SOLENOID_PULSE;
  unlockGrantedAt = millis();
  doorOpenedDuringAccess = doorOpen;

  showLcd("  MO KHOA THANH CONG", " Dang quay chot...");
  unlockMessageUntil = millis() + 4000;
  beep(2000, 300);
}

void triggerLockSequence() {
  if (currentServoAngle >= SERVO_LOCKED_ANGLE) {
    releaseSolenoid();
    actuatorState = ActuatorState::IDLE;
    return;
  }
  energizeSolenoid();
  actuatorState = ActuatorState::LOCK_PRECHARGE;
}

void updateActuators() {
  const unsigned long now = millis();
  if (doorOpen && (actuatorState == ActuatorState::SOLENOID_PULSE ||
                   actuatorState == ActuatorState::SERVO_UNLOCKING ||
                   actuatorState == ActuatorState::UNLOCKED)) {
    doorOpenedDuringAccess = true;
  }
  if (solenoidOn && now - actuatorTimer >= SOLENOID_PULSE_MS) {
    releaseSolenoid();
    Serial.println(F("[ACTUATOR] Solenoid pulse limit reached"));
  }

  // Retract the latch before the servo starts moving.
  if (actuatorState == ActuatorState::SOLENOID_PULSE) {
    if (now - actuatorTimer < SOLENOID_PULL_IN_MS) return;
    attachServo();
    actuatorState = ActuatorState::SERVO_UNLOCKING;
    lastServoStepAt = now;
    Serial.println(F("[ACTUATOR] Solenoid active, starting Servo 90-deg UNLOCK rotation..."));
    return;
  }

  if (actuatorState == ActuatorState::LOCK_PRECHARGE) {
    if (now - actuatorTimer < SOLENOID_PULL_IN_MS) return;
    attachServo();
    actuatorState = ActuatorState::SERVO_LOCKING;
    lastServoStepAt = now;
    return;
  }

  // Phase 2: Servo quay 90 độ mở khóa (Solenoid được giữ HIGH trong khi Servo quay để chốt không cọ xát)
  if (actuatorState == ActuatorState::SERVO_UNLOCKING) {
    if (now - lastServoStepAt >= SERVO_STEP_DELAY_SLOW) {
      lastServoStepAt = now;
      if (currentServoAngle > SERVO_UNLOCKED_ANGLE) {
        currentServoAngle--;
        alignmentServo.write(currentServoAngle);
      } else {
        actuatorState = ActuatorState::UNLOCKED;
        alignmentServo.detach(); // Ngắt xung Servo chống nóng
        releaseSolenoid();
        Serial.println(F("[ACTUATOR] Servo unlock complete; solenoid released."));
      }
    }
    return;
  }

  if (actuatorState == ActuatorState::UNLOCKED) {
    if (doorOpen) {
      doorOpenedDuringAccess = true;
    }
    // Closing is manual by design: wait for '*' (or an explicit LOCK command).
    return;
  }

  if (actuatorState == ActuatorState::SERVO_LOCKING) {
    if (now - lastServoStepAt >= SERVO_STEP_DELAY_SLOW) {
      lastServoStepAt = now;
      if (currentServoAngle < SERVO_LOCKED_ANGLE) {
        currentServoAngle++;
        alignmentServo.write(currentServoAngle);
      } else {
        alignmentServo.detach();
        actuatorState = ActuatorState::LOCK_HOLD;
        Serial.println(F("[ACTUATOR] Servo lock complete; holding solenoid until 3 seconds."));
      }
    }
    return;
  }

  if (actuatorState == ActuatorState::LOCK_HOLD) {
    if (now - actuatorTimer >= LOCK_SOLENOID_HOLD_MS) {
      releaseSolenoid();
      actuatorState = ActuatorState::IDLE;
      Serial.println(F("[ACTUATOR] 3-second lock hold complete; solenoid released."));
      beep(1400, 150);
    }
    return;
  }
}

// ==================== SUPABASE SYNC & VERIFY ====================

bool verifyPasscodeWithSupabase(const String& passcode) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[SUPABASE] Offline mode - Cannot verify OTP"));
    return false;
  }

  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  HTTPClient http;
  http.setConnectTimeout(2000);
  http.setTimeout(3000);

  // Gọi RPC verify_device_pin (khớp với set_device_access_pin của App Flutter)
  const String endpoint = String(SUPABASE_URL) + "/rest/v1/rpc/verify_device_pin";
  if (!http.begin(secureClient, endpoint)) return false;

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  StaticJsonDocument<256> request;
  request["p_serial_number"] = DEVICE_SERIAL_NUMBER;
  request["p_device_token"] = DEVICE_AUTH_TOKEN;
  request["p_pin"] = passcode;
  request["p_passcode"] = passcode; // Fallback phòng trường hợp RPC nhận p_passcode
  String body;
  serializeJson(request, body);

  const int statusCode = http.POST(body);
  bool isCorrect = false;
  if (statusCode == HTTP_CODE_OK) {
    String response = http.getString();
    response.trim();
    isCorrect = (response == "true");
  } else {
    // Nếu RPC verify_device_pin chưa được tạo hoặc báo lỗi 404, thử fallback sang verify_passcode
    http.end();
    const String fallbackEndpoint = String(SUPABASE_URL) + "/rest/v1/rpc/verify_passcode";
    if (http.begin(secureClient, fallbackEndpoint)) {
      http.addHeader("Content-Type", "application/json");
      http.addHeader("apikey", SUPABASE_ANON_KEY);
      http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
      const int fbCode = http.POST(body);
      if (fbCode == HTTP_CODE_OK) {
        String fbResp = http.getString();
        fbResp.trim();
        isCorrect = (fbResp == "true");
      }
    }
  }
  http.end();
  Serial.print(F("[SUPABASE] Verify PIN/OTP '")); Serial.print(passcode);
  Serial.print(F("': ")); Serial.println(isCorrect ? F("SUCCESS") : F("FAILED"));
  return isCorrect;
}

void syncOwnerFromSupabase() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  HTTPClient http;
  http.setConnectTimeout(2000);
  http.setTimeout(3000);

  const String endpoint = String(SUPABASE_URL) + "/rest/v1/rpc/get_device_owner_id";
  if (!http.begin(secureClient, endpoint)) return;

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  StaticJsonDocument<256> request;
  request["p_serial_number"] = DEVICE_SERIAL_NUMBER;
  request["p_device_token"] = DEVICE_AUTH_TOKEN;
  String body;
  serializeJson(request, body);

  const int statusCode = http.POST(body);
  if (statusCode == HTTP_CODE_OK) {
    String response = http.getString();
    response.trim();
    if (response == "null" || response.isEmpty()) {
      ownerUserId = "";
    } else {
      if (response.startsWith("\"") && response.endsWith("\"") && response.length() >= 2) {
        response = response.substring(1, response.length() - 1);
      }
      ownerUserId = response;
    }
    ownerSyncCompleted = true;
    Serial.print(F("[SUPABASE] Owner ID: "));
    Serial.println(ownerUserId.isEmpty() ? F("Chua lien ket") : ownerUserId);
  }
  http.end();
}

bool reportTelemetryToSupabase() {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  HTTPClient http;
  http.setConnectTimeout(2000);
  http.setTimeout(3000);
  const String endpoint = String(SUPABASE_URL) +
      "/rest/v1/rpc/report_device_telemetry";
  if (!http.begin(secureClient, endpoint)) return false;

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  StaticJsonDocument<512> request;
  request["p_serial_number"] = DEVICE_SERIAL_NUMBER;
  request["p_device_token"] = DEVICE_AUTH_TOKEN;
  request["p_door_status"] = doorOpen ? "open" : "closed";
  request["p_lock_status"] =
      actuatorState == ActuatorState::UNLOCKED ? "unlocked" : "locked";
  request["p_weight_kg"] = roundf(weightKg * 1000.0f) / 1000.0f;
  request["p_package_detected"] = packageDetected;
  request["p_scale_ready"] = scaleReady;
  request["p_device_state"] = mqttClient.connected() ? "ready" : "wifi_connected";
  String body;
  serializeJson(request, body);

  const int statusCode = http.POST(body);
  const String response = http.getString();
  http.end();
  const bool accepted = statusCode == HTTP_CODE_OK && response.indexOf("true") >= 0;
  if (!accepted) {
    Serial.print(F("[SUPABASE] Telemetry failed HTTP "));
    Serial.print(statusCode);
    Serial.print(F(": "));
    Serial.println(response);
  }
  return accepted;
}

void publishMqttTelemetry() {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<192> status;
  status["door"] = doorOpen ? "open" : "closed";
  status["lock"] =
      actuatorState == ActuatorState::UNLOCKED ? "unlocked" : "locked";
  status["state"] = "ready";
  char statusPayload[192];
  serializeJson(status, statusPayload, sizeof(statusPayload));
  String statusTopic = "delivery_box/" + String(DEVICE_SERIAL_NUMBER) + "/status";
  mqttClient.publish(statusTopic.c_str(), statusPayload, true);

  StaticJsonDocument<128> sensor;
  sensor["weight_kg"] = roundf(weightKg * 1000.0f) / 1000.0f;
  sensor["package_detected"] = packageDetected;
  sensor["scale_ready"] = scaleReady;
  char sensorPayload[128];
  serializeJson(sensor, sensorPayload, sizeof(sensorPayload));
  String sensorTopic = "delivery_box/" + String(DEVICE_SERIAL_NUMBER) + "/sensor";
  mqttClient.publish(sensorTopic.c_str(), sensorPayload, true);
}

void executeRemoteCommand(const String& command, const String& commandId) {
  if (command != "UNLOCK" && command != "LOCK") return;
  if (wasCommandExecuted(commandId)) {
    Serial.print(F("[COMMAND] Duplicate ignored: "));
    Serial.println(commandId);
    return;
  }

  // Persist before moving the actuator so the queued copy cannot repeat the
  // operation after a reboot between MQTT and the Supabase poll.
  rememberCommandId(commandId);
  if (command == "UNLOCK") {
    triggerUnlockSequence();
  } else {
    Serial.println(F("[COMMAND] Locking from remote command"));
    showLcd(" APP DONG KHOA", " Giu chot dien...");
    beep(1600, 100);
    triggerLockSequence();
  }
}

void checkDeviceCommandsFromSupabase() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  HTTPClient http;
  http.setConnectTimeout(2000);
  http.setTimeout(3000);

  const String endpoint = String(SUPABASE_URL) +
      "/rest/v1/rpc/get_pending_device_command";
  
  if (!http.begin(secureClient, endpoint)) return;

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  StaticJsonDocument<256> request;
  request["p_serial_number"] = DEVICE_SERIAL_NUMBER;
  request["p_device_token"] = DEVICE_AUTH_TOKEN;
  String body;
  serializeJson(request, body);
  const int statusCode = http.POST(body);
  if (statusCode == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload);
    if (!error && doc.is<JsonArray>() && doc.as<JsonArray>().size() > 0) {
      JsonObject cmdObj = doc[0];
      String command = cmdObj["command"].as<String>();
      String commandId = cmdObj["command_id"].as<String>();

      Serial.print(F("[COMMAND] Received App Command: "));
      Serial.println(command);

      executeRemoteCommand(command, commandId);
    }
  } else {
    Serial.print(F("[SUPABASE] Command poll failed HTTP "));
    Serial.print(statusCode);
    Serial.print(F(": "));
    Serial.println(http.getString());
  }
  http.end();
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print(F("[MQTT] Message arrived ["));
  Serial.print(topic);
  Serial.print(F("]: "));
  Serial.println(message);

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);
  if (!error) {
    String command = doc["command"].as<String>();
    if (command == "UNLOCK" || command == "LOCK") {
      executeRemoteCommand(command, doc["command_id"].as<String>());
    } else if (command == "OTP_PAIRING") {
      currentOtpCode = doc["otp"].as<String>();
      showOtpUntil = millis() + 30000;
      Serial.print(F("[MQTT] Pairing OTP received: "));
      Serial.println(currentOtpCode);
      showLcd("MA KET NOI OTP:", "   " + currentOtpCode);
      beep(2000, 200);
      delay(200);
      beep(2000, 200);
    }
  }
}

void maintainMqtt() {
  if (WiFi.status() != WL_CONNECTED) return;

  if (!mqttClient.connected()) {
    static unsigned long lastMqttReconnect = 0;
    if (millis() - lastMqttReconnect >= 5000) {
      lastMqttReconnect = millis();
      mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
      mqttClient.setSocketTimeout(2);
      mqttClient.setCallback(mqttCallback);

      String clientId = "ESP32_SmartBox_" + String(DEVICE_SERIAL_NUMBER);
      Serial.print(F("[MQTT] Connecting to broker: "));
      Serial.println(MQTT_SERVER);

      if (mqttClient.connect(clientId.c_str())) {
        Serial.println(F("[MQTT] Connected successfully!"));
        // Subscribe nhận lệnh điều khiển tức thì từ App Flutter
        String cmdTopic = "delivery_box/" + String(DEVICE_SERIAL_NUMBER) + "/command";
        mqttClient.subscribe(cmdTopic.c_str());
        Serial.print(F("[MQTT] Subscribed to topic: "));
        Serial.println(cmdTopic);
      } else {
        Serial.print(F("[MQTT] Connection failed, rc="));
        Serial.println(mqttClient.state());
      }
    }
  } else {
    mqttClient.loop();
  }
}

void maintainNetwork() {
  // 1. Nếu chưa từng nạp Wi-Fi (storedSsid rỗng), MỞ NGAY BLE PROVISIONING lập tức!
  if (storedSsid.isEmpty()) {
    if (!bleProvisioningActive) {
      startBleProvisioning();
    }
    return;
  }

  // 2. Nếu đã có Wi-Fi nhưng bị ngắt kết nối
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long wifiDisconnectedSince = 0;
    if (wifiDisconnectedSince == 0) wifiDisconnectedSince = millis();

    // Dò Wi-Fi trong 20s (đủ thời gian cho Router cấp IP), nếu không thấy -> Mới bật BLE Provisioning
    if (millis() - wifiDisconnectedSince >= 20000 && !bleProvisioningActive) {
      startBleProvisioning();
    }

    if (millis() - lastWifiAttempt >= 10000) {
      lastWifiAttempt = millis();
      WiFi.disconnect();
      WiFi.begin(storedSsid.c_str(), storedPass.c_str());
    }
    return;
  }

  // Never block actuator timing on a Supabase HTTP request. MQTT callbacks
  // can start an actuator sequence during mqttClient.loop().
  if (actuatorState == ActuatorState::SOLENOID_PULSE ||
      actuatorState == ActuatorState::LOCK_PRECHARGE ||
      actuatorState == ActuatorState::SERVO_UNLOCKING ||
      actuatorState == ActuatorState::SERVO_LOCKING ||
      actuatorState == ActuatorState::LOCK_HOLD ||
      (actuatorState == ActuatorState::UNLOCKED && solenoidOn)) {
    if (mqttClient.connected()) mqttClient.loop();
    return;
  }

  // Duy trì kết nối MQTT Realtime
  maintainMqtt();
  if (actuatorState == ActuatorState::SOLENOID_PULSE ||
      actuatorState == ActuatorState::LOCK_PRECHARGE ||
      actuatorState == ActuatorState::SERVO_UNLOCKING ||
      actuatorState == ActuatorState::SERVO_LOCKING ||
      actuatorState == ActuatorState::LOCK_HOLD) return;

  if (millis() - lastMqttPublish >= MQTT_PUBLISH_INTERVAL) {
    lastMqttPublish = millis();
    publishMqttTelemetry();
  }

  // Run at most one blocking HTTP request per loop so MQTT is serviced
  // between requests. Poll the backup queue first when it is due.
  static unsigned long lastCmdCheck = 0;
  if (lastCmdCheck == 0 || millis() - lastCmdCheck >= 5000) {
    lastCmdCheck = millis();
    checkDeviceCommandsFromSupabase();
    return;
  }

  if (lastTelemetryReport == 0 ||
      millis() - lastTelemetryReport >= SUPABASE_TELEMETRY_INTERVAL_MS) {
    lastTelemetryReport = millis();
    reportTelemetryToSupabase();
    return;
  }

  if (!ownerSyncCompleted || millis() - lastOwnerSync >= OWNER_SYNC_INTERVAL_MS) {
    lastOwnerSync = millis();
    syncOwnerFromSupabase();
    return;
  }
}

// ==================== DOOR SENSOR MC-38 ====================

void updateDoorSensor() {
  const bool reading = digitalRead(DOOR_SENSOR_PIN) == MC38_OPEN_LEVEL;
  if (reading != rawDoorOpen) {
    rawDoorOpen = reading;
    rawDoorChangedAt = millis();
  }
  if (reading != doorOpen && millis() - rawDoorChangedAt >= DOOR_DEBOUNCE_MS) {
    doorOpen = reading;
    showDoorStatusUntil = millis() + 2000; // Hiển thị thông báo trong 2.0s
    Serial.print(F("[MC-38] Door status changed: "));
    Serial.println(doorOpen ? F("OPEN (Mo nap)") : F("CLOSED (Dong nap)"));
    
    // Tiếng bíp phản hồi âm thanh khi trạng thái nắp thay đổi
    if (doorOpen) {
      beep(1800, 150); // Tiếng bíp mở nắp
    } else {
      beep(1200, 100); // Tiếng bíp đóng nắp
    }
  }
}

void updateWeightSensor() {
  if (actuatorIsBusy()) return;
  const unsigned long now = millis();
  if (now - lastWeightReadAt < WEIGHT_READ_INTERVAL_MS) return;
  lastWeightReadAt = now;

  if (!weightScale.is_ready()) {
    scaleReady = false;
    return;
  }

  const float sampleKg = weightScale.get_units(1);
  if (!isfinite(sampleKg) || sampleKg < -1.0f || sampleKg > 50.0f) {
    scaleReady = false;
    return;
  }

  scaleReady = true;
  const float normalizedKg = fabsf(sampleKg) < 0.005f ? 0.0f : max(0.0f, sampleKg);
  static bool hasFirstSample = false;
  if (!hasFirstSample) {
    weightKg = normalizedKg;
    hasFirstSample = true;
  } else {
    // Low-pass filter to keep the app value stable without delaying actuators.
    weightKg = weightKg * 0.70f + normalizedKg * 0.30f;
    if (weightKg < 0.005f) weightKg = 0.0f;
  }

  if (!packageDetected && weightKg >= WEIGHT_THRESHOLD_KG) {
    packageDetected = true;
  } else if (packageDetected &&
             weightKg <= WEIGHT_THRESHOLD_KG - WEIGHT_HYSTERESIS_KG) {
    packageDetected = false;
  }
}

// ==================== DISPLAY MANAGEMENT ====================

void updateDisplay() {
  // -1. Hiển thị Mã OTP kết nối từ App trong 30 giây
  if (millis() < showOtpUntil && !currentOtpCode.isEmpty()) {
    showLcd("MA KET NOI OTP:", "   " + currentOtpCode);
    return;
  }

  // 0. Ưu tiên 0: Hiển thị Thông báo Mở khóa / Sai mật khẩu
  if (millis() < unlockMessageUntil) return;

  // 1. Ưu tiên 1: Phím tắt D+C+B+A+# (Hiển thị User ID từ Supabase)
  if (millis() < showOwnerIdUntil) {
    if (ownerUserId.isEmpty()) {
      showLcd("ID nguoi dung:", "Chua lien ket");
    } else {
      const uint8_t pageCount = 3;
      const uint8_t page = static_cast<uint8_t>((millis() / 1800) % pageCount);
      const uint8_t start = page * 16;
      showLcd(String("User ID ") + String(page + 1) + "/3",
              ownerUserId.substring(start, min(start + 16, static_cast<int>(ownerUserId.length()))));
    }
    return;
  }

  // 2. Ưu tiên 2: Phím tắt A+B+C+D+# (Hiển thị Mã số hộp Serial)
  if (millis() < showDeviceIdUntil) {
    showLcd("ID cua hop:", DEVICE_SERIAL_NUMBER);
    return;
  }

  // 3. Ưu tiên 3: Phím tắt A+D+# (Hiển thị Thông tin Wi-Fi & IP)
  if (millis() < showWifiUntil) {
    if (WiFi.status() != WL_CONNECTED) {
      showLcd("WiFi:", "Dang ket noi...");
    } else {
      showLcd(String("WiFi: ") + WiFi.SSID(), String("IP: ") + WiFi.localIP().toString());
    }
    return;
  }

  // 4. Ưu tiên 4: Hiển thị ký tự đang nhập khi bấm bàn phím
  if (millis() - lastKeyTime < 3500 && !inputBuffer.isEmpty()) {
    showLcd("Nhap ban phim:", String("Nhap: ") + inputBuffer);
    return;
  }

  // 5. Ưu tiên 5: Hiển thị trạng thái cửa MC-38 trong 2.0 giây khi thay đổi
  if (millis() < showDoorStatusUntil) {
    if (doorOpen) {
      showLcd(" Tranthai: OPEN", "  Nap dang MO!");
    } else {
      showLcd(" Tranthai: CLOSED", " Nap dang DONG!");
    }
    return;
  }

  // 6. Nếu đang bật Bluetooth BLE Provisioning -> Hiển thị thông báo màn hình
  if (bleProvisioningActive) {
    showLcd(" KET NOI BLE", "SmartBox-98C377");
    return;
  }

  // 7. Mặc định: Hiển thị lời chào "Xin chao"
  showLcd("    Xin chao", " Smart Box v2.0");
}

void nvsSaveWifiCredentials(const String& ssid, const String& pass) {
  preferences.begin("wifi_store", false);
  preferences.putString("ssid", ssid);
  preferences.putString("pass", pass);
  preferences.end();
  Serial.println(F("[NVS] Saved new Wi-Fi credentials to Flash!"));
}

void nvsLoadWifiCredentials() {
  preferences.begin("wifi_store", true);
  storedSsid = preferences.getString("ssid", WIFI_SSID);
  storedPass = preferences.getString("pass", WIFI_PASSWORD);
  preferences.end();
}

class BleCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) override {
    String rxValue = pCharacteristic->getValue().c_str();
    if (rxValue.length() > 0) {
      Serial.print(F("[BLE] Received Wi-Fi Config: "));
      Serial.println(rxValue);

      StaticJsonDocument<256> doc;
      DeserializationError err = deserializeJson(doc, rxValue);
      if (!err) {
        String ssid = doc["ssid"].as<String>();
        String pass = doc["pass"].as<String>();
        if (ssid.length() > 0) {
          nvsSaveWifiCredentials(ssid, pass);
          storedSsid = ssid;
          storedPass = pass;
          lcd.clear();
          showLcd(" BLE NHAN WIFI!", " Dang khoi dong...");
          beep(2000, 150);
          delay(2000);
          ESP.restart(); // Khởi động lại toàn bộ mạch ESP32 để nạp kết nối Wi-Fi sạch 100%!
        }
      }
    }
  }
};

void startBleProvisioning() {
  if (bleProvisioningActive) return;
  bleProvisioningActive = true;
  Serial.println(F("[BLE] Starting BLE Provisioning Server..."));

  String bleName = "SmartBox-" + String(DEVICE_SERIAL_NUMBER);
  BLEDevice::init(bleName.c_str());
  pBleServer = BLEDevice::createServer();
  BLEService* pService = pBleServer->createService(SERVICE_UUID);

  pBleCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE
  );
  pBleCharacteristic->setCallbacks(new BleCallbacks());
  pBleCharacteristic->addDescriptor(new BLE2902());
  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  BLEDevice::startAdvertising();

  Serial.print(F("[BLE] BLE Provisioning active: "));
  Serial.println(bleName);
  showLcd(" KET NOI BLE", "SmartBox-98C377");
  beep(1800, 100);
}

// ==================== MAIN SETUP & LOOP ====================

void setup() {
  Serial.begin(115200);
  loadRecentCommandIds();
  delay(300);
  Serial.println(F("\n[STEP 3] Starting Smart Delivery Box Firmware..."));

  nvsLoadWifiCredentials();

  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_YELLOW_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(DOOR_SENSOR_PIN, INPUT_PULLUP);
  
  pinMode(RELAY_LOCK_PIN, OUTPUT);
  digitalWrite(RELAY_LOCK_PIN, LOW); // Đảm bảo Solenoid tắt ban đầu

  // Đọc trạng thái ban đầu của cảm biến cửa
  rawDoorOpen = digitalRead(DOOR_SENSOR_PIN) == MC38_OPEN_LEVEL;
  doorOpen = rawDoorOpen;
  rawDoorChangedAt = millis();

  // Khởi tạo I2C Bus (SDA: GPIO4, SCL: GPIO5)
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setTimeOut(50);

  // Khởi tạo Màn hình LCD 1602
  lcd.init();
  lcd.backlight();
  showLcd("Dang khoi dong", "Vui long cho...");
  beep(1500, 100);
  delay(500);

  // The platform must be empty during boot so this establishes the zero point.
  showLcd("KHOI DONG CAN", "De mat can trong");
  weightScale.begin(HX711_DT_PIN, HX711_SCK_PIN);
  weightScale.set_scale(HX711_CALIBRATION_FACTOR);
  if (weightScale.wait_ready_timeout(1500)) {
    weightScale.tare(10);
    scaleReady = true;
    Serial.println(F("[HX711] Ready and tared"));
  } else {
    scaleReady = false;
    Serial.println(F("[HX711] Not found; firmware will keep retrying"));
  }

  // Quét Keypad PCF8574
  keypadReady = probeKeypadAddress();
  Serial.println(keypadReady ? F("[BOOT] Keypad ready") : F("[BOOT] Keypad not found"));

  // Khởi tạo Wi-Fi từ NVS Flash
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(storedSsid.c_str(), storedPass.c_str());

  Serial.println(F("[STEP 3] Solenoid & Servo Actuator ready!"));
}

void loop() {
  updateDoorSensor();
  maintainKeypad();
  updateActuators();
  updateWeightSensor();
  maintainNetwork();
  updateDisplay();
  
  digitalWrite(LED_YELLOW_PIN, WiFi.status() == WL_CONNECTED ? HIGH : LOW);
  digitalWrite(LED_GREEN_PIN, doorOpen ? LOW : HIGH); // LED Xanh sáng khi đóng nắp
  digitalWrite(LED_RED_PIN, doorOpen ? HIGH : LOW);    // LED Đỏ sáng khi mở nắp
}
