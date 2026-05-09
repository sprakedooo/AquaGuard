#include "alerts.h"
#include "config.h"

static pkt::AlertLevel s_level = pkt::ALERT_NORMAL;
static uint32_t s_lastEdge = 0;
static uint32_t s_lastTel  = 0;
static uint32_t s_staleMs  = 60000;
static bool     s_ledOn = false, s_buzzOn = false;

static inline void writeLed (bool on) { digitalWrite(PIN_LED_RELAY,    on ? ALERT_ACTIVE_LEVEL : !ALERT_ACTIVE_LEVEL); }
static inline void writeBuzz(bool on) { digitalWrite(PIN_BUZZER_RELAY, on ? ALERT_ACTIVE_LEVEL : !ALERT_ACTIVE_LEVEL); }

namespace alerts {

void begin() {
    pinMode(PIN_LED_RELAY,    OUTPUT);
    pinMode(PIN_BUZZER_RELAY, OUTPUT);
    writeLed(false);
    writeBuzz(false);
    s_lastTel = millis();
}

void setStaleTimeout(uint32_t ms) { s_staleMs = ms; }
void noteTelemetry() { s_lastTel = millis(); }
pkt::AlertLevel current() { return s_level; }

void setLevel(pkt::AlertLevel lvl) {
    if (lvl == s_level) return;
    s_level = lvl;
    s_lastEdge = millis();
    s_ledOn = false; s_buzzOn = false;
    writeLed(false); writeBuzz(false);
}

void tick() {
    uint32_t now = millis();
    if (now - s_lastTel > s_staleMs && s_level != pkt::ALERT_NORMAL) {
        setLevel(pkt::ALERT_NORMAL);
    }
    switch (s_level) {
    case pkt::ALERT_NORMAL:
        if (s_ledOn)  { s_ledOn = false;  writeLed(false); }
        if (s_buzzOn) { s_buzzOn = false; writeBuzz(false); }
        return;
    case pkt::ALERT_WARNING: {
        if (now - s_lastEdge >= 500) { s_lastEdge = now; s_ledOn = !s_ledOn; writeLed(s_ledOn); }
        bool b = (now % 5000) < 80;
        if (b != s_buzzOn) { s_buzzOn = b; writeBuzz(b); }
        return;
    }
    case pkt::ALERT_CRITICAL:
        if (now - s_lastEdge >= 125) { s_lastEdge = now; s_ledOn = !s_ledOn; writeLed(s_ledOn); }
        if (!s_buzzOn) { s_buzzOn = true; writeBuzz(true); }
        return;
    }
}

} // namespace alerts
