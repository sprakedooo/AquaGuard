#pragma once
#include <Arduino.h>
#include "storage.h"

struct Reading {
    float temperatureC;   // compensated, with offset applied
    float pH;             // temperature-compensated
    float turbidityNTU;
    uint16_t pH_mv;       // raw probe voltage (for debugging / cal UI)
    uint16_t turb_mv;
    bool tempOk;
    bool phOk;
    bool turbOk;
};

namespace sensors {
    void begin();
    Reading read(const PhCal& phCal, const TurbCal& turbCal, const TempCal& tempCal);

    // Helpers exposed for the calibration flow (so the receiver can also request
    // a "raw read" via downlink to capture probe voltage at a known buffer).
    uint16_t readPhMilliVolts();
    uint16_t readTurbMilliVolts();
    float    readTemperatureC();
}
