#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

constexpr uint8_t SOLENOID_PIN = 8;
constexpr uint8_t TEST_LED_PIN = 47;
constexpr uint8_t LCD_SDA_PIN = 4;
constexpr uint8_t LCD_SCL_PIN = 5;
constexpr uint8_t LCD_ADDRESS = 0x27;
constexpr unsigned long WAIT_MS = 5000;
constexpr unsigned long HIGH_MS = 5000;

LiquidCrystal_I2C lcd(LCD_ADDRESS, 16, 2);

void showStatus(const char* first, const char* second) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(first);
  lcd.setCursor(0, 1);
  lcd.print(second);
}

void setup() {
  // Keep the MOSFET gate LOW before enabling the GPIO output.
  digitalWrite(SOLENOID_PIN, LOW);
  pinMode(SOLENOID_PIN, OUTPUT);
  digitalWrite(TEST_LED_PIN, LOW);
  pinMode(TEST_LED_PIN, OUTPUT);
  Serial.begin(115200);
  Wire.begin(LCD_SDA_PIN, LCD_SCL_PIN);
  Wire.setTimeOut(50);
  lcd.init();
  lcd.backlight();

  showStatus("TEST CHOT GPIO8", "CHO 5 GIAY...");
  delay(WAIT_MS);

  // Prepare the display before applying power. While GPIO8 is HIGH, run no
  // I2C, network, servo, keypad or sensor operations.
  showStatus("CHOT DIEN: ON", "LED XANH = HIGH");
  delay(100);
  digitalWrite(TEST_LED_PIN, HIGH);
  digitalWrite(SOLENOID_PIN, HIGH);
  Serial.println("[TEST] GPIO8 HIGH");
  delay(HIGH_MS);

  digitalWrite(SOLENOID_PIN, LOW);
  digitalWrite(TEST_LED_PIN, LOW);
  Serial.println("[TEST] GPIO8 LOW; complete");
  showStatus("CHOT DIEN: OFF", "TEST XONG");
}

void loop() {
  // One bounded HIGH pulse per reset. Never energize indefinitely.
}
