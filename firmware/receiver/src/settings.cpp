#include "settings.h"
#include "config.h"
#include <Preferences.h>

static Preferences prefs;
static const char* NS = "aqgrx";

namespace settings {

void begin() { prefs.begin(NS, false); }

Settings load() {
    Settings s;
    s.deviceId = prefs.getString("dev",   DEFAULT_DEVICE_ID);
    s.mqttHost = prefs.getString("mqh",   "");
    s.mqttPort = prefs.getUShort("mqp",   1883);
    s.mqttUser = prefs.getString("mqu",   "");
    s.mqttPass = prefs.getString("mqpw",  "");
    s.mqttTls  = prefs.getBool  ("mqtls", false);
    return s;
}

void save(const Settings& s) {
    prefs.putString("dev",   s.deviceId);
    prefs.putString("mqh",   s.mqttHost);
    prefs.putUShort("mqp",   s.mqttPort);
    prefs.putString("mqu",   s.mqttUser);
    prefs.putString("mqpw",  s.mqttPass);
    prefs.putBool  ("mqtls", s.mqttTls);
}

void factoryReset() {
    prefs.clear();
}

} // namespace settings
