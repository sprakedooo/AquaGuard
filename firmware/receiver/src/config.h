#pragma once
#include <Arduino.h>

#define FIRMWARE_VERSION    "0.1.0"
#define DEFAULT_DEVICE_ID   "pond-01"     // overridable via portal

// ---------- Pins ----------
#define PIN_ALERT_RELAY     26   // single relay drives both LED + buzzer
#define PIN_BUTTON          0

#define LORA_SCK            18
#define LORA_MISO           19
#define LORA_MOSI           23
#define LORA_SS             5
#define LORA_RST            14
#define LORA_DIO0           2

#define ALERT_ACTIVE_LEVEL  LOW

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

#define AP_SSID_PREFIX      "AVENIDO WIFI"
#define AP_PASSWORD         "AveniDO032109"   // change before deployment

// ---------- MQTT defaults (pre-filled in portal — user only needs to enter WiFi) ----------
#define DEF_MQTT_HOST   "5c5096ba5ead4ecf8917a53fc974ee70.s1.eu.hivemq.cloud"
#define DEF_MQTT_PORT   8883
#define DEF_MQTT_USER   "aquaguard-bridge"
#define DEF_MQTT_PASS   "Gigatt02!"
#define DEF_MQTT_TLS    true
