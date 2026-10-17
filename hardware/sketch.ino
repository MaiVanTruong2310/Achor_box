/*
 * ======================================================================================
 * ĐỒ ÁN TỐT NGHIỆP: HỘP NHẬN HÀNG THÔNG MINH (SMART DELIVERY BOX)
 * Target Hardware : ESP32-S3-WROOM-1 (N16R8: 16MB Flash / 8MB Octal PSRAM)
 *                   Wokwi part: board-esp32-s3-devkitc-1
 * Actuator        : Khoa chot dien 12V (Solenoid Lock) dieu khien qua Relay module
 *                   -> Fail-secure: mat dien = khoa (lo xo tu day chot),
 *                      co dien (dang XUNG NGAN) = mo.
 * Mode            : Complete Non-blocking Self-Contained Firmware
 * ======================================================================================
 *
 * GHI CHU BUILD QUAN TRONG (Arduino IDE):
 *  - Board          : "ESP32S3 Dev Module"
 *  - PSRAM          : "OPI PSRAM"   (BAT BUOC cho N16R8 - octal PSRAM, khac voi ESP32 thuong)
 *  - Flash Size     : "16MB"
 *  - USB CDC on Boot: neu bat, dung USBSerial thay vi Serial cho debug qua cong USB truc tiep.
 *
 * GHI CHU PHAN CUNG QUAN TRONG:
 *  - GPIO 26-37 la vung BI KHOA CUNG cho SPI Flash + Octal PSRAM tren N16R8 -> KHONG duoc dung
 *    cho ngoai vi. File nay khong dung bat ky chan nao trong dai do.
 *  - RELAY_LOCK_PIN (GPIO7) duoc gia dinh dung Relay module loai KICH MUC CAO (active-HIGH).
 *    Ly do: cac chan GPIO1-17 tren ESP32-S3 co hien tuong "glitch" muc THAP thoang qua (~60us)
 *    ngay luc cap nguon/reset, TRUOC khi code chay. Neu dung relay active-LOW, glitch nay co
 *    the vo tinh kich mo khoa trong tich tac. Dung relay active-HIGH thi glitch muc thap
 *    khong gay anh huong. --> Kiem tra dung module relay ban mua la loai active-HIGH truoc
 *    khi lap that; neu chi co loai active-LOW, phai dao nguoc logic HIGH/LOW trong file nay.
 */

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <Keypad.h>
#include <HX711.h>
#include <ArduinoJson.h>

// ==================== CONFIGURATION & PIN DEFINITIONS ====================
#define TRIG_PIN         5    // HC-SR04 Trigger
#define ECHO_PIN         18   // HC-SR04 Echo

#define HX711_DT_PIN     4    // Load Cell Data
#define HX711_SCK_PIN    6    // Load Cell Clock

#define MC38_PIN         8    // Reed Switch (LOW = Closed, HIGH = Open)

#define RELAY_LOCK_PIN   7    // Relay / Solenoid Lock Pin

#define BUZZER_PIN       17   // Buzzer
#define LED_GREEN_PIN    21   // Green LED (Pin 21)
#define LED_RED_PIN      38   // Red LED (Pin 38)
#define LED_BLUE_PIN     39   // Blue LED (Pin 39)

// Keypad 4x4 Pinout for ESP32-S3
const byte KEYPAD_ROWS = 4;
const byte KEYPAD_COLS = 4;
const byte ROW_PINS[KEYPAD_ROWS] = {9, 10, 11, 12};
const byte COL_PINS[KEYPAD_COLS] = {13, 14, 15, 16};

// Thresholds & Intervals
const float DISTANCE_THRESHOLD_CM = 15.0f;
const float WEIGHT_THRESHOLD_KG   = 0.05f;
const unsigned long GRACE_PERIOD_MS = 10000;   // 10s Grace Period
const unsigned long UNLOCK_PULSE_MS = 4000;    // Thoi gian cap dien cho relay de rut chot khoa

// Network Credentials
const char WIFI_SSID[]     = "Wokwi-GUEST";
const char WIFI_PASSWORD[] = "";
const char MQTT_BROKER[]   = "broker.hivemq.com";
const int  MQTT_PORT       = 1883;

const char TOPIC_STATUS[]  = "delivery_box/001/status";
const char TOPIC_SENSOR[]  = "delivery_box/001/sensor";
const char TOPIC_COMMAND[] = "delivery_box/001/command";
const char BOX_ID[]        = "BOX_001";

// ==================== SYSTEM STATE MACHINE ====================
enum SystemState { WAITING, DOOR_OPEN, PACKAGE_PLACED, DOOR_CLOSED, LOCKED_STATE };
SystemState currentState = WAITING;

// Hardware Objects & Global Variables
HX711 scale;
WiFiClient espClient;
PubSubClient mqttClient(espClient);

char keysMap[KEYPAD_ROWS][KEYPAD_COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
Keypad keypad = Keypad(makeKeymap(keysMap), (byte*)ROW_PINS, (byte*)COL_PINS, KEYPAD_ROWS, KEYPAD_COLS);

bool isLocked = true;   // Mac dinh KHOA luc boot (fail-secure, khong tu mo khi mat dien/khoi dong lai)
bool isDoorOpen = false;
float currentDistanceCm = 999.0f;
float currentWeightKg   = 0.0f;
bool packageDetected    = false;
String enteredPin       = "";

// Bien quan ly xung mo khoa (non-blocking) cho relay/solenoid
bool unlockPulseActive         = false;
unsigned long unlockPulseStartTime = 0;

unsigned long gracePeriodStartTime   = 0;
unsigned long lastSensorReadTime     = 0;
unsigned long lastMqttPublishTime    = 0;
unsigned long lastMqttReconnectTime = 0;
unsigned long lastWifiBlinkTime     = 0;
bool blueLedState                   = false;
unsigned long lastGreenBlinkTime    = 0;
bool greenBlinkState                = false;

// ==================== FUNCTION DECLARATIONS ====================
void updateDoorLeds(bool doorOpen, bool gracePeriod);
void updateWifiLed(bool connected);
void lockBox();
void unlockBox();
void updateLockRelay();
void beepBuzzer(int freq, int durationMs);
float readUltrasonicDistance();
float readHX711Weight();
void readSensors();
void handleKeypad();
void setupWiFi();
void reconnectMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);
const char* getStateString(SystemState state);
void publishStatusUpdate(const char* message);
void publishSensorData();
void updateStateMachine();

// ==================== ACTUATORS & SENSORS ====================
void updateDoorLeds(bool doorOpen, bool gracePeriod) {
  if (doorOpen) {
    digitalWrite(LED_GREEN_PIN, HIGH);
    digitalWrite(LED_RED_PIN, LOW);
  } else {
    digitalWrite(LED_RED_PIN, HIGH); // Den Do LUON SANG khi cua dong
    if (gracePeriod) {
      if (millis() - lastGreenBlinkTime >= 300) {
        lastGreenBlinkTime = millis();
        greenBlinkState = !greenBlinkState;
        digitalWrite(LED_GREEN_PIN, greenBlinkState ? HIGH : LOW);
      }
    } else {
      digitalWrite(LED_GREEN_PIN, LOW);
    }
  }
}

void updateWifiLed(bool connected) {
  if (connected) {
    digitalWrite(LED_BLUE_PIN, HIGH);
  } else {
    if (millis() - lastWifiBlinkTime >= 500) {
      lastWifiBlinkTime = millis();
      blueLedState = !blueLedState;
      digitalWrite(LED_BLUE_PIN, blueLedState ? HIGH : LOW);
    }
  }
}

// Khoa: chi can NGAT dien relay - lo xo trong solenoid se tu day chot vao vi tri khoa.
// Khong can giu dien de "giu khoa" (khac hoan toan servo cu).
void lockBox() {
  digitalWrite(RELAY_LOCK_PIN, LOW);   // De-energize -> lo xo day chot ra (fail-secure)
  unlockPulseActive = false;           // Huy moi xung mo khoa dang cho (neu co)
  isLocked = true;
  Serial.println(F("[LOCK] -> LOCKED (relay OFF, chot khoa da an vao)"));
}

// Mo: cap dien DANG XUNG trong UNLOCK_PULSE_MS de rut chot, roi tu dong ngat -
// khong duoc giu dien lien tuc vi solenoid re tien khong chiu duoc dong lien tuc lau.
void unlockBox() {
  digitalWrite(RELAY_LOCK_PIN, HIGH);  // Energize -> rut chot ra
  unlockPulseActive = true;
  unlockPulseStartTime = millis();
  isLocked = false;
  Serial.println(F("[LOCK] -> UNLOCKING (relay ON, xung mo khoa bat dau)"));
}

// Goi trong loop() moi vong - tu dong ngat relay khi het thoi gian xung mo khoa,
// tranh cap dien lien tuc lam nong/chay cuon day solenoid.
void updateLockRelay() {
  if (unlockPulseActive && (millis() - unlockPulseStartTime >= UNLOCK_PULSE_MS)) {
    digitalWrite(RELAY_LOCK_PIN, LOW);
    unlockPulseActive = false;
    Serial.println(F("[LOCK] Het xung mo khoa - relay OFF"));
  }
}

void beepBuzzer(int freq, int durationMs) {
  tone(BUZZER_PIN, freq, durationMs);
}

float readUltrasonicDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  return (duration == 0) ? 999.0f : (duration * 0.0343f) / 2.0f;
}

float readHX711Weight() {
  if (scale.is_ready()) {
    float weight = scale.get_units(1);
    return (weight < 0) ? 0.0f : weight;
  }
  return currentWeightKg;
}

void readSensors() {
  currentDistanceCm = readUltrasonicDistance();
  currentWeightKg   = readHX711Weight();
  isDoorOpen        = (digitalRead(MC38_PIN) == HIGH);

  // Anti-Fake Package Filter
  packageDetected   = (currentDistanceCm > 0.0f && currentDistanceCm < DISTANCE_THRESHOLD_CM) &&
                      (currentWeightKg > WEIGHT_THRESHOLD_KG);
}

void handleKeypad() {
  char key = keypad.getKey();
  if (!key) return;

  if (key == '*') {
    enteredPin = "";
    Serial.println(F("[KEYPAD] Reset PIN"));
    beepBuzzer(1000, 100);
  } else if (key == '#') {
    Serial.print(F("[KEYPAD] Submit OTP: "));
    Serial.println(enteredPin);

    if (enteredPin == "2310" || enteredPin == "0000") {
      Serial.println(F("[KEYPAD] OTP Correct! Unlocking..."));
      beepBuzzer(1800, 300);
      unlockBox();
      if (currentState == LOCKED_STATE) {
        currentState = WAITING;
      }
      publishStatusUpdate("Keypad OTP Correct - Unlocking");
    } else {
      Serial.println(F("[KEYPAD] OTP Invalid!"));
      beepBuzzer(400, 600);
      publishStatusUpdate("Keypad OTP Invalid");
    }
    enteredPin = "";
  } else if (key >= '0' && key <= '9') {
    if (enteredPin.length() < 4) {
      enteredPin += key;
      beepBuzzer(1200, 50);
    }
  }
}

// ==================== NETWORK & MQTT ====================
void setupWiFi() {
  Serial.print(F("[WIFI] Connecting: "));
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 5000) {
    delay(200);
    Serial.print(F("."));
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n[WIFI] Connected!"));
    updateWifiLed(true);
  } else {
    Serial.println(F("\n[WIFI] Timeout. Running Offline!"));
    updateWifiLed(false);
  }
}

void reconnectMQTT() {
  if (WiFi.status() != WL_CONNECTED) {
    updateWifiLed(false);
    return;
  }
  if (mqttClient.connected()) {
    updateWifiLed(true);
    return;
  }

  unsigned long now = millis();
  if (now - lastMqttReconnectTime < 5000) return;
  lastMqttReconnectTime = now;

  String clientId = "ESP32_Box_" + String(BOX_ID) + "_" + String(random(0xffff), HEX);
  if (mqttClient.connect(clientId.c_str())) {
    updateWifiLed(true);
    beepBuzzer(2400, 150);
    mqttClient.subscribe(TOPIC_COMMAND);
    publishStatusUpdate("ONLINE");
  } else {
    updateWifiLed(false);
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, message);

  String command = (!err && doc.containsKey("command")) ? doc["command"].as<String>() : message;

  if (command == "UNLOCK" || command == "OPEN") {
    unlockBox();
    if (currentState == LOCKED_STATE) currentState = WAITING;
    publishStatusUpdate("Unlocking via MQTT");
  } else if (command == "LOCK") {
    lockBox();
    currentState = LOCKED_STATE;
    publishStatusUpdate("Locked via MQTT");
  }
}

const char* getStateString(SystemState state) {
  switch (state) {
    case WAITING:        return "WAITING";
    case DOOR_OPEN:      return "DOOR_OPEN";
    case PACKAGE_PLACED: return "PACKAGE_PLACED";
    case DOOR_CLOSED:    return "DOOR_CLOSED";
    case LOCKED_STATE:   return "LOCKED_STATE";
    default:             return "UNKNOWN";
  }
}

void publishSensorData() {
  if (!mqttClient.connected()) return;
  JsonDocument doc;
  doc["box_id"]           = BOX_ID;
  doc["state"]            = getStateString(currentState);
  doc["distance_cm"]      = currentDistanceCm;
  doc["weight_kg"]        = currentWeightKg;
  doc["package_detected"] = packageDetected;
  doc["door_open"]        = isDoorOpen;
  doc["locked"]           = isLocked;

  char buffer[256];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_SENSOR, buffer);
}

void publishStatusUpdate(const char* message) {
  if (!mqttClient.connected()) return;
  JsonDocument doc;
  doc["box_id"]  = BOX_ID;
  doc["state"]   = getStateString(currentState);
  doc["message"] = message;

  char buffer[200];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_STATUS, buffer);
}

void updateStateMachine() {
  updateDoorLeds(isDoorOpen, currentState == DOOR_CLOSED);

  switch (currentState) {
    case WAITING:
      if (isDoorOpen) {
        currentState = DOOR_OPEN;
        publishStatusUpdate("Transition: DOOR_OPEN");
      }
      break;

    case DOOR_OPEN:
      if (packageDetected) {
        currentState = PACKAGE_PLACED;
        beepBuzzer(1500, 200);
        publishStatusUpdate("Transition: PACKAGE_PLACED");
      } else if (!isDoorOpen) {
        currentState = DOOR_CLOSED;
        gracePeriodStartTime = millis();
        publishStatusUpdate("Transition: DOOR_CLOSED (Grace Period)");
      }
      break;

    case PACKAGE_PLACED:
      if (!isDoorOpen) {
        currentState = DOOR_CLOSED;
        gracePeriodStartTime = millis();
        publishStatusUpdate("Transition: DOOR_CLOSED (Grace Period)");
      }
      break;

    case DOOR_CLOSED:
      if (isDoorOpen) {
        currentState = DOOR_OPEN;
        beepBuzzer(800, 200);
        publishStatusUpdate("Grace Period Cancelled");
        break;
      }

      if (millis() - gracePeriodStartTime >= GRACE_PERIOD_MS) {
        lockBox();
        currentState = LOCKED_STATE;
        beepBuzzer(2000, 500);
        publishStatusUpdate("Transition: LOCKED_STATE (Box Locked)");
      }
      break;

    case LOCKED_STATE:
      break;
  }
}

// ==================== MAIN SETUP & LOOP ====================
void setup() {
  Serial.begin(115200);
  delay(500);

  // Dua relay ve trang thai AN TOAN (LOCKED / de-energized) NGAY LAP TUC,
  // truoc ca cac buoc setup khac - giam toi da khoang thoi gian relay o trang thai
  // khong xac dinh sau khi code bat dau chay.
  pinMode(RELAY_LOCK_PIN, OUTPUT);
  digitalWrite(RELAY_LOCK_PIN, LOW);

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_BLUE_PIN, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(MC38_PIN, INPUT_PULLUP);

  digitalWrite(TRIG_PIN, LOW);

  // KICH HOAT DEN LED DO SANG VA LED XANH BIEN NHAP NHAY NGAY LAP TUC
  updateDoorLeds(false, false);
  updateWifiLed(false);

  // KHONG tu dong mo khoa luc boot (khac ban servo cu) - mac dinh LOCKED cho toi khi
  // co lenh mo hop luc (keypad OTP dung hoac lenh MQTT UNLOCK). Day la thay doi co chu
  // dich de dam bao fail-secure: mat dien/khoi dong lai KHONG duoc tu mo khoa.
  isLocked = true;

  scale.begin(HX711_DT_PIN, HX711_SCK_PIN);
  scale.set_scale(420.0f);
  scale.tare();

  setupWiFi();
  mqttClient.setBufferSize(512);
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  Serial.println(F("[SYSTEM] Smart Delivery Box (ESP32-S3 + Solenoid Lock) Ready!"));
}

void loop() {
  reconnectMQTT();
  if (mqttClient.connected()) {
    mqttClient.loop();
  }

  updateWifiLed(WiFi.status() == WL_CONNECTED && mqttClient.connected());

  if (millis() - lastSensorReadTime >= 500) {
    lastSensorReadTime = millis();
    readSensors();
  }

  handleKeypad();
  updateStateMachine();
  updateLockRelay();   // Kiem tra va tu dong ngat xung mo khoa neu da het thoi gian

  if (millis() - lastMqttPublishTime >= 2000) {
    lastMqttPublishTime = millis();
    publishSensorData();
  }
}
