#pragma once
#include <Arduino.h>
#include "storage.h"

struct Reading {
    float    temperatureC;   // DS18B20 + offset applied on device
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

    // Only TempCal needed on device; pH/turbidity cal lives in Firebase.
    Reading read(const TempCal& tempCal);

    uint16_t readPhMilliVolts();
    uint16_t readTurbMilliVolts();
    float    readTemperatureC();
}
