// Synthetic telemetry generator. Writes directly to Firebase RTDB,
// mimicking what the bridge would write when receiving real MQTT uplinks.
//
// Usage:
//   node scripts/mock-feed.js [deviceId]
//
// Examples:
//   node scripts/mock-feed.js              # default deviceId = pond-01
//   node scripts/mock-feed.js pond-02      # custom device
//   SCENARIO=spike node scripts/mock-feed.js   # injects an alert burst
//
// Requires the same .env / service-account.json as the bridge.

import 'dotenv/config';
import admin from 'firebase-admin';

const DEVICE_ID = process.argv[2] || 'pond-01';
const TICK_MS   = Number(process.env.MOCK_TICK_MS || 5000);
const SCENARIO  = (process.env.SCENARIO || 'normal').toLowerCase();

const databaseURL = process.env.FIREBASE_DATABASE_URL;
if (!databaseURL) {
  console.error('FIREBASE_DATABASE_URL is not set. Run from server/ where .env is loaded.');
  process.exit(1);
}
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL,
});
const db = admin.database();
const { ServerValue } = admin.database;

// ---------- Default thresholds (match firmware/web defaults) ----------
const THRESH = {
  temp: { warnLow: 24, warnHigh: 32, critLow: 20, critHigh: 35 },
  ph:   { warnLow: 6.5, warnHigh: 9.0, critLow: 6.0, critHigh: 9.5 },
  turb: { warnLow: -1e9, warnHigh: 80, critLow: -1e9, critHigh: 150 },
};

function classify(v, t, upperOnly) {
  if (upperOnly) {
    if (v >= t.critHigh) return 2;
    if (v >= t.warnHigh) return 1;
    return 0;
  }
  if (v <= t.critLow || v >= t.critHigh) return 2;
  if (v < t.warnLow || v > t.warnHigh)   return 1;
  return 0;
}

// ---------- Simple Ornstein-Uhlenbeck drift ----------
function makeWalker({ mean, std, theta = 0.05 }) {
  let x = mean;
  return () => {
    const noise = (Math.random() * 2 - 1) * std;
    x = x + theta * (mean - x) + noise;
    return x;
  };
}

const tempW = makeWalker({ mean: 28,  std: 0.15 });
const phW   = makeWalker({ mean: 7.4, std: 0.04 });
const turbW = makeWalker({ mean: 25,  std: 2.5  });

// ---------- Scenario hooks ----------
let scenarioState = { spikeUntil: 0 };
function applyScenario(reading, now) {
  if (SCENARIO === 'spike') {
    // 20 s every 2 min: push turbidity high to trigger alerts
    const phase = (now / 1000) % 120;
    if (phase < 20) reading.turb = 180 + Math.random() * 30;
  }
  if (SCENARIO === 'random') {
    if (Math.random() < 0.02) reading.turb = 200 + Math.random() * 50;
    if (Math.random() < 0.01) reading.pH   = 5.5 + Math.random() * 0.4;
  }
  return reading;
}

// ---------- Probe voltage simulation (so calibration wizard has data) ----------
function phToMv(pH) {
  // Inverse of firmware: V = V7 + (7 - pH) * slope  (slope ~ -167 mV/pH)
  return Math.round(2500 + (7 - pH) * -167);
}
function ntuToMv(ntu) {
  // Inverse linear: V = V_clear - (ntu / NTU_dirty) * (V_clear - V_dirty)
  const Vc = 3000, Vd = 1500, NTUd = 1000;
  return Math.round(Math.max(0, Math.min(3300, Vc - (ntu / NTUd) * (Vc - Vd))));
}

// ---------- Emit one reading ----------
let seq = 0;
let lastAlert = -1;

async function tick() {
  const now = Date.now();
  let r = {
    temp: tempW(),
    pH:   phW(),
    turb: Math.max(0, turbW()),
  };
  r = applyScenario(r, now);

  const alertTemp = classify(r.temp, THRESH.temp);
  const alertPh   = classify(r.pH,   THRESH.ph);
  const alertTurb = classify(r.turb, THRESH.turb, true);
  const alert     = Math.max(alertTemp, alertPh, alertTurb);
  const flags     = (alertTemp ? 1 : 0) | (alertPh ? 2 : 0) | (alertTurb ? 4 : 0);

  const reading = {
    serverTs: ServerValue.TIMESTAMP,
    deviceTs: Math.floor(now / 1000),
    seq: seq++,
    temp: Number(r.temp.toFixed(2)),
    pH:   Number(r.pH.toFixed(2)),
    turb: Number(r.turb.toFixed(1)),
    alert,
    flags,
    pH_mv:   phToMv(r.pH),
    turb_mv: ntuToMv(r.turb),
    rssi: -60 - Math.floor(Math.random() * 20),
    snr:  Number((6 + Math.random() * 4).toFixed(1)),
  };

  const dev = db.ref(`devices/${DEVICE_ID}`);
  await Promise.all([
    dev.child('latest').set(reading),
    dev.child('readings').push(reading),
    dev.child('meta').update({
      online: true,
      fw: 'mock-0.1.0',
      uptime: Math.floor((now - startedAt) / 1000),
      uplinks: seq,
      lastRssi: reading.rssi,
      lastSnr:  reading.snr,
      wifiRssi: -55 - Math.floor(Math.random() * 15),
      ip: '192.168.1.100',
      lastSeen: ServerValue.TIMESTAMP,
      lastAlert: alert,
      statusTs: ServerValue.TIMESTAMP,
    }),
  ]);

  if (alert !== lastAlert) {
    await dev.child('alerts').push({
      level: alert,
      source: 'mock',
      temp: reading.temp,
      pH:   reading.pH,
      turb: reading.turb,
      flags,
      serverTs: ServerValue.TIMESTAMP,
    });
    lastAlert = alert;
  }

  console.log(
    `[${new Date().toLocaleTimeString()}] ${DEVICE_ID}  ` +
    `T=${reading.temp}°C  pH=${reading.pH}  Turb=${reading.turb}NTU  ` +
    `alert=${alert}  seq=${reading.seq}`
  );
}

const startedAt = Date.now();
console.log(`Mock feed → ${DEVICE_ID} every ${TICK_MS}ms (scenario=${SCENARIO}). Ctrl+C to stop.`);

tick().catch(console.error);
const timer = setInterval(() => tick().catch(console.error), TICK_MS);

async function shutdown() {
  clearInterval(timer);
  try {
    await db.ref(`devices/${DEVICE_ID}/meta`).update({ online: false, statusTs: ServerValue.TIMESTAMP });
  } catch {}
  process.exit(0);
}
process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);
