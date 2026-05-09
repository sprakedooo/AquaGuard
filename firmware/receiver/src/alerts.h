#pragma once
#include <Arduino.h>
#include "packet.h"

namespace alerts {
    void begin();
    void setLevel(pkt::AlertLevel lvl);
    pkt::AlertLevel current();
    void tick();
    void setStaleTimeout(uint32_t ms);   // if no telemetry seen in N ms, force NORMAL+off
    void noteTelemetry();
}
