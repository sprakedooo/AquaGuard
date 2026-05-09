# AquaGuard — Receiver Firmware

ESP32 sketch that listens for LoRa uplink from the transmitter, mirrors
the alert state on a local LED+buzzer, and bridges traffic to MQTT.
Provides a captive portal for WiFi/MQTT setup and a LAN admin page.

## Build

```
pio run -d firmware/receiver
pio run -d firmware/receiver -t upload
pio device monitor -d firmware/receiver
```

## First boot / re-provisioning

On first boot (no saved WiFi), the device starts an AP named
`AquaGuard-Setup-<deviceId>` (password: `aquaguard`). Connect, pick your
WiFi, and fill in MQTT broker host / port / user / pass / TLS / device ID.

To re-provision later: hold the **BOOT button** for **5 s**, or visit the
admin page on the LAN and click "Re-run WiFi setup portal".

## Admin page

After WiFi connects, the receiver serves an admin page at its IP
(printed on serial). It shows live values from the latest LoRa uplink,
MQTT status, and lets you edit settings or trigger a factory reset.

## MQTT topics

All topics are namespaced `aquaguard/<deviceId>/`.

### Uplink (published by receiver)

| Topic | Retained | Payload |
|-------|----------|---------|
| `telemetry` | no  | `{seq,ts,temp,pH,turb,alert,flags,rssi,snr}` |
| `status`    | yes | `{online,fw,uptime,uplinks,lastRssi,lastSnr,wifiRssi,ip}` |
| `alert`     | no  | (reserved for edge-triggered alert change events) |
| `ack`       | no  | `{seq,refType,status}` — ACK from transmitter |

LWT: `status = {online:false}` retained on disconnect.

### Downlink (subscribed by receiver)

| Sub-topic | Payload |
|-----------|---------|
| `cmd/cal/ph`     | `{point: 4|7, voltage_mv: <int>}` |
| `cmd/cal/turb`   | `{point: 0|1, voltage_mv, ntu}` (0=clear, 1=dirty) |
| `cmd/cal/temp`   | `{offset_c: <float>}` |
| `cmd/threshold`  | `{var:"temp"|"ph"|"turb", warnLow, warnHigh, critLow, critHigh}` |
| `cmd/reboot`     | `{}` |

The receiver re-encodes each command as a binary LoRa frame and sends it
to the transmitter. The transmitter persists the change in NVS and ACKs
back up the chain.

## Local alert mirror

The receiver runs the same blink/buzzer state machine as the transmitter,
driven by the `alert` field of each telemetry frame. If no telemetry
arrives for 60 s, the receiver forces NORMAL (silences itself), so a
dead LoRa link doesn't leave the alerts blaring forever.
