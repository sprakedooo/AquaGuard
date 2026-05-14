#include <Arduino.h>
#include "config.h"
#include "packet.h"
#include "storage.h"
#include "sensors.h"
#include "alerts.h"
#include "lora_link.h"

// pH and turbidity calibration moved to Firebase / server-side.
// DS18B20 is factory-trimmed so temperature has no field calibration either.
// Only alert thresholds remain on the device.
static Thresholds  g_th;

static uint8_t  g_seq        = 0;
static uint32_t g_lastSample = 0;

// ---------- Downlink dispatch ----------

static void handleSetThreshold(const uint8_t* p, uint8_t n) {
    // [var u8] [warnLow i16] [warnHigh i16] [critLow i16] [critHigh i16] (×100 or ×10)
    if (n != 9) return;
    uint8_t var = p[0];
    int16_t v[4];
    for (int i = 0; i < 4; ++i) v[i] = (int16_t)(((uint16_t)p[1 + i*2] << 8) | p[2 + i*2]);
    VarThresh* dst   = nullptr;
    float      scale = 100.0f;
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
    uint8_t status = 0;
    switch (msgType) {
        // cal/ph, cal/turb, cal/temp are intentionally ignored:
        //   - pH/turbidity calibration is stored in Firebase and applied server-side
        //   - DS18B20 needs no field calibration (factory-trimmed)
        case pkt::MSG_SET_THRESHOLD: handleSetThreshold(payload, plen); break;
        case pkt::MSG_REBOOT:
            lora_link::sendAck(seq, msgType, 0);
            delay(100);
            ESP.restart();
            return;
        default:
            status = 1;  // unknown / not handled (incl. legacy cal/* opcodes)
    }
    lora_link::sendAck(seq, msgType, status);
}

// ---------- Setup ----------
void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.printf("\nAquaGuard TX %s  device=%s\n", FIRMWARE_VERSION, DEVICE_ID);
    Serial.println("pH/turbidity computed server-side — raw mV only.");

    pinMode(PIN_BUTTON, INPUT_PULLUP);

    storage::begin();
    storage::purgeLegacyTempCal();    // wipe stale offset from previous firmware
    storage::loadAll(g_th);

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

        Reading r = sensors::read();

        // Alert evaluation: only temperature is computed locally.
        // pH and turbidity are NAN so classify() returns NORMAL for them.
        // Server computes full alert level and shows it on the dashboard.
        uint8_t flags = 0;
        pkt::AlertLevel lvl = alerts::evaluate(r, g_th, &flags);

        pkt::Telemetry t;
        t.tempC_x100  = r.tempOk ? (int16_t)lroundf(r.temperatureC * 100.0f) : INT16_MIN;
        t.pH_x100     = 0;       // not computed on device — server will fill this in
        t.turbNTU_x10 = 0xFFFF; // sentinel: not computed on device
        t.alertLevel  = (uint8_t)lvl;
        t.flags       = flags;
        t.pH_mv       = r.pH_mv;   // raw voltage → server applies Nernst equation
        t.turb_mv     = r.turb_mv; // raw voltage → server applies calibration curve

        lora_link::sendTelemetry(g_seq++, t);

        Serial.printf("T=%.2fC  pH_mv=%umV  turb_mv=%umV  alert=%u flags=0x%02X seq=%u\n",
                      r.temperatureC, r.pH_mv, r.turb_mv,
                      (unsigned)lvl, flags, (unsigned)(g_seq - 1));
    }
}
