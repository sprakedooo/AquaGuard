#pragma once
#include <Arduino.h>

#define FIRMWARE_VERSION    "0.1.0"
#define DEFAULT_DEVICE_ID   "pond-01"     // overridable via portal

// ---------- Pins ----------
#define PIN_LED_RELAY       25
#define PIN_BUZZER_RELAY    27
#define PIN_BUTTON          0

#define LORA_SCK            18
#define LORA_MISO           19
#define LORA_MOSI           23
#define LORA_SS             5
#define LORA_RST            14
#define LORA_DIO0           26

#define ALERT_ACTIVE_LEVEL  HIGH

// ---------- Radio (must match transmitter) ----------
#define LORA_FREQ_HZ        433E6
#define LORA_TX_POWER_DBM   17
#define LORA_SPREADING      7
#define LORA_BANDWIDTH      125E3
#define LORA_CODING_RATE    5
#define LORA_SYNC_WORD      0xA4
#define LORA_PREAMBLE_LEN   8

#define LORA_MAX_PAYLOAD    32

// ---------- Misc ----------
#define MQTT_KEEPALIVE_S    30
#define MQTT_RECONNECT_MS   5000
#define STATUS_INTERVAL_MS  30000UL
#define BTN_AP_HOLD_MS      5000UL

#define AP_SSID_PREFIX      "AquaGuard-Setup"
#define AP_PASSWORD         "aquaguard"   // change before deployment
