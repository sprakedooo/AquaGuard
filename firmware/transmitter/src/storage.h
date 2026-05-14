#pragma once
#include <Arduino.h>

// pH and turbidity calibration is stored in Firebase and computed on the
// server. Temperature has no field calibration (DS18B20 is factory-trimmed).
// Only alert thresholds remain on the device for the local LED/buzzer relay.

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
    void loadAll(Thresholds& th);

    void saveThresholds(const Thresholds& v);

    // Wipe stale TempCal keys left over from older firmware versions.
    // Called once at boot; idempotent — does nothing if the keys don't exist.
    void purgeLegacyTempCal();
}
