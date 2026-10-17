#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// Temporary, standalone hardware test. No Wi-Fi, MQTT, servo or stored data.
constexpr uint8_t SOLENOID_PIN = 8;
constexpr uint8_t I2C_SDA_PIN = 4;
constexpr uint8_t I2C_SCL_PIN = 5;
constexpr uint8_t KEYPAD_ADDRESS = 0x20;
constexpr uint8_t LCD_ADDRESS = 0x27;
constexpr unsigned long PULSE_MS = 4000;
constexpr unsigned long BOOT_TEST_DELAY_MS = 5000;

const char KEY_MAP[4][4] = {
    {'1', '2', '3', 'A'},
    {'4', '5', '6', 'B'},
    {'7', '8', '9', 'C'},
    {'*', '0', '#', 'D'},
};

LiquidCrystal_I2C lcd(LCD_ADDRESS, 16, 2);
bool keypadReady = false;
bool solenoidOn = false;
bool armed = false;
unsigned long pulseStartedAt = 0;
unsigned long lastProbeAt = 0;
unsigned long bootedAt = 0;
bool bootTestDone = false;
bool bootTestActive = false;

void showStatus(const char* first, const char* second) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(first);
  lcd.setCursor(0, 1);
  lcd.print(second);
  Serial.print(first);
  Serial.print(F(" | "));
  Serial.println(second);
}

void stopSolenoid() {
  digitalWrite(SOLENOID_PIN, LOW);
  solenoidOn = false;
  showStatus("CHOT DIEN: OFF", "Nhan 1# de test");
}

void startSolenoid() {
  digitalWrite(SOLENOID_PIN, HIGH);
  solenoidOn = true;
  pulseStartedAt = millis();
  showStatus("CHOT DIEN: ON", "Tu tat sau 4s");
}

bool probeKeypad() {
  Wire.beginTransmission(KEYPAD_ADDRESS);
  Wire.write(0xFF);
  return Wire.endTransmission() == 0;
}

char readPcfKeyRaw() {
  for (uint8_t row = 0; row < 4; ++row) {
    Wire.beginTransmission(KEYPAD_ADDRESS);
    Wire.write(static_cast<uint8_t>(0xFF & ~(1U << row)));
    if (Wire.endTransmission() != 0) {
      keypadReady = false;
      return 0;
    }
    delayMicroseconds(50);
    Wire.requestFrom(KEYPAD_ADDRESS, static_cast<uint8_t>(1));
    if (!Wire.available()) {
      keypadReady = false;
      return 0;
    }
    const uint8_t input = Wire.read();
    for (uint8_t col = 0; col < 4; ++col) {
      if ((input & (1U << (col + 4))) == 0) {
        Wire.beginTransmission(KEYPAD_ADDRESS);
        Wire.write(0xFF);
        Wire.endTransmission();
        return KEY_MAP[row][col];
      }
    }
  }
  Wire.beginTransmission(KEYPAD_ADDRESS);
  Wire.write(0xFF);
  Wire.endTransmission();
  return 0;
}

char getKey() {
  static char candidate = 0;
  static char reported = 0;
  static unsigned long candidateSince = 0;
  const char raw = readPcfKeyRaw();
  if (raw != candidate) {
    candidate = raw;
    candidateSince = millis();
  }
  if (millis() - candidateSince < 35) return 0;
  if (!candidate) {
    reported = 0;
    return 0;
  }
  if (candidate == reported) return 0;
  reported = candidate;
  return candidate;
}

void setup() {
  Serial.begin(115200);
  pinMode(SOLENOID_PIN, OUTPUT);
  digitalWrite(SOLENOID_PIN, LOW);
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setTimeOut(50);
  lcd.init();
  lcd.backlight();
  keypadReady = probeKeypad();
  bootedAt = millis();
  showStatus("TEST CHOT GPIO8", "Tu test sau 5s");
}

void loop() {
  if (!bootTestDone) {
    if (millis() - bootedAt >= BOOT_TEST_DELAY_MS) {
      bootTestDone = true;
      bootTestActive = true;
      startSolenoid();
    }
    return;
  }
  if (bootTestActive) {
    if (millis() - pulseStartedAt >= PULSE_MS) {
      stopSolenoid();
      bootTestActive = false;
    }
    return;
  }
  if (solenoidOn && millis() - pulseStartedAt >= PULSE_MS) stopSolenoid();
  if (!keypadReady) {
    if (millis() - lastProbeAt >= 2000) {
      lastProbeAt = millis();
      keypadReady = probeKeypad();
      if (keypadReady) showStatus("TEST CHOT GPIO8", "Nhan 1# de test");
    }
    return;
  }

  const char key = getKey();
  if (key == '1') {
    armed = true;
    showStatus("Da nhan phim 1", "Nhan # de test");
  } else if (key == '#') {
    if (armed) {
      armed = false;
      if (solenoidOn) stopSolenoid();
      else startSolenoid();
    }
  } else if (key != 0) {
    armed = false;
  }
}
