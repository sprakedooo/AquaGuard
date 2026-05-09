# AquaGuard — Transmitter Firmware

ESP32 sketch that reads the three sensors, evaluates alert state locally,
drives the LED + buzzer relays, and transmits telemetry over LoRa to the
receiver. Also accepts downlink commands (calibration, thresholds, reboot).

## Build

PlatformIO:

```
pio run -d firmware/transmitter
pio run -d firmware/transmitter -t upload
pio device monitor -d firmware/transmitter
```

## Pinout

See `src/config.h`. ESP32 DevKit v1 defaults:

| Function          | GPIO |
|-------------------|------|
| DS18B20 data      | 4    |
| pH analog         | 34   |
| Turbidity analog  | 35   |
| LED relay         | 25   |
| Buzzer relay      | 27   |
| LoRa SCK / MISO / MOSI | 18 / 19 / 23 |
| LoRa NSS / RST / DIO0  | 5 / 14 / 26 |

## LoRa packet format

Variable-length:

```
[msgType u8][seq u8][len u8][payload …][CRC16-CCITT BE u16]
```

Telemetry payload (8 B): `tempC×100 i16 BE | pH×100 u16 BE | NTU×10 u16 BE | alertLevel u8 | flags u8`.

CRC is over `[msgType .. last payload byte]`, polynomial `0x1021`, init `0xFFFF`.

Radio config (must match RX): 433 MHz, SF7, BW 125 kHz, CR 4/5, sync 0xA4. Change `LORA_FREQ_HZ` for your region.

## Calibration model

| Sensor | Stored | Math |
|--------|--------|------|
| pH     | V at pH 7, V at pH 4 | linear, slope temperature-compensated via Nernst |
| Turbidity | V_clear (0 NTU), V_dirty + NTU_dirty | linear interp |
| Temperature | offsetC | DS18B20 reading + offset |

Calibration is initiated from the dashboard. The receiver forwards a
`CAL_PH / CAL_TURB / CAL_TEMP_OFFSET` downlink, this firmware writes
NVS and ACKs.
