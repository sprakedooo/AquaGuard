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
        acc += analogReadMilliVolts(pin);
    }
    return (uint16_t)(acc / ADC_SAMPLES);
}

namespace sensors {

void begin() {
    analogReadResolution(ADC_RESOLUTION_BITS);
    analogSetPinAttenuation(PIN_PH_ADC,   ADC_11db);
    analogSetPinAttenuation(PIN_TURB_ADC, ADC_11db);

    ds18b20.begin();
    ds18b20.setResolution(11);  // 375ms conversion; 0.125°C precision
    ds18b20.setWaitForConversion(true);
}

uint16_t readPhMilliVolts()   { return readAdcMilliVolts(PIN_PH_ADC); }
uint16_t readTurbMilliVolts() { return readAdcMilliVolts(PIN_TURB_ADC); }

float readTemperatureC() {
    ds18b20.requestTemperatures();
    return ds18b20.getTempCByIndex(0);
}

Reading read() {
    Reading r{};

    // Temperature — DS18B20 is factory-trimmed; no offset applied.
    float t = readTemperatureC();
    r.tempOk      = (t > -50.0f && t < 100.0f);
    r.temperatureC = r.tempOk ? t : NAN;

    // pH and turbidity — send raw mV only; server applies calibration formula.
    // Upper limit 3400 mV accounts for 5V sensor through 10k/20k voltage divider
    // (peak ADC = 5V × 20/30 = 3.33V). Below 50 mV = probe disconnected.
    r.pH_mv  = readPhMilliVolts();
    r.phOk   = (r.pH_mv > 50 && r.pH_mv < 3400);
    r.pH     = NAN;  // server-computed

    r.turb_mv       = readTurbMilliVolts();
    r.turbOk        = (r.turb_mv > 50 && r.turb_mv < 3400);
    r.turbidityNTU  = NAN;  // server-computed

    return r;
}

} // namespace sensors
