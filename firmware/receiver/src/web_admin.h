#pragma once
#include <Arduino.h>
#include "settings.h"

namespace web_admin {
    // Live status snapshot rendered on the admin page.
    struct Status {
        float    lastTempC;
        float    lastPh;
        float    lastTurbNTU;
        uint8_t  lastAlert;
        int      lastRssi;
        float    lastSnr;
        uint32_t lastSeenMs;   // millis() at last uplink
        bool     mqttConnected;
    };

    void begin(Settings& s);
    void loop();
    void updateStatus(const Status& st);
}
