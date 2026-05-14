#include "settings.h"
#include "config.h"
#include <Preferences.h>

static Preferences prefs;
static const char* NS = "aqgrx";

namespace settings {

void begin() { prefs.begin(NS, false); }

Settings load() {
    Settings s;
    s.deviceId = prefs.getString("dev",  DEFAULT_DEVICE_ID);

    // For MQTT fields, fall back to compile-time defaults when the stored value
    // is empty — handles boards that were flashed before defaults existed.
    s.mqttHost = prefs.getString("mqh",  "");
    if (s.mqttHost.isEmpty()) s.mqttHost = DEF_MQTT_HOST;

    s.mqttPort = prefs.getUShort("mqp",  0);
    if (s.mqttPort == 0) s.mqttPort = DEF_MQTT_PORT;

    s.mqttUser = prefs.getString("mqu",  "");
    if (s.mqttUser.isEmpty()) s.mqttUser = DEF_MQTT_USER;

    s.mqttPass = prefs.getString("mqpw", "");
    if (s.mqttPass.isEmpty()) s.mqttPass = DEF_MQTT_PASS;

    // TLS: stored as a byte; 0xFF means "never written" → use compile-time default
    uint8_t tlsStored = prefs.getUChar("mqtlsB", 0xFF);
    s.mqttTls = (tlsStored == 0xFF) ? DEF_MQTT_TLS : (tlsStored != 0);
    return s;
}

void save(const Settings& s) {
    prefs.putString("dev",   s.deviceId);
    prefs.putString("mqh",   s.mqttHost);
    prefs.putUShort("mqp",   s.mqttPort);
    prefs.putString("mqu",   s.mqttUser);
    prefs.putString("mqpw",  s.mqttPass);
    prefs.putBool  ("mqtls", s.mqttTls);
    prefs.putUChar ("mqtlsB", s.mqttTls ? 1 : 0);  // sentinel so we know it was saved
}

void factoryReset() {
    prefs.clear();
}

} // namespace settings
