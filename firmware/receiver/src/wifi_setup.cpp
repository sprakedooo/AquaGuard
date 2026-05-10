#include "wifi_setup.h"
#include "config.h"
#include <WiFi.h>
#include <WiFiManager.h>
#include <Preferences.h>

static uint32_t s_btnDownAt = 0;
static const char* SYS_NS = "aqgsys";   // NVS namespace for system flags

namespace wifi_setup {

String apSsidFor(const String& deviceId) {
    return String(AP_SSID_PREFIX) + "-" + deviceId;
}

// Build and run a WiFiManager portal.
// forced=true  → hold portal open forever (manual re-provision via long-press)
// forced=false → try saved creds first (30 s); show portal for 3 min if that fails
static void runPortalInternal(Settings& s, bool forced) {
    WiFiManager wm;

    // Always blocking — non-blocking mode returns immediately on failure which
    // caused a restart loop and the "WiFi connects then goes back to AP" problem.
    wm.setConfigPortalBlocking(true);

    // Don't stay on the portal page after the user presses Save — move on even
    // if the new credentials end up being wrong (we'll retry next boot).
    wm.setBreakAfterConfig(true);

    // How long to spend trying to connect before giving up and starting the portal.
    wm.setConnectTimeout(30);          // 30 s connect attempt

    // How long the portal stays open waiting for configuration.
    // 0 = wait forever (forced/manual mode); 180 s (3 min) for auto mode.
    wm.setConfigPortalTimeout(forced ? 0 : 180);

    // Pre-fill custom fields with values already in NVS.
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

    // forced → explicit portal; auto → try saved creds, portal if they fail
    bool ok = forced
        ? wm.startConfigPortal(apSsid.c_str(), AP_PASSWORD)
        : wm.autoConnect      (apSsid.c_str(), AP_PASSWORD);

    if (ok) {
        // WiFi is now connected.  Save whatever the user typed into the fields
        // (may be unchanged from defaults if they only configured WiFi creds).
        s.deviceId = p_dev.getValue();
        s.mqttHost = p_host.getValue();
        s.mqttPort = (uint16_t)atoi(p_port.getValue());
        s.mqttUser = p_user.getValue();
        s.mqttPass = p_pass.getValue();
        s.mqttTls  = (String(p_tls.getValue()) == "1");
        if (s.mqttPort == 0) s.mqttPort = 1883;
        settings::save(s);
        Serial.printf("WiFi connected. IP=%s  MQTT=%s:%u  device=%s\n",
                      WiFi.localIP().toString().c_str(),
                      s.mqttHost.c_str(), s.mqttPort, s.deviceId.c_str());
    } else {
        // Portal timed out (auto mode only — forced never times out).
        // Don't restart in a tight loop; just continue and let MQTT fail gracefully.
        // The device will function for LoRa reception; MQTT will be offline.
        Serial.println("WiFi portal timed out — continuing without WiFi.");
    }
}

// Called at boot when no portal flag is set: try saved creds, portal on failure.
void autoConnect(Settings& s) { runPortalInternal(s, /*forced=*/false); }

// Called when a portal flag is set (long-press reboot): hold portal open forever.
void runPortal  (Settings& s) { runPortalInternal(s, /*forced=*/true);  }

// Check (and immediately clear) the NVS "run portal on next boot" flag.
bool portalRequestedAtBoot() {
    Preferences p;
    p.begin(SYS_NS, false);
    bool req = p.getBool("portal", false);
    if (req) p.putBool("portal", false);
    p.end();
    return req;
}

// Long-press handler: set flag + reboot so the portal runs before web_admin
// occupies port 80 — avoids the port-conflict that made the portal page never load.
void pollButton(Settings& s) {
    int v = digitalRead(PIN_BUTTON);
    if (v == LOW) {                        // active-low
        if (s_btnDownAt == 0) s_btnDownAt = millis();
        else if (millis() - s_btnDownAt >= BTN_AP_HOLD_MS) {
            Serial.println("Long press — scheduling portal on next boot");
            s_btnDownAt = 0;
            Preferences p;
            p.begin(SYS_NS, false);
            p.putBool("portal", true);
            p.end();
            delay(200);
            ESP.restart();
        }
    } else {
        s_btnDownAt = 0;
    }
}

} // namespace wifi_setup
