#pragma once
#include <Arduino.h>

// ---------- Device identity ----------
#define DEVICE_ID            "pond-01"
#define FIRMWARE_VERSION     "0.1.0"

// ---------- Pins ----------
#define PIN_DS18B20          4
#define PIN_PH_ADC           34
#define PIN_TURB_ADC         35
#define PIN_LED_RELAY        25
#define PIN_BUZZER_RELAY     27
#define PIN_BUTTON           0

// LoRa Ra-02 (SX1278) on VSPI
#define LORA_SCK             18
#define LORA_MISO            19
#define LORA_MOSI            23
#define LORA_SS              5
#define LORA_RST             14
#define LORA_DIO0            26

// Active level for relay-driven LED/buzzer (set to LOW if your relay is active-LOW)
#define ALERT_ACTIVE_LEVEL   HIGH

// ---------- Radio config (must match receiver) ----------
#define LORA_FREQ_HZ         433E6   // change to 868E6 / 915E6 per your region
#define LORA_TX_POWER_DBM    17
#define LORA_SPREADING       7       // SF7
#define LORA_BANDWIDTH       125E3
#define LORA_CODING_RATE     5       // 4/5
#define LORA_SYNC_WORD       0xA4
#define LORA_PREAMBLE_LEN    8

// ---------- Timing ----------
#define SAMPLE_INTERVAL_MS   10000UL
#define STATUS_INTERVAL_MS   30000UL

// ---------- ADC ----------
// ESP32 ADC: 12-bit, attenuation 11 dB → ~0–3.3 V usable
#define ADC_RESOLUTION_BITS  12
#define ADC_VREF_MV          3300
#define ADC_SAMPLES          16   // averaging per reading

// ---------- Sensible default thresholds (tilapia-friendly; tune later) ----------
#define DEF_TEMP_WARN_LOW    24.0f
#define DEF_TEMP_WARN_HIGH   32.0f
#define DEF_TEMP_CRIT_LOW    20.0f
#define DEF_TEMP_CRIT_HIGH   35.0f

#define DEF_PH_WARN_LOW      6.5f
#define DEF_PH_WARN_HIGH     9.0f
#define DEF_PH_CRIT_LOW      6.0f
#define DEF_PH_CRIT_HIGH     9.5f

#define DEF_TURB_WARN_HIGH   80.0f
#define DEF_TURB_CRIT_HIGH   150.0f

// ---------- Calibration defaults ----------
// pH: typical generic probe outputs ~2.5 V at pH 7, slope ~ -59 mV/pH at 25 °C
#define DEF_PH_V7_MV         2500
#define DEF_PH_V4_MV         3000   // V4 > V7 because slope is negative

// Turbidity (DFRobot SEN0189): clear water ~3.0 V, dirty ~1.5 V. NTU non-linear,
// but linearised between two points is fine for fishpond range.
#define DEF_TURB_V_CLEAR_MV  3000
#define DEF_TURB_V_DIRTY_MV  1500
#define DEF_TURB_NTU_DIRTY   1000.0f

// ---------- Misc ----------
#define LORA_MAX_PAYLOAD     32
