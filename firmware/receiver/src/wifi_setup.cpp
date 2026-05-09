#include "wifi_setup.h"
#include "config.h"
#include <WiFi.h>
#include <WiFiManager.h>

static uint32_t s_btnDownAt = 0;

namespace wifi_setup {

String apSsidFor(const String& deviceId) {
    return String(AP_SSID_PREFIX) + "-" + deviceId;
}

static void runPortalInternal(Settings& s, bool blocking) {
    WiFiManager wm;
    wm.setConfigPortalBlocking(blocking);
    wm.setBreakAfterConfig(true);
    wm.setConfigPortalTimeout(blocking ? 0 : 300);   // 0 = no timeout in blocking mode

    char devBuf[40], hostBuf[64], portBuf[8], userBuf[64], passBuf[64], tlsBuf[4];
    strlcpy(devBuf,  s.deviceId.c_str(), sizeof(devBuf));
    strlcpy(hostBuf, s.mqttHost.c_str(), sizeof(hostBuf));
    snprintf(portBuf, sizeof(portBuf), "%u", s.mqttPort);
    strlcpy(userBuf, s.mqttUser.c_str(), sizeof(userBuf));
    strlcpy(passBuf, s.mqttPass.c_str(), sizeof(passBuf));
    strlcpy(tlsBuf,  s.mqttTls ? "1" : "0", sizeof(tlsBuf));

    WiFiManagerParameter p_dev ("device_id", "Device ID",        devBuf,  sizeof(devBuf));
    WiFiManagerParameter p_host("mqtt_host", "MQTT Broker Host", hostBuf, sizeof(hostBuf));
    WiFiManagerParameter p_port("mqtt_port", "MQTT Port",        portBuf, sizeof(portBuf));
    WiFiManagerParameter p_user("mqtt_user", "MQTT Username",    userBuf, sizeof(userBuf));
    WiFiManagerParameter p_pass("mqtt_pass", "MQTT Password",    passBuf, sizeof(passBuf));
    WiFiManagerParameter p_tls ("mqtt_tls",  "TLS (1/0)",        tlsBuf,  sizeof(tlsBuf));

    wm.addParameter(&p_dev);
    wm.addParameter(&p_host);
    wm.addParameter(&p_port);
    wm.addParameter(&p_user);
    wm.addParameter(&p_pass);
    wm.addParameter(&p_tls);

    String apSsid = apSsidFor(s.deviceId);
    bool ok = blocking
        ? wm.startConfigPortal(apSsid.c_str(), AP_PASSWORD)
        : wm.autoConnect      (apSsid.c_str(), AP_PASSWORD);

    if (ok) {
        s.deviceId  = p_dev.getValue();
        s.mqttHost  = p_host.getValue();
        s.mqttPort  = (uint16_t)atoi(p_port.getValue());
        s.mqttUser  = p_user.getValue();
        s.mqttPass  = p_pass.getValue();
        s.mqttTls   = (String(p_tls.getValue()) == "1");
        if (s.mqttPort == 0) s.mqttPort = 1883;
        settings::save(s);
        Serial.printf("WiFi connected. IP=%s  MQTT=%s:%u  device=%s\n",
                      WiFi.localIP().toString().c_str(),
                      s.mqttHost.c_str(), s.mqttPort, s.deviceId.c_str());
    } else {
        Serial.println("Portal exited without success — restarting.");
        delay(500);
        ESP.restart();
    }
}

void autoConnect(Settings& s) { runPortalInternal(s, /*blocking=*/false); }
void runPortal  (Settings& s) { runPortalInternal(s, /*blocking=*/true ); }

void pollButton(Settings& s) {
    int v = digitalRead(PIN_BUTTON);
    if (v == LOW) {                       // pressed (active-low)
        if (s_btnDownAt == 0) s_btnDownAt = millis();
        else if (millis() - s_btnDownAt >= BTN_AP_HOLD_MS) {
            Serial.println("Long press → entering AP setup mode");
            s_btnDownAt = 0;
            runPortal(s);
        }
    } else {
        s_btnDownAt = 0;
    }
}

} // namespace wifi_setup
