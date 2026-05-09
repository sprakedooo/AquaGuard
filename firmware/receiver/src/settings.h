#pragma once
#include <Arduino.h>

struct Settings {
    String deviceId;
    String mqttHost;
    uint16_t mqttPort;
    String mqttUser;
    String mqttPass;
    bool   mqttTls;
};

namespace settings {
    void begin();
    Settings load();
    void save(const Settings& s);
    void factoryReset();
}
