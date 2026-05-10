#include "alerts.h"
#include "config.h"
#include <math.h>

// LED and buzzer share a single relay — they activate together.
// NORMAL   : relay off
// WARNING  : 1 Hz blink  (500 ms on / 500 ms off)
// CRITICAL : 4 Hz blink  (125 ms on / 125 ms off)

static pkt::AlertLevel s_level    = pkt::ALERT_NORMAL;
static uint32_t        s_lastEdge = 0;
static bool            s_relayOn  = false;

static inline void writeRelay(bool on) {
    digitalWrite(PIN_ALERT_RELAY, on ? ALERT_ACTIVE_LEVEL : !ALERT_ACTIVE_LEVEL);
}

// Classify a single value against {warnLow,warnHigh,critLow,critHigh}.
static pkt::AlertLevel classify(float v, const VarThresh& t) {
    if (isnan(v)) return pkt::ALERT_NORMAL;
    if (v <= t.critLow || v >= t.critHigh) return pkt::ALERT_CRITICAL;
    if (v <  t.warnLow || v >  t.warnHigh) return pkt::ALERT_WARNING;
    return pkt::ALERT_NORMAL;
}

namespace alerts {

void begin() {
    pinMode(PIN_ALERT_RELAY, OUTPUT);
    writeRelay(false);
    s_level    = pkt::ALERT_NORMAL;
    s_lastEdge = millis();
}

pkt::AlertLevel evaluate(const Reading& r, const Thresholds& th, uint8_t* outFlags) {
    pkt::AlertLevel a = classify(r.temperatureC, th.temp);
    pkt::AlertLevel b = classify(r.pH,           th.ph);
    pkt::AlertLevel c = classify(r.turbidityNTU, th.turb);

    pkt::AlertLevel lvl = (pkt::AlertLevel)max((int)a, max((int)b, (int)c));

    if (outFlags) {
        uint8_t f = 0;
        if (a != pkt::ALERT_NORMAL) f |= 0x01;
        if (b != pkt::ALERT_NORMAL) f |= 0x02;
        if (c != pkt::ALERT_NORMAL) f |= 0x04;
        if (!r.tempOk || !r.phOk || !r.turbOk) f |= 0x08;
        *outFlags = f;
    }

    setLevel(lvl);
    return lvl;
}

void setLevel(pkt::AlertLevel lvl) {
    if (lvl == s_level) return;
    s_level    = lvl;
    s_lastEdge = millis();
    s_relayOn  = false;
    writeRelay(false);
}

pkt::AlertLevel current() { return s_level; }

void tick() {
    uint32_t now = millis();

    switch (s_level) {
    case pkt::ALERT_NORMAL:
        if (s_relayOn) { s_relayOn = false; writeRelay(false); }
        return;

    case pkt::ALERT_WARNING: {
        // 1 Hz blink — 500 ms on / 500 ms off
        if (now - s_lastEdge >= 500) {
            s_lastEdge = now;
            s_relayOn  = !s_relayOn;
            writeRelay(s_relayOn);
        }
        return;
    }

    case pkt::ALERT_CRITICAL: {
        // 4 Hz blink — 125 ms on / 125 ms off
        if (now - s_lastEdge >= 125) {
            s_lastEdge = now;
            s_relayOn  = !s_relayOn;
            writeRelay(s_relayOn);
        }
        return;
    }
    }
}

} // namespace alerts
