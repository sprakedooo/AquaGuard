#pragma once
#include <Arduino.h>
#include "packet.h"
#include "sensors.h"
#include "storage.h"

namespace alerts {
    void begin();

    // Re-evaluates level from a reading + thresholds and updates blink state.
    pkt::AlertLevel evaluate(const Reading& r, const Thresholds& th, uint8_t* outFlags);

    // Drives LED + buzzer; call from loop() as often as possible (non-blocking).
    void tick();

    // Direct override (e.g. on receiver mirror, or for bench testing).
    void setLevel(pkt::AlertLevel lvl);

    pkt::AlertLevel current();
}
