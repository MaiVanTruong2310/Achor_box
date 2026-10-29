#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ==================== HARDWARE PIN CONFIGURATION ====================
#define HX711_DT_PIN     9    // HX711 DATA
#define HX711_SCK_PIN    10   // HX711 SCK

#define DOOR_SENSOR_PIN  17   // MC-38 Reed Switch input
#define MC38_PIN         17   // Alias for compatibility
// INPUT_PULLUP + reed switch to GND:
// LOW = magnet attached / lid closed, HIGH = magnet separated / lid open.
constexpr uint8_t MC38_OPEN_LEVEL = HIGH;

#define SERVO_PIN        16   // Servo signal
#define RELAY_LOCK_PIN   8    // Solenoid MOSFET gate

// Slow 90-degree lock travel. Reverse these two values if the mechanism is
// mounted in the opposite direction.
constexpr uint8_t SERVO_LOCKED_ANGLE = 93;
constexpr uint8_t SERVO_UNLOCKED_ANGLE = 3;
constexpr uint8_t SERVO_STEP_DELAY_MS = 15;

#define BUZZER_PIN       15   // Buzzer
#define LED_RED_PIN      13   // LED1 - Red
#define LED_YELLOW_PIN   14   // LED2 - Wi-Fi status (HIGH = connected)
#define LED_GREEN_PIN    47   // LED3 - Green

// Keypad is connected through PCF8574 at I2C address 0x20.
// Direct matrix GPIO scanning is intentionally disabled for now because it
// conflicts with the actual PCB pinout (notably the yellow LED on GPIO14).
constexpr uint8_t I2C_SDA_PIN = 4;
constexpr uint8_t I2C_SCL_PIN = 5;
constexpr uint8_t KEYPAD_I2C_ADDRESS = 0x20;
constexpr uint8_t LCD_I2C_ADDRESS = 0x27;

// ==================== SYSTEM THRESHOLDS & INTERVALS ====================
const float WEIGHT_THRESHOLD_KG   = 0.05f; // Weight threshold (> 0.05kg)
const float WEIGHT_HYSTERESIS_KG  = 0.02f;
// Recalibrated on 2026-09-24: a 0.180 kg reference was previously read as
// approximately 0.140 kg. HX711::get_units() divides by this factor, so the
// corrected factor is 4116.67 * (0.140 / 0.180) = 3201.85.
constexpr float HX711_CALIBRATION_FACTOR = 3201.85f;
const unsigned long DOOR_DEBOUNCE_MS = 120;
const unsigned long CLOSE_VERIFY_MS = 2000;
const unsigned long ACCESS_TIMEOUT_MS = 30000;
const unsigned long SOLENOID_PULSE_MS = 5000;
const unsigned long KEYPAD_LOCKOUT_MS = 60000;
const uint8_t MAX_WRONG_PIN_ATTEMPTS = 3;

const unsigned long SENSOR_READ_INTERVAL  = 500;  // Read sensors every 500ms
const unsigned long MQTT_PUBLISH_INTERVAL = 2000; // Publish MQTT telemetry every 2s
const unsigned long SUPABASE_TELEMETRY_INTERVAL_MS = 10000;

// ==================== NETWORK & MQTT CONFIGURATION ====================
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 10000;
const unsigned long OWNER_SYNC_INTERVAL_MS = 30000;
const unsigned long PAIRING_POLL_INTERVAL_MS = 5000;
const char MQTT_SERVER[]   = "broker.hivemq.com";
const int  MQTT_PORT       = 1883;

const char TOPIC_STATUS[]  = "delivery_box/001/status";
const char TOPIC_SENSOR[]  = "delivery_box/001/sensor";
const char TOPIC_EVENT[]   = "delivery_box/001/event";
const char TOPIC_COMMAND[] = "delivery_box/001/command";
const char DEVICE_BOX_ID[] = "BOX_001";
const char DEVICE_SERIAL_NUMBER[] = "DBX-98C377AD9D60";

#endif // CONFIG_H
