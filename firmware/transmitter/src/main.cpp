#include <Arduino.h>
#include "config.h"
#include "packet.h"
#include "storage.h"
#include "sensors.h"
#include "alerts.h"
#include "lora_link.h"

static PhCal       g_phCal;
static TurbCal     g_turbCal;
static TempCal     g_tempCal;
static Thresholds  g_th;

static uint8_t     g_seq = 0;
static uint32_t    g_lastSample = 0;

// ---------- Downlink dispatch ----------
static void handleCalPh(const uint8_t* p, uint8_t n) {
    // [point u8 (4 or 7)] [voltage_mv u16 BE]
    if (n != 3) return;
    uint8_t  point = p[0];
    uint16_t mv    = ((uint16_t)p[1] << 8) | p[2];
    if (point == 7)      g_phCal.v7_mv = mv;
    else if (point == 4) g_phCal.v4_mv = mv;
    else return;
    g_phCal.calibratedAt = millis() / 1000;
    storage::savePhCal(g_phCal);
}

static void handleCalTurb(const uint8_t* p, uint8_t n) {
    // [point u8 (0=clear,1=dirty)] [voltage_mv u16] [ntu_x10 u16]
    if (n != 5) return;
    uint8_t  point = p[0];
    uint16_t mv    = ((uint16_t)p[1] << 8) | p[2];
    uint16_t nx10  = ((uint16_t)p[3] << 8) | p[4];
    if (point == 0)      g_turbCal.v_clear_mv = mv;
    else if (point == 1) { g_turbCal.v_dirty_mv = mv; g_turbCal.ntu_dirty = nx10 / 10.0f; }
    else return;
    g_turbCal.calibratedAt = millis() / 1000;
    storage::saveTurbCal(g_turbCal);
}

static void handleCalTempOffset(const uint8_t* p, uint8_t n) {
    if (n != 2) return;
    int16_t off_x100 = (int16_t)(((uint16_t)p[0] << 8) | p[1]);
    g_tempCal.offsetC = off_x100 / 100.0f;
    g_tempCal.calibratedAt = millis() / 1000;
    storage::saveTempCal(g_tempCal);
}

static void handleSetThreshold(const uint8_t* p, uint8_t n) {
    // [var u8] [warnLow i16] [warnHigh i16] [critLow i16] [critHigh i16]   (each ×100, except turb ×10)
    if (n != 9) return;
    uint8_t var = p[0];
    int16_t v[4];
    for (int i = 0; i < 4; ++i) v[i] = (int16_t)(((uint16_t)p[1 + i*2] << 8) | p[2 + i*2]);
    VarThresh* dst = nullptr;
    float scale = 100.0f;
    switch (var) {
        case 0: dst = &g_th.temp; scale = 100.0f; break;
        case 1: dst = &g_th.ph;   scale = 100.0f; break;
        case 2: dst = &g_th.turb; scale = 10.0f;  break;
        default: return;
    }
    dst->warnLow  = v[0] / scale;
    dst->warnHigh = v[1] / scale;
    dst->critLow  = v[2] / scale;
    dst->critHigh = v[3] / scale;
    storage::saveThresholds(g_th);
}

static void onDownlink(uint8_t msgType, uint8_t seq, const uint8_t* payload, uint8_t plen) {
    uint8_t status = 0;   // 0 = OK
    switch (msgType) {
        case pkt::MSG_CAL_PH:          handleCalPh(payload, plen);          break;
        case pkt::MSG_CAL_TURB:        handleCalTurb(payload, plen);        break;
        case pkt::MSG_CAL_TEMP_OFFSET: handleCalTempOffset(payload, plen);  break;
        case pkt::MSG_SET_THRESHOLD:   handleSetThreshold(payload, plen);   break;
        case pkt::MSG_REBOOT:
            lora_link::sendAck(seq, msgType, 0);
            delay(100);
            ESP.restart();
            return;
        default:
            status = 1;   // unknown
    }
    lora_link::sendAck(seq, msgType, status);
}

// ---------- Setup ----------
void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.printf("\nAquaGuard TX %s booting (id=%s)\n", FIRMWARE_VERSION, DEVICE_ID);

    pinMode(PIN_BUTTON, INPUT_PULLUP);

    storage::begin();
    storage::loadAll(g_phCal, g_turbCal, g_tempCal, g_th);

    sensors::begin();
    alerts::begin();

    if (!lora_link::begin()) {
        Serial.println("LoRa init FAILED — halting");
        while (true) { delay(1000); }
    }
    lora_link::onDownlink(onDownlink);

    Serial.println("Ready.");
}

// ---------- Loop ----------
void loop() {
    lora_link::poll();
    alerts::tick();

    uint32_t now = millis();
    if (now - g_lastSample >= SAMPLE_INTERVAL_MS) {
        g_lastSample = now;

        Reading r = sensors::read(g_phCal, g_turbCal, g_tempCal);
        uint8_t flags = 0;
        pkt::AlertLevel lvl = alerts::evaluate(r, g_th, &flags);

        pkt::Telemetry t;
        t.tempC_x100   = r.tempOk ? (int16_t)lroundf(r.temperatureC * 100.0f) : INT16_MIN;
        t.pH_x100      = r.phOk   ? (uint16_t)lroundf(r.pH * 100.0f)          : 0;
        t.turbNTU_x10  = r.turbOk ? (uint16_t)lroundf(r.turbidityNTU * 10.0f) : 0xFFFF;
        t.alertLevel   = (uint8_t)lvl;
        t.flags        = flags;
        t.pH_mv        = r.pH_mv;
        t.turb_mv      = r.turb_mv;

        lora_link::sendTelemetry(g_seq++, t);

        Serial.printf("T=%.2fC  pH=%.2f (V=%umV)  Turb=%.1fNTU (V=%umV)  alert=%u flags=0x%02X seq=%u\n",
                      r.temperatureC, r.pH, r.pH_mv,
                      r.turbidityNTU, r.turb_mv,
                      (unsigned)lvl, flags, (unsigned)(g_seq - 1));
    }
}
