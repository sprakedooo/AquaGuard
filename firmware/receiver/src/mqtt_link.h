#pragma once
#include <Arduino.h>
#include "settings.h"

namespace mqtt_link {
    typedef void (*CmdHandler)(const char* subtopic, const uint8_t* payload, size_t len);

    void begin(const Settings& s, CmdHandler h);
    void loop();                         // call frequently
    bool connected();

    // Publish helpers — payload is JSON.
    bool publishTelemetryJson(const char* json);
    bool publishStatusJson   (const char* json);   // retained
    bool publishAlertJson    (const char* json);
    bool publishAckJson      (const char* json);

    String topic(const char* leaf);                // aquaguard/{id}/<leaf>
}
