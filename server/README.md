# AquaGuard — MQTT ↔ Firebase Bridge

Stateless Node.js service that:

1. **Uplink**: subscribes to MQTT topics published by receiver ESP32s and writes to Firebase Realtime Database.
2. **Downlink**: watches a `/commands/<deviceId>` queue in RTDB and publishes each pending command to MQTT.
3. **Retention**: prunes readings older than `READING_RETENTION_DAYS` every 6h.

Everything is realtime — React clients listen directly to RTDB, the bridge is the only writer.

## Setup

```bash
cd server
npm install
cp .env.example .env             # fill in MQTT + Firebase
# Place your Firebase service-account key as ./service-account.json
# (the path comes from GOOGLE_APPLICATION_CREDENTIALS in .env)
npm run dev
```

## Environment

See `.env.example`. Required: `MQTT_URL`, `FIREBASE_DATABASE_URL`, `GOOGLE_APPLICATION_CREDENTIALS`.

## RTDB schema

```
/devices/<deviceId>/
  meta/                    online, fw, lastSeen, lastAlert, ip, wifiRssi, …
  latest/                  latest reading (overwritten each uplink)
  readings/<pushId>        append-only time-series, pruned after retentionDays
  alerts/<pushId>          edge-triggered alert level changes
  acks/<pushId>            ACKs from transmitter (downlink confirmations)

/commands/<deviceId>/<pushId> = {
  type:    "cal/ph" | "cal/turb" | "cal/temp" | "threshold" | "reboot",
  payload: { ... },                       // shape depends on type
  status:  "pending" → "sending" → "sent" | "failed",
  createdAt, sentAt, finishedAt, claimedAt, error?
}
```

The bridge claims each pending row via a transaction (status → "sending"),
publishes to MQTT, and marks it "sent". Multiple bridge instances can run
without duplicate sends.

## MQTT topics

Receivers publish to `aquaguard/<deviceId>/{telemetry,status,alert,ack}`.
Bridge publishes commands to `aquaguard/<deviceId>/cmd/<type>`.

Telemetry payload (from receiver):
```json
{ "seq": 42, "ts": 1715240000, "temp": 28.34, "pH": 7.21, "turb": 45.2,
  "alert": 1, "flags": 2, "rssi": -78, "snr": 9.5 }
```

## Health

`GET http://<host>:<HEALTH_PORT>/healthz` → 200 when MQTT is connected.

## Operations

- **Reset a stuck command**: set its `status` back to `"pending"` in RTDB.
- **Manually issue a command from the console**:
  ```js
  db.ref(`commands/pond-01`).push({
    type: 'cal/ph',
    payload: { point: 7, voltage_mv: 2487 },
    status: 'pending',
    createdAt: admin.database.ServerValue.TIMESTAMP,
  })
  ```
