# AquaGuard — Web Dashboard

Vite + React + TypeScript + Tailwind. Reads telemetry directly from
Firebase RTDB via the Web SDK (truly realtime, no polling) and issues
device commands by pushing to `/commands/<deviceId>`.

## Setup

```powershell
cd web
npm install
copy .env.example .env
# Edit .env with Firebase web config (Project Settings → General → Your apps)
npm run dev
```

Open http://localhost:5173.

## First-time Firebase steps

1. **Enable Auth → Email/Password** sign-in (Authentication → Sign-in method).
2. **Create your user** under Authentication → Users → Add user.
3. **Grant admin** (so you can issue commands and edit thresholds):
   ```powershell
   cd ..\server
   node scripts/grant-admin.js you@example.com
   ```
   Sign out and back in to refresh your token.
4. **RTDB security rules** — paste in Firebase Console → Realtime Database → Rules:
   ```json
   {
     "rules": {
       "devices": {
         "$deviceId": {
           ".read":  "auth != null",
           ".write": false
         }
       },
       "commands": {
         "$deviceId": {
           ".read":  "auth.token.admin === true",
           ".write": "auth.token.admin === true"
         }
       }
     }
   }
   ```
   The Node bridge uses the Admin SDK and bypasses these rules — it always has full access.

## What you get

- **Live gauges** for temperature, pH, turbidity (color-coded vs thresholds, updated every 10 s as new telemetry arrives).
- **Live trend chart** — 15 m / 1 h / 6 h / 24 h, streamed via `child_added`.
- **Connection card** — online state, RSSI/SNR, last seen.
- **Recent alerts log** — edge-triggered, by level.
- **Threshold editor** — per-variable, sends a `threshold` command on save.
- **Calibration wizard** — pH (2-point), turbidity (clear → known NTU), temperature (offset). Reads live probe voltage from telemetry and sends `cal/*` commands.

All command writes are visible in Firebase under `/commands/<deviceId>/<pushId>` — you can watch them transition `pending → sending → sent` as the bridge picks them up.
