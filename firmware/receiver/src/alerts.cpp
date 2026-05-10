#include "alerts.h"
#include "config.h"

// LED and buzzer share a single relay — they activate together.
// NORMAL   : relay off
// WARNING  : 1 Hz blink  (500 ms on / 500 ms off)
// CRITICAL : 4 Hz blink  (125 ms on / 125 ms off)
// Stale link (no telemetry for staleMs): relay forced off.

static pkt::AlertLevel s_level    = pkt::ALERT_NORMAL;
static uint32_t        s_lastEdge = 0;
static uint32_t        s_lastTel  = 0;
static uint32_t        s_staleMs  = 60000;
static bool            s_relayOn  = false;

static inline void writeRelay(bool on) {
    digitalWrite(PIN_ALERT_RELAY, on ? ALERT_ACTIVE_LEVEL : !ALERT_ACTIVE_LEVEL);
}

namespace alerts {

void begin() {
    pinMode(PIN_ALERT_RELAY, OUTPUT);
    writeRelay(false);
    s_lastTel = millis();
}

void setStaleTimeout(uint32_t ms) { s_staleMs = ms; }
void noteTelemetry()              { s_lastTel = millis(); }
pkt::AlertLevel current()         { return s_level; }

void setLevel(pkt::AlertLevel lvl) {
    if (lvl == s_level) return;
    s_level    = lvl;
    s_lastEdge = millis();
    s_relayOn  = false;
    writeRelay(false);
}

void tick() {
    uint32_t now = millis();

    // Silence relay if the LoRa link has gone stale
    if (now - s_lastTel > s_staleMs && s_level != pkt::ALERT_NORMAL) {
        setLevel(pkt::ALERT_NORMAL);
    }

    switch (s_level) {
    case pkt::ALERT_NORMAL:
        if (s_relayOn) { s_relayOn = false; writeRelay(false); }
        return;

    case pkt::ALERT_WARNING:
        // 1 Hz blink — 500 ms on / 500 ms off
        if (now - s_lastEdge >= 500) {
            s_lastEdge = now;
            s_relayOn  = !s_relayOn;
            writeRelay(s_relayOn);
        }
        return;

    case pkt::ALERT_CRITICAL:
        // 4 Hz blink — 125 ms on / 125 ms off
        if (now - s_lastEdge >= 125) {
            s_lastEdge = now;
            s_relayOn  = !s_relayOn;
            writeRelay(s_relayOn);
        }
        return;
    }
}

} // namespace alerts
