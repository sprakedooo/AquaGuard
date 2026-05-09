#include "sensors.h"
#include "config.h"
#include <OneWire.h>
#include <DallasTemperature.h>
#include <math.h>

static OneWire           oneWire(PIN_DS18B20);
static DallasTemperature ds18b20(&oneWire);

// Average ADC_SAMPLES readings; convert to mV using ESP32 calibrated reading.
static uint16_t readAdcMilliVolts(int pin) {
    uint32_t acc = 0;
    for (int i = 0; i < ADC_SAMPLES; ++i) {
        acc += analogReadMilliVolts(pin);   // ESP32 Arduino: factory-calibrated
    }
    return (uint16_t)(acc / ADC_SAMPLES);
}

namespace sensors {

void begin() {
    analogReadResolution(ADC_RESOLUTION_BITS);
    analogSetPinAttenuation(PIN_PH_ADC,   ADC_11db);
    analogSetPinAttenuation(PIN_TURB_ADC, ADC_11db);

    ds18b20.begin();
    ds18b20.setResolution(12);
    ds18b20.setWaitForConversion(true);
}

uint16_t readPhMilliVolts()   { return readAdcMilliVolts(PIN_PH_ADC); }
uint16_t readTurbMilliVolts() { return readAdcMilliVolts(PIN_TURB_ADC); }

float readTemperatureC() {
    ds18b20.requestTemperatures();
    float t = ds18b20.getTempCByIndex(0);
    return t;   // DEVICE_DISCONNECTED_C == -127 on failure
}

// Linear pH from 2-point cal (V at pH 4 and pH 7), with Nernstian
// temperature compensation applied to the slope.
//   slopeRef = (V4 - V7) / (4 - 7)        [mV/pH at calibration temperature, ~25°C]
//   slope(T) = slopeRef * (T+273.15) / 298.15
//   pH = 7 + (V7 - Vmeas) / slope(T)
static float computePh(uint16_t v_mv, float tempC, const PhCal& c) {
    float v7 = (float)c.v7_mv;
    float v4 = (float)c.v4_mv;
    float slopeRef = (v4 - v7) / (4.0f - 7.0f);   // typically negative, e.g. -167 mV/pH
    if (fabsf(slopeRef) < 1.0f) slopeRef = -167.0f; // sanity fallback

    float tK   = (isnan(tempC) || tempC < -50.0f) ? 298.15f : (tempC + 273.15f);
    float slope = slopeRef * (tK / 298.15f);

    float pH = 7.0f + (v7 - (float)v_mv) / slope;
    if (pH < 0.0f)  pH = 0.0f;
    if (pH > 14.0f) pH = 14.0f;
    return pH;
}

// Linearised turbidity between two cal points (clear water = 0 NTU, dirty = N NTU).
static float computeTurbNTU(uint16_t v_mv, const TurbCal& c) {
    float vc = (float)c.v_clear_mv;
    float vd = (float)c.v_dirty_mv;
    if (fabsf(vc - vd) < 1.0f) return 0.0f;

    // NTU rises as voltage falls (more particles → less light → lower V).
    float ntu = (vc - (float)v_mv) * (c.ntu_dirty / (vc - vd));
    if (ntu < 0.0f) ntu = 0.0f;
    if (ntu > 4000.0f) ntu = 4000.0f;
    return ntu;
}

Reading read(const PhCal& phCal, const TurbCal& turbCal, const TempCal& tempCal) {
    Reading r{};
    float t = readTemperatureC();
    r.tempOk = (t > -50.0f && t < 100.0f);
    r.temperatureC = r.tempOk ? (t + tempCal.offsetC) : NAN;

    r.pH_mv = readPhMilliVolts();
    r.phOk  = (r.pH_mv > 50 && r.pH_mv < 3250);   // outside this range: probe disconnected / saturated
    r.pH    = r.phOk ? computePh(r.pH_mv, r.temperatureC, phCal) : NAN;

    r.turb_mv = readTurbMilliVolts();
    r.turbOk  = (r.turb_mv > 50 && r.turb_mv < 3300);
    r.turbidityNTU = r.turbOk ? computeTurbNTU(r.turb_mv, turbCal) : NAN;

    return r;
}

} // namespace sensors
