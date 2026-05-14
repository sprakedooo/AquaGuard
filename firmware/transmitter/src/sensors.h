#pragma once
#include <Arduino.h>

struct Reading {
    float    temperatureC;   // raw DS18B20 reading (no field calibration)
    float    pH;             // NAN — computed server-side from pH_mv
    float    turbidityNTU;   // NAN — computed server-side from turb_mv
    uint16_t pH_mv;          // raw probe voltage sent to server for computation
    uint16_t turb_mv;        // raw probe voltage sent to server for computation
    bool tempOk;
    bool phOk;               // true = probe physically connected and reading valid voltage
    bool turbOk;
};

namespace sensors {
    void begin();

    // No calibration parameter needed — DS18B20 is factory-trimmed, pH/turb
    // calibration is applied server-side.
    Reading read();

    uint16_t readPhMilliVolts();
    uint16_t readTurbMilliVolts();
    float    readTemperatureC();
}
