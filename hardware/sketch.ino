/*
 * ======================================================================================
 * ANCHOR BOX - HOP NHAN HANG THONG MINH (ban mo phong / test phan cung)
 * Board   : ESP32-S3-DevKitC-1 N16R8 (Wokwi: board-esp32-s3-devkitc-1)
 * Mach    : PCB_DELIVERY BOX-IOT (MainSCH.SchDoc) - chan khop diagram.json va config.h
 * ======================================================================================
 *
 * Sketch DOC LAP de mo phong tren Wokwi / test nhanh bang Arduino IDE. Hanh vi mo phong lai
 * dung firmware that (firmware/src/main.cpp), chi khac:
 *   - PIN duoc kiem tra voi DEMO_PIN thay vi RPC verify_device_pin cua Supabase.
 *   - Khong co Supabase (hang doi lenh, telemetry, owner ID) va khong co BLE provisioning.
 *
 * KICH BAN HOAT DONG (giong firmware):
 *   - Mo khoa : nhap PIN + '#', hoac lenh MQTT {"command":"UNLOCK","command_id":"..."}.
 *               Solenoid ON -> 100ms -> servo 93->3 do (~2s) -> nha servo + solenoid OFF.
 *               Hop o trang thai MO cho toi khi dong thu cong (KHONG tu khoa).
 *   - Dong    : phim '*' (dong ngay, khong can '#') hoac lenh MQTT LOCK.
 *               Solenoid ON -> 100ms -> servo 3->93 do -> giu solenoid du 3s -> OFF + bip.
 *               Solenoid khong bao gio bat qua 5s.
 *   - Phim tat: ABCD# serial (10s) | DCBA# owner ID (12s) | AD# Wi-Fi + IP (10s) | CBAD# BLE.
 *   - LED     : vang = Wi-Fi, xanh la = nap DONG, do = nap MO (theo nap, khong theo khoa).
 *   - MC-38   : chong rung 120ms, bip 1800Hz khi mo / 1200Hz khi dong, LCD bao 2s.
 *   - HX711   : tare luc khoi dong (de mat can trong), doc 500ms khi chot dung yen,
 *               loc thong thap 0.7/0.3, co hang >= 0.05kg, het hang <= 0.03kg.
 *   - MQTT    : delivery_box/<SERIAL>/status + /sensor moi 2s (retained), nhan /command.
 *               {"command":"OTP_PAIRING","otp":"123456"} -> LCD hien OTP 30s.
 *
 * PHAN CUNG (theo PCB):
 *   HX711 (H2) DATA 9 / SCK 10 (3V3) | I2C SDA 4 / SCL 5: LCD1602 0x27 + PCF8574T keypad 0x20
 *   MC-38 (H6) 17 | Servo (H5) 16 | Solenoid 12V qua AO3400 (H4) 8 | Coi qua C1815 15
 *   LED do 13 / vang 14 / xanh la 47
 *   Tuy chon nang cap: HC-SR04 (H1) TRIG 6 / ECHO 7, nut BT1 11 / BT2 12 (keo len 10k).
 *
 * Arduino IDE: Board "ESP32S3 Dev Module", PSRAM "OPI PSRAM", Flash Size "16MB".
 * Wokwi khong co PCF8574 -> go phim qua Serial Monitor (vd: 1234#, *, ABCD#).
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <LiquidCrystal_I2C.h>
#include <ESP32Servo.h>
#include <HX711.h>

// ==================== TUY CHON NANG CAP (ban co ban = 0) ====================
#define ENABLE_HC_SR04  0   // Doc va gui distance_cm, khong anh huong phat hien hang
#define ENABLE_BUTTONS  0   // Chi ghi log khi nhan; chuc nang do phien ban tuy chon quyet dinh

// ==================== SO DO CHAN (theo PCB, giong config.h) ====================
#define HX711_DT_PIN     9
#define HX711_SCK_PIN    10
#define DOOR_SENSOR_PIN  17
#define SERVO_PIN        16
#define RELAY_LOCK_PIN   8    // Cong AO3400 -> solenoid 12V
#define BUZZER_PIN       15
#define LED_RED_PIN      13
#define LED_YELLOW_PIN   14
#define LED_GREEN_PIN    47
#define HC_TRIG_PIN      6
#define HC_ECHO_PIN      7
#define BT1_PIN          11
#define BT2_PIN          12
constexpr uint8_t I2C_SDA_PIN = 4;
constexpr uint8_t I2C_SCL_PIN = 5;
constexpr uint8_t KEYPAD_I2C_ADDRESS = 0x20;
constexpr uint8_t LCD_I2C_ADDRESS = 0x27;
constexpr uint8_t MC38_OPEN_LEVEL = HIGH;

// ==================== THONG SO (giong config.h / main.cpp) ====================
constexpr uint8_t SERVO_LOCKED_ANGLE = 93;
constexpr uint8_t SERVO_UNLOCKED_ANGLE = 3;
const unsigned long SERVO_STEP_DELAY_SLOW = 22;
constexpr unsigned long SOLENOID_PULL_IN_MS = 100;
constexpr unsigned long LOCK_SOLENOID_HOLD_MS = 3000;
const unsigned long SOLENOID_PULSE_MS = 5000;
const unsigned long DOOR_DEBOUNCE_MS = 120;
constexpr unsigned long WEIGHT_READ_INTERVAL_MS = 500;
const float WEIGHT_THRESHOLD_KG = 0.05f;
const float WEIGHT_HYSTERESIS_KG = 0.02f;
const unsigned long MQTT_PUBLISH_INTERVAL = 2000;

// Wokwi HX711 5kg ~ 420 don vi/kg. PCB that dung HX711_CALIBRATION_FACTOR = 3201.85f.
constexpr float HX711_SCALE_FACTOR = 420.0f;

// ==================== MANG / DEMO ====================
const char DEMO_PIN[] = "1234";   // Thay cho PIN dat tu app (verify_device_pin)
const char WIFI_SSID[] = "Wokwi-GUEST";
const char WIFI_PASSWORD[] = "";
const char MQTT_SERVER[] = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char DEVICE_SERIAL_NUMBER[] = "DBX-98C377AD9D60";

// ==================== DOI TUONG & TRANG THAI ====================
LiquidCrystal_I2C lcd(LCD_I2C_ADDRESS, 16, 2);
Servo alignmentServo;
HX711 weightScale;
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

const char KEY_MAP[4][4] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};

enum class ActuatorState { IDLE, SOLENOID_PULSE, LOCK_PRECHARGE, SERVO_UNLOCKING, UNLOCKED, SERVO_LOCKING, LOCK_HOLD };
ActuatorState actuatorState = ActuatorState::IDLE;
bool solenoidOn = false;
uint8_t currentServoAngle = SERVO_LOCKED_ANGLE;
unsigned long actuatorTimer = 0;
unsigned long lastServoStepAt = 0;

bool keypadReady = false;
unsigned long lastKeypadProbe = 0;
String inputBuffer = "", adminSequence = "", ownerSequence = "", wifiSequence = "", bleSequence = "";
unsigned long lastKeyTime = 0;

bool rawDoorOpen = false, doorOpen = false;
unsigned long rawDoorChangedAt = 0;

bool scaleReady = false, packageDetected = false;
float weightKg = 0.0f;
unsigned long lastWeightReadAt = 0;
float distanceCm = -1.0f;

String lcdLine1 = "", lcdLine2 = "", currentOtpCode = "";
unsigned long showDeviceIdUntil = 0, showOwnerIdUntil = 0, showWifiUntil = 0;
unsigned long unlockMessageUntil = 0, showDoorStatusUntil = 0, showOtpUntil = 0, showBleNoticeUntil = 0;
unsigned long lastMqttPublish = 0, lastMqttReconnect = 0;

constexpr uint8_t RECENT_COMMAND_LIMIT = 12;
String recentCommandIds[RECENT_COMMAND_LIMIT];
uint8_t recentCommandCount = 0;

// ==================== TIEN ICH ====================
void beep(uint16_t frequency, uint16_t durationMs) { tone(BUZZER_PIN, frequency, durationMs); }

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

String topicFor(const char* leaf) {
  return String("delivery_box/") + DEVICE_SERIAL_NUMBER + "/" + leaf;
}

// Chong lap lenh theo command_id (firmware luu NVS; ban mo phong luu RAM).
bool wasCommandExecuted(const String& id) {
  if (id.isEmpty()) return false;
  for (uint8_t i = 0; i < recentCommandCount; ++i) if (recentCommandIds[i] == id) return true;
  return false;
}

void rememberCommandId(const String& id) {
  if (id.isEmpty()) return;
  if (recentCommandCount == RECENT_COMMAND_LIMIT) {
    for (uint8_t i = 1; i < RECENT_COMMAND_LIMIT; ++i) recentCommandIds[i - 1] = recentCommandIds[i];
    --recentCommandCount;
  }
  recentCommandIds[recentCommandCount++] = id;
}

// ==================== CHOT KHOA: SOLENOID + SERVO ====================
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

void attachServo() {
  if (!alignmentServo.attached()) {
    alignmentServo.attach(SERVO_PIN, 500, 2400);
    alignmentServo.write(currentServoAngle);
  }
}

void triggerUnlockSequence() {
  Serial.println(F("[ACTUATOR] Triggering unlock sequence..."));
  energizeSolenoid();
  actuatorState = ActuatorState::SOLENOID_PULSE;
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
  if (solenoidOn && now - actuatorTimer >= SOLENOID_PULSE_MS) {
    releaseSolenoid();
    Serial.println(F("[ACTUATOR] Solenoid pulse limit reached"));
  }

  switch (actuatorState) {
    case ActuatorState::SOLENOID_PULSE:
    case ActuatorState::LOCK_PRECHARGE:
      if (now - actuatorTimer < SOLENOID_PULL_IN_MS) return;
      attachServo();
      actuatorState = actuatorState == ActuatorState::SOLENOID_PULSE
                          ? ActuatorState::SERVO_UNLOCKING : ActuatorState::SERVO_LOCKING;
      lastServoStepAt = now;
      return;

    case ActuatorState::SERVO_UNLOCKING:
      if (now - lastServoStepAt < SERVO_STEP_DELAY_SLOW) return;
      lastServoStepAt = now;
      if (currentServoAngle > SERVO_UNLOCKED_ANGLE) {
        alignmentServo.write(--currentServoAngle);
      } else {
        actuatorState = ActuatorState::UNLOCKED;  // Giu mo cho toi '*' hoac lenh LOCK
        alignmentServo.detach();
        releaseSolenoid();
        Serial.println(F("[ACTUATOR] Servo unlock complete; solenoid released."));
      }
      return;

    case ActuatorState::SERVO_LOCKING:
      if (now - lastServoStepAt < SERVO_STEP_DELAY_SLOW) return;
      lastServoStepAt = now;
      if (currentServoAngle < SERVO_LOCKED_ANGLE) {
        alignmentServo.write(++currentServoAngle);
      } else {
        alignmentServo.detach();
        actuatorState = ActuatorState::LOCK_HOLD;
        Serial.println(F("[ACTUATOR] Servo lock complete; holding solenoid until 3 seconds."));
      }
      return;

    case ActuatorState::LOCK_HOLD:
      if (now - actuatorTimer >= LOCK_SOLENOID_HOLD_MS) {
        releaseSolenoid();
        actuatorState = ActuatorState::IDLE;
        Serial.println(F("[ACTUATOR] 3-second lock hold complete; solenoid released."));
        beep(1400, 150);
      }
      return;

    case ActuatorState::IDLE:
    case ActuatorState::UNLOCKED:
      return;
  }
}

// ==================== KEYPAD (PCF8574) ====================
char readPcfKeyRaw() {
  for (uint8_t row = 0; row < 4; ++row) {
    Wire.beginTransmission(KEYPAD_I2C_ADDRESS);
    Wire.write(static_cast<uint8_t>(0xFF & ~(1U << row)));
    if (Wire.endTransmission() != 0) { keypadReady = false; return 0; }
    delayMicroseconds(50);
    Wire.requestFrom(KEYPAD_I2C_ADDRESS, static_cast<uint8_t>(1));
    if (!Wire.available()) { keypadReady = false; return 0; }
    const uint8_t input = Wire.read();
    for (uint8_t col = 0; col < 4; ++col) {
      if ((input & (1U << (col + 4))) == 0) {
        Wire.beginTransmission(KEYPAD_I2C_ADDRESS);
        Wire.write(0xFF);
        Wire.endTransmission();
        return KEY_MAP[row][col];
      }
    }
  }
  Wire.beginTransmission(KEYPAD_I2C_ADDRESS);
  Wire.write(0xFF);
  Wire.endTransmission();
  return 0;
}

bool probeKeypad() {
  Wire.beginTransmission(KEYPAD_I2C_ADDRESS);
  Wire.write(0xFF);
  return Wire.endTransmission() == 0;
}

char getKey() {
  static char candidate = 0, reported = 0;
  static unsigned long candidateSince = 0;
  const char raw = readPcfKeyRaw();
  if (raw != candidate) { candidate = raw; candidateSince = millis(); }
  if (millis() - candidateSince < 35) return 0;
  if (!candidate) { reported = 0; return 0; }
  if (candidate == reported) return 0;
  reported = candidate;
  return candidate;
}

// Cap nhat chuoi phim tat: giu tien to dung, sai thi bat dau lai neu phim la ky tu dau.
void advanceSequence(String& seq, const char* expected, char key) {
  const size_t next = seq.length();
  if (next < strlen(expected) && key == expected[next]) seq += key;
  else seq = (key == expected[0]) ? String(key) : String("");
}

void clearSequences() {
  adminSequence = ""; ownerSequence = ""; wifiSequence = ""; bleSequence = ""; inputBuffer = "";
}

void handleKey(char key) {
  beep(1700, 60);

  // '*' = dong khoa thu cong ngay lap tuc.
  if (key == '*') {
    clearSequences();
    Serial.println(F("[KEYPAD] '*' pressed -> Instant Manual Lock sequence!"));
    showLcd(" DANG DONG KHOA", " Giu chot dien...");
    beep(1600, 100);
    triggerLockSequence();
    return;
  }

  if (inputBuffer.length() >= 10) inputBuffer = "";
  inputBuffer += key;
  lastKeyTime = millis();

  if (key >= 'A' && key <= 'D') {
    advanceSequence(ownerSequence, "DCBA", key);
    advanceSequence(adminSequence, "ABCD", key);
    advanceSequence(wifiSequence, "AD", key);
    advanceSequence(bleSequence, "CBAD", key);
  }

  if (key == '#') {
    if (bleSequence == "CBAD") {
      clearSequences();
      Serial.println(F("[BLE] Firmware that se bat BLE provisioning (mo phong: bo qua)"));
      showBleNoticeUntil = millis() + 5000;
      beep(2300, 200);
      return;
    }
    if (adminSequence == "ABCD") {
      clearSequences();
      showOwnerIdUntil = 0; showWifiUntil = 0;
      showDeviceIdUntil = millis() + 10000;
      beep(2100, 180);
      return;
    }
    if (ownerSequence == "DCBA") {
      clearSequences();
      showDeviceIdUntil = 0; showWifiUntil = 0;
      showOwnerIdUntil = millis() + 12000;
      beep(2200, 180);
      return;
    }
    if (wifiSequence == "AD") {
      clearSequences();
      showDeviceIdUntil = 0; showOwnerIdUntil = 0;
      showWifiUntil = millis() + 10000;
      beep(1800, 180);
      return;
    }

    if (!inputBuffer.isEmpty()) {
      String passcode = inputBuffer;
      if (passcode.endsWith("#")) passcode.remove(passcode.length() - 1);
      clearSequences();
      showLcd("Dang xac thuc...", "Vui long cho...");
      beep(1500, 80);
      if (passcode == DEMO_PIN) {
        triggerUnlockSequence();
      } else {
        showLcd("   SAI MAT KHAU", " Vui long thu lai");
        unlockMessageUntil = millis() + 3000;
        beep(500, 600);
      }
      return;
    }
  }

  if (key != '#' && !(key >= 'A' && key <= 'D')) {
    adminSequence = ""; ownerSequence = ""; wifiSequence = "";
  }
}

void maintainKeypad() {
  if (!keypadReady && millis() - lastKeypadProbe >= 2000) {
    lastKeypadProbe = millis();
    keypadReady = probeKeypad();
    if (keypadReady) { Serial.println(F("[KEYPAD] Connected at 0x20")); beep(1450, 80); }
  }
  if (keypadReady) {
    const char key = getKey();
    if (key) handleKey(key);
  }
  // Thay keypad khi mo phong: go phim qua Serial Monitor.
  while (Serial.available()) {
    const char c = toupper(static_cast<char>(Serial.read()));
    if ((c >= '0' && c <= '9') || (c >= 'A' && c <= 'D') || c == '*' || c == '#') handleKey(c);
  }
}

// ==================== CAM BIEN ====================
void updateDoorSensor() {
  const bool reading = digitalRead(DOOR_SENSOR_PIN) == MC38_OPEN_LEVEL;
  if (reading != rawDoorOpen) { rawDoorOpen = reading; rawDoorChangedAt = millis(); }
  if (reading != doorOpen && millis() - rawDoorChangedAt >= DOOR_DEBOUNCE_MS) {
    doorOpen = reading;
    showDoorStatusUntil = millis() + 2000;
    Serial.print(F("[MC-38] Door status changed: "));
    Serial.println(doorOpen ? F("OPEN (Mo nap)") : F("CLOSED (Dong nap)"));
    beep(doorOpen ? 1800 : 1200, doorOpen ? 150 : 100);
  }
}

void updateWeightSensor() {
  if (actuatorIsBusy()) return;  // Khong doc can khi chot dang chay
  const unsigned long now = millis();
  if (now - lastWeightReadAt < WEIGHT_READ_INTERVAL_MS) return;
  lastWeightReadAt = now;

  if (!weightScale.is_ready()) { scaleReady = false; return; }
  const float sampleKg = weightScale.get_units(1);
  if (!isfinite(sampleKg) || sampleKg < -1.0f || sampleKg > 50.0f) { scaleReady = false; return; }

  scaleReady = true;
  const float normalizedKg = fabsf(sampleKg) < 0.005f ? 0.0f : max(0.0f, sampleKg);
  static bool hasFirstSample = false;
  if (!hasFirstSample) {
    weightKg = normalizedKg;
    hasFirstSample = true;
  } else {
    weightKg = weightKg * 0.70f + normalizedKg * 0.30f;
    if (weightKg < 0.005f) weightKg = 0.0f;
  }

  if (!packageDetected && weightKg >= WEIGHT_THRESHOLD_KG) packageDetected = true;
  else if (packageDetected && weightKg <= WEIGHT_THRESHOLD_KG - WEIGHT_HYSTERESIS_KG) packageDetected = false;

#if ENABLE_HC_SR04
  digitalWrite(HC_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(HC_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(HC_TRIG_PIN, LOW);
  const unsigned long echoUs = pulseIn(HC_ECHO_PIN, HIGH, 25000);
  distanceCm = echoUs == 0 ? -1.0f : echoUs / 58.0f;
#endif
}

#if ENABLE_BUTTONS
void updateButtons() {
  static bool last1 = HIGH, last2 = HIGH;
  const bool b1 = digitalRead(BT1_PIN), b2 = digitalRead(BT2_PIN);
  if (last1 == HIGH && b1 == LOW) Serial.println(F("[BUTTON] BT1 pressed"));
  if (last2 == HIGH && b2 == LOW) Serial.println(F("[BUTTON] BT2 pressed"));
  last1 = b1; last2 = b2;
}
#endif

// ==================== MQTT ====================
void executeRemoteCommand(const String& command, const String& commandId) {
  if (command != "UNLOCK" && command != "LOCK") return;
  if (wasCommandExecuted(commandId)) {
    Serial.print(F("[COMMAND] Duplicate ignored: "));
    Serial.println(commandId);
    return;
  }
  rememberCommandId(commandId);
  if (command == "UNLOCK") {
    triggerUnlockSequence();
  } else {
    showLcd(" APP DONG KHOA", " Giu chot dien...");
    beep(1600, 100);
    triggerLockSequence();
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  JsonDocument doc;
  if (deserializeJson(doc, payload, length)) return;
  const String command = doc["command"] | "";
  Serial.print(F("[MQTT] Command: ")); Serial.println(command);
  if (command == "UNLOCK" || command == "LOCK") {
    executeRemoteCommand(command, doc["command_id"] | "");
  } else if (command == "OTP_PAIRING") {
    currentOtpCode = doc["otp"] | "";
    showOtpUntil = millis() + 30000;
    showLcd("MA KET NOI OTP:", "   " + currentOtpCode);
    beep(2000, 200);
  }
}

void publishMqttTelemetry() {
  if (!mqttClient.connected()) return;
  JsonDocument status;
  status["door"] = doorOpen ? "open" : "closed";
  status["lock"] = actuatorState == ActuatorState::UNLOCKED ? "unlocked" : "locked";
  status["state"] = "ready";
  char buffer[192];
  serializeJson(status, buffer, sizeof(buffer));
  mqttClient.publish(topicFor("status").c_str(), buffer, true);

  JsonDocument sensor;
  sensor["weight_kg"] = roundf(weightKg * 1000.0f) / 1000.0f;
  sensor["package_detected"] = packageDetected;
  sensor["scale_ready"] = scaleReady;
#if ENABLE_HC_SR04
  sensor["distance_cm"] = distanceCm;
#endif
  serializeJson(sensor, buffer, sizeof(buffer));
  mqttClient.publish(topicFor("sensor").c_str(), buffer, true);
}

void maintainNetwork() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (!mqttClient.connected()) {
    if (millis() - lastMqttReconnect < 5000) return;
    lastMqttReconnect = millis();
    const String clientId = String("ESP32_SmartBox_Sim_") + String(random(0xffff), HEX);
    if (mqttClient.connect(clientId.c_str())) {
      mqttClient.subscribe(topicFor("command").c_str());
      Serial.print(F("[MQTT] Subscribed to topic: "));
      Serial.println(topicFor("command"));
    }
    return;
  }
  mqttClient.loop();
  if (actuatorIsBusy()) return;
  if (millis() - lastMqttPublish >= MQTT_PUBLISH_INTERVAL) {
    lastMqttPublish = millis();
    publishMqttTelemetry();
  }
}

// ==================== LCD (thu tu uu tien giong firmware) ====================
void updateDisplay() {
  const unsigned long now = millis();
  if (now < showOtpUntil && !currentOtpCode.isEmpty()) { showLcd("MA KET NOI OTP:", "   " + currentOtpCode); return; }
  if (now < unlockMessageUntil) return;
  if (now < showOwnerIdUntil) { showLcd("ID nguoi dung:", "Chua lien ket"); return; }  // Can Supabase
  if (now < showDeviceIdUntil) { showLcd("ID cua hop:", DEVICE_SERIAL_NUMBER); return; }
  if (now < showWifiUntil) {
    if (WiFi.status() != WL_CONNECTED) showLcd("WiFi:", "Dang ket noi...");
    else showLcd(String("WiFi: ") + WiFi.SSID(), String("IP: ") + WiFi.localIP().toString());
    return;
  }
  if (now - lastKeyTime < 3500 && !inputBuffer.isEmpty()) { showLcd("Nhap ban phim:", String("Nhap: ") + inputBuffer); return; }
  if (now < showDoorStatusUntil) {
    if (doorOpen) showLcd(" Tranthai: OPEN", "  Nap dang MO!");
    else showLcd(" Tranthai: CLOSED", " Nap dang DONG!");
    return;
  }
  if (now < showBleNoticeUntil) { showLcd(" KET NOI BLE", "SmartBox-98C377"); return; }
  showLcd("    Xin chao", " Smart Box v2.0");
}

// ==================== SETUP / LOOP ====================
void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_YELLOW_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(DOOR_SENSOR_PIN, INPUT_PULLUP);
  pinMode(RELAY_LOCK_PIN, OUTPUT);
  digitalWrite(RELAY_LOCK_PIN, LOW);  // Solenoid tat ban dau
#if ENABLE_HC_SR04
  pinMode(HC_TRIG_PIN, OUTPUT);
  pinMode(HC_ECHO_PIN, INPUT);
  digitalWrite(HC_TRIG_PIN, LOW);
#endif
#if ENABLE_BUTTONS
  pinMode(BT1_PIN, INPUT);  // PCB da co dien tro keo len 10k
  pinMode(BT2_PIN, INPUT);
#endif

  rawDoorOpen = digitalRead(DOOR_SENSOR_PIN) == MC38_OPEN_LEVEL;
  doorOpen = rawDoorOpen;
  rawDoorChangedAt = millis();

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setTimeOut(50);
  lcd.init();
  lcd.backlight();
  showLcd("Dang khoi dong", "Vui long cho...");
  beep(1500, 100);
  delay(500);

  showLcd("KHOI DONG CAN", "De mat can trong");
  weightScale.begin(HX711_DT_PIN, HX711_SCK_PIN);
  weightScale.set_scale(HX711_SCALE_FACTOR);
  if (weightScale.wait_ready_timeout(1500)) {
    weightScale.tare(10);
    scaleReady = true;
    Serial.println(F("[HX711] Ready and tared"));
  } else {
    Serial.println(F("[HX711] Not found; will keep retrying"));
  }

  keypadReady = probeKeypad();
  Serial.println(keypadReady ? F("[BOOT] Keypad ready")
                             : F("[BOOT] Keypad not found - go phim qua Serial Monitor"));

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setSocketTimeout(2);
  mqttClient.setBufferSize(512);
  mqttClient.setCallback(mqttCallback);

  Serial.print(F("[SIM] Anchor Box san sang. PIN demo: "));
  Serial.print(DEMO_PIN);
  Serial.println(F("#  |  '*' = dong khoa  |  ABCD# / AD# / DCBA# / CBAD#"));
}

void loop() {
  updateDoorSensor();
  maintainKeypad();
  updateActuators();
  updateWeightSensor();
#if ENABLE_BUTTONS
  updateButtons();
#endif
  maintainNetwork();
  updateDisplay();

  digitalWrite(LED_YELLOW_PIN, WiFi.status() == WL_CONNECTED ? HIGH : LOW);
  digitalWrite(LED_GREEN_PIN, doorOpen ? LOW : HIGH);  // Xanh la = nap dong
  digitalWrite(LED_RED_PIN, doorOpen ? HIGH : LOW);    // Do = nap mo
}
