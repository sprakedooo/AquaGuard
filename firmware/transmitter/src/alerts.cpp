#include "alerts.h"
#include "config.h"
#include <math.h>

static pkt::AlertLevel s_level = pkt::ALERT_NORMAL;
static uint32_t s_lastEdge = 0;
static bool     s_ledOn    = false;
static bool     s_buzzOn   = false;
static uint32_t s_buzzPulseStart = 0;

static inline void writeLed (bool on) { digitalWrite(PIN_LED_RELAY,    on ? ALERT_ACTIVE_LEVEL : !ALERT_ACTIVE_LEVEL); }
static inline void writeBuzz(bool on) { digitalWrite(PIN_BUZZER_RELAY, on ? ALERT_ACTIVE_LEVEL : !ALERT_ACTIVE_LEVEL); }

// Classify a single value against {warnLow,warnHigh,critLow,critHigh}.
// critLow/critHigh outside warnLow/warnHigh defines the "even worse" band.
static pkt::AlertLevel classify(float v, const VarThresh& t) {
    if (isnan(v)) return pkt::ALERT_NORMAL;
    if (v <= t.critLow || v >= t.critHigh) return pkt::ALERT_CRITICAL;
    if (v <  t.warnLow || v >  t.warnHigh) return pkt::ALERT_WARNING;
    return pkt::ALERT_NORMAL;
}

namespace alerts {

void begin() {
    pinMode(PIN_LED_RELAY,    OUTPUT);
    pinMode(PIN_BUZZER_RELAY, OUTPUT);
    writeLed(false);
    writeBuzz(false);
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
    s_ledOn    = false;
    s_buzzOn   = false;
    writeLed(false);
    writeBuzz(false);
}

pkt::AlertLevel current() { return s_level; }

void tick() {
    uint32_t now = millis();

    switch (s_level) {
    case pkt::ALERT_NORMAL: {
        if (s_ledOn)  { s_ledOn = false;  writeLed(false); }
        if (s_buzzOn) { s_buzzOn = false; writeBuzz(false); }
        return;
    }
    case pkt::ALERT_WARNING: {
        // 1 Hz LED (500 ms on / 500 ms off)
        const uint32_t period = 500;
        if (now - s_lastEdge >= period) {
            s_lastEdge = now;
            s_ledOn = !s_ledOn;
            writeLed(s_ledOn);
        }
        // Short buzzer chirp (80 ms) every 5 s
        const uint32_t chirpEvery = 5000, chirpLen = 80;
        uint32_t phase = now % chirpEvery;
        bool wantBuzz = (phase < chirpLen);
        if (wantBuzz != s_buzzOn) { s_buzzOn = wantBuzz; writeBuzz(wantBuzz); }
        return;
    }
    case pkt::ALERT_CRITICAL: {
        // 4 Hz LED (125 ms on / 125 ms off), continuous buzzer
        const uint32_t period = 125;
        if (now - s_lastEdge >= period) {
            s_lastEdge = now;
            s_ledOn = !s_ledOn;
            writeLed(s_ledOn);
        }
        if (!s_buzzOn) { s_buzzOn = true; writeBuzz(true); }
        return;
    }
    }
}

} // namespace alerts
