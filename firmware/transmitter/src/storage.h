#pragma once
#include <Arduino.h>

// pH and turbidity calibration is now stored in Firebase and computed on the
// server. Only temperature offset and alert thresholds remain on the device.

struct TempCal {
    float    offsetC;
    uint32_t calibratedAt;
};

struct VarThresh {
    float warnLow, warnHigh, critLow, critHigh;
};

struct Thresholds {
    VarThresh temp;
    VarThresh ph;   // kept for future use; not evaluated locally (pH computed server-side)
    VarThresh turb; // kept for future use; not evaluated locally
};

namespace storage {
    void begin();
    void loadAll(TempCal& te, Thresholds& th);

    void saveTempCal(const TempCal& v);
    void saveThresholds(const Thresholds& v);
}
