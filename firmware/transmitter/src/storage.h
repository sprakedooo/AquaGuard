#pragma once
#include <Arduino.h>

struct PhCal {
    uint16_t v7_mv;     // probe voltage in pH 7 buffer
    uint16_t v4_mv;     // probe voltage in pH 4 buffer
    uint32_t calibratedAt; // epoch (or millis at boot if no RTC)
};

struct TurbCal {
    uint16_t v_clear_mv;
    uint16_t v_dirty_mv;
    float    ntu_dirty;
    uint32_t calibratedAt;
};

struct TempCal {
    float    offsetC;
    uint32_t calibratedAt;
};

struct VarThresh {
    float warnLow, warnHigh, critLow, critHigh;
};

struct Thresholds {
    VarThresh temp;
    VarThresh ph;
    VarThresh turb;   // only *High used; *Low set to -INF
};

namespace storage {
    void begin();
    void loadAll(PhCal& ph, TurbCal& tu, TempCal& te, Thresholds& th);

    void savePhCal(const PhCal& v);
    void saveTurbCal(const TurbCal& v);
    void saveTempCal(const TempCal& v);
    void saveThresholds(const Thresholds& v);
}
