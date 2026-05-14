#include <Arduino.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include "config.h"
#include "settings.h"
#include "wifi_setup.h"
#include "mqtt_link.h"
#include "lora_link.h"
#include "alerts.h"
#include "packet.h"
#include "web_admin.h"

static Settings g_settings;
static uint32_t g_lastStatus = 0;
static uint32_t g_uplinkCount = 0;
static int      g_lastRssi = 0;
static float    g_lastSnr  = 0.0f;
static float    g_lastTemp = NAN, g_lastPh = NAN, g_lastTurb = NAN;
static uint8_t  g_lastAlert = 0;
static uint32_t g_lastTelMs = 0;

// ---------- LoRa uplink → MQTT ----------
static void handleTelemetry(const lora_link::UplinkMeta& m, const uint8_t* p, uint8_t plen) {
    pkt::Telemetry t;
    if (!pkt::decodeTelemetry(p, plen, t)) return;

    float tempC = (t.tempC_x100 == INT16_MIN) ? NAN : (t.tempC_x100 / 100.0f);
    float pH    = (t.pH_x100 == 0)            ? NAN : (t.pH_x100 / 100.0f);
    float turb  = (t.turbNTU_x10 == 0xFFFF)   ? NAN : (t.turbNTU_x10 / 10.0f);

    g_lastTemp = tempC; g_lastPh = pH; g_lastTurb = turb;
    g_lastAlert = t.alertLevel;
    g_lastTelMs = millis();
    alerts::setLevel((pkt::AlertLevel)t.alertLevel);
    alerts::noteTelemetry();

    JsonDocument d;
    d["seq"]   = m.seq;
    d["ts"]    = (uint32_t)(millis() / 1000);
    if (!isnan(tempC)) d["temp"] = tempC;
    if (!isnan(pH))    d["pH"]   = pH;
    if (!isnan(turb))  d["turb"] = turb;
    d["alert"]   = t.alertLevel;
    d["flags"]   = t.flags;
    d["pH_mv"]   = t.pH_mv;
    d["turb_mv"] = t.turb_mv;
    d["rssi"]    = m.rssi;
    d["snr"]     = m.snr;

    char buf[256];
    size_t n = serializeJson(d, buf, sizeof(buf));
    if (n > 0) mqtt_link::publishTelemetryJson(buf);

    g_uplinkCount++;
    g_lastRssi = m.rssi;
    g_lastSnr  = m.snr;
}

static void handleAck(const lora_link::UplinkMeta& m, const uint8_t* p, uint8_t plen) {
    if (plen != 2) return;
    JsonDocument d;
    d["seq"]      = m.seq;
    d["refType"]  = p[0];
    d["status"]   = p[1];
    char buf[96];
    serializeJson(d, buf, sizeof(buf));
    mqtt_link::publishAckJson(buf);
}

static void onUplink(const lora_link::UplinkMeta& m, const uint8_t* p, uint8_t plen) {
    switch (m.msgType) {
        case pkt::MSG_TELEMETRY: handleTelemetry(m, p, plen); break;
        case pkt::MSG_ACK:       handleAck      (m, p, plen); break;
        default: break;
    }
}

// ---------- MQTT command → LoRa downlink ----------
// Sub-topics under aquaguard/{id}/cmd/...
//   threshold  {"var":"temp"|"ph"|"turb","warnLow":..,"warnHigh":..,"critLow":..,"critHigh":..}
//   reboot     {}
//
// Calibration commands (cal/ph, cal/turb, cal/temp) are NOT forwarded to the
// device — pH/turb calibration lives in Firebase and is applied server-side;
// DS18B20 needs no field calibration.
static void onCommand(const char* sub, const uint8_t* payload, size_t len) {
    JsonDocument d;
    DeserializationError err = deserializeJson(d, payload, len);
    if (err && strcmp(sub, "reboot") != 0) {
        Serial.printf("cmd %s: bad json (%s)\n", sub, err.c_str());
        return;
    }

    if (!strcmp(sub, "threshold")) {
        const char* var = d["var"] | "";
        uint8_t v = (!strcmp(var, "temp")) ? 0 : (!strcmp(var, "ph")) ? 1 : (!strcmp(var, "turb")) ? 2 : 0xFF;
        if (v == 0xFF) return;
        float scale = (v == 2) ? 10.0f : 100.0f;
        int16_t vals[4] = {
            (int16_t)((float)(d["warnLow"]  | 0.0f) * scale),
            (int16_t)((float)(d["warnHigh"] | 0.0f) * scale),
            (int16_t)((float)(d["critLow"]  | 0.0f) * scale),
            (int16_t)((float)(d["critHigh"] | 0.0f) * scale),
        };
        uint8_t p[9];
        p[0] = v;
        for (int i = 0; i < 4; ++i) {
            p[1 + i*2] = (uint8_t)(vals[i] >> 8);
            p[2 + i*2] = (uint8_t)(vals[i] & 0xFF);
        }
        lora_link::sendDownlink(pkt::MSG_SET_THRESHOLD, p, sizeof(p));
    }
    else if (!strcmp(sub, "reboot")) {
        lora_link::sendDownlink(pkt::MSG_REBOOT, nullptr, 0);
    }
    else {
        Serial.printf("Unknown cmd subtopic: %s\n", sub);
    }
}

// ---------- Setup ----------
void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.printf("\nAquaGuard RX %s booting\n", FIRMWARE_VERSION);

    pinMode(PIN_BUTTON, INPUT_PULLUP);

    settings::begin();
    g_settings = settings::load();

    alerts::begin();
    alerts::setStaleTimeout(60000);   // 1 min without telemetry → silence locally

    // WiFi: if a long-press portal was requested (flag set before last reboot),
    // run the portal directly — it starts before web_admin so port 80 is free.
    // Otherwise autoConnect: use saved creds or run portal if none are stored.
    if (wifi_setup::portalRequestedAtBoot()) {
        Serial.println("Portal requested — entering WiFi setup");
        wifi_setup::runPortal(g_settings);
    } else {
        wifi_setup::autoConnect(g_settings);
    }

    // Reload — portal may have changed deviceId / MQTT.
    g_settings = settings::load();

    if (!lora_link::begin()) {
        Serial.println("LoRa init FAILED");
    }
    lora_link::onUplink(onUplink);

    mqtt_link::begin(g_settings, onCommand);

    web_admin::begin(g_settings);
    Serial.println("Ready.");
}

// ---------- Loop ----------
void loop() {
    lora_link::poll();
    mqtt_link::loop();
    alerts::tick();
    web_admin::loop();
    wifi_setup::pollButton(g_settings);

    uint32_t now = millis();
    if (now - g_lastStatus >= STATUS_INTERVAL_MS) {
        g_lastStatus = now;

        JsonDocument d;
        d["online"]   = true;
        d["fw"]       = FIRMWARE_VERSION;
        d["uptime"]   = (uint32_t)(now / 1000);
        d["uplinks"]  = g_uplinkCount;
        d["lastRssi"] = g_lastRssi;
        d["lastSnr"]  = g_lastSnr;
        d["wifiRssi"] = WiFi.RSSI();
        d["ip"]       = WiFi.localIP().toString();
        char buf[256];
        serializeJson(d, buf, sizeof(buf));
        mqtt_link::publishStatusJson(buf);

        web_admin::Status st{
            g_lastTemp, g_lastPh, g_lastTurb,
            g_lastAlert, g_lastRssi, g_lastSnr,
            g_lastTelMs, mqtt_link::connected()
        };
        web_admin::updateStatus(st);
    }
}
