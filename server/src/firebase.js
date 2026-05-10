import admin from 'firebase-admin';
import { config } from './config.js';
import { logger } from './logger.js';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: config.firebase.databaseURL,
});

export const db = admin.database();
export const ServerValue = admin.database.ServerValue;

const deviceRef  = (id)       => db.ref(`devices/${id}`);
const calRef     = (id)       => db.ref(`devices/${id}/calibration`);
const threshRef  = (id)       => db.ref(`devices/${id}/meta/thresholds`);

// ---------- Calibration (read / write) ----------

export async function saveCalibration(deviceId, type, data) {
  await calRef(deviceId).child(type).set({ ...data, savedAt: ServerValue.TIMESTAMP });
}

async function readCalibration(deviceId) {
  const snap = await calRef(deviceId).once('value');
  return snap.val() ?? {};
}

async function readThresholds(deviceId) {
  const snap = await threshRef(deviceId).once('value');
  return snap.val() ?? null;
}

// ---------- Server-side sensor computation ----------

// Nernst equation: pH = 7 + (V7 - Vmeas) / slope(T)
function computePh(pH_mv, tempC, phCal) {
  if (!phCal?.v7_mv || !phCal?.v4_mv) return null;
  const v7 = phCal.v7_mv;
  const v4 = phCal.v4_mv;
  let slopeRef = (v4 - v7) / (4 - 7); // mV/pH at ~25°C, typically negative
  if (Math.abs(slopeRef) < 1) slopeRef = -167;  // sanity fallback

  const tK    = (typeof tempC === 'number' && tempC > -50) ? tempC + 273.15 : 298.15;
  const slope = slopeRef * (tK / 298.15);

  let pH = 7 + (v7 - pH_mv) / slope;
  if (pH < 0)  pH = 0;
  if (pH > 14) pH = 14;
  return Math.round(pH * 100) / 100;
}

// Linear interpolation between clear-water and dirty-water cal points
function computeTurbNTU(turb_mv, turbCal) {
  if (!turbCal?.v_clear_mv || !turbCal?.v_dirty_mv) return null;
  const vc = turbCal.v_clear_mv;
  const vd = turbCal.v_dirty_mv;
  if (Math.abs(vc - vd) < 50) return null; // cal points too close

  let ntu = (vc - turb_mv) * (turbCal.ntu_dirty / (vc - vd));
  if (ntu < 0)    ntu = 0;
  if (ntu > 4000) ntu = 4000;
  return Math.round(ntu * 10) / 10;
}

// Evaluate alert level (0=normal, 1=warning, 2=critical) for a single variable
function classifyValue(v, thresh) {
  if (v == null || thresh == null) return 0;
  if (v <= (thresh.critLow ?? -Infinity) || v >= (thresh.critHigh ?? Infinity)) return 2;
  if (v <  (thresh.warnLow ?? -Infinity) || v >  (thresh.warnHigh ?? Infinity)) return 1;
  return 0;
}

// ---------- Telemetry ----------

export async function recordTelemetry(deviceId, data) {
  const { seq, ts, temp, pH, turb, alert, flags, pH_mv, turb_mv, rssi, snr } = data;

  // 1 — Read calibration + thresholds in parallel
  const [cal, thresholds] = await Promise.all([
    readCalibration(deviceId),
    readThresholds(deviceId),
  ]);

  // 2 — Compute pH and turbidity on the server
  const computedPh   = (pH_mv   != null) ? computePh(pH_mv,   temp, cal.ph)   : null;
  const computedTurb = (turb_mv != null) ? computeTurbNTU(turb_mv, cal.turb) : null;

  // 3 — Evaluate server-side alert level (uses all 3 parameters)
  const tempAlert = classifyValue(temp, thresholds?.temp);
  const phAlert   = classifyValue(computedPh,   thresholds?.ph);
  const turbAlert = classifyValue(computedTurb, thresholds?.turb);
  const serverAlert = Math.max(tempAlert, phAlert, turbAlert);

  // 4 — Build the reading record (server values override device-sent 0s)
  const reading = {
    serverTs:    ServerValue.TIMESTAMP,
    deviceTs:    ts           ?? null,
    seq:         seq          ?? null,
    temp:        temp         ?? null,
    pH:          computedPh   ?? pH ?? null,   // server-computed, fallback to device
    turb:        computedTurb ?? turb ?? null,
    pH_mv:       pH_mv        ?? null,
    turb_mv:     turb_mv      ?? null,
    alert:       serverAlert,                  // server re-evaluates with all 3 params
    deviceAlert: alert        ?? 0,            // original device alert (temp-only)
    flags:       flags        ?? 0,
    rssi:        rssi         ?? null,
    snr:         snr          ?? null,
  };

  const dr = deviceRef(deviceId);
  await Promise.all([
    dr.child('latest').set(reading),
    dr.child('readings').push(reading),
    dr.child('meta/lastSeen').set(ServerValue.TIMESTAMP),
    dr.child('meta/lastAlert').set(serverAlert),
  ]);

  return serverAlert;  // caller uses this for alert-event deduplication
}

// ---------- Status ----------

export async function recordStatus(deviceId, data) {
  const patch = {
    online:   data.online   !== false,
    fw:       data.fw       ?? null,
    uptime:   data.uptime   ?? null,
    uplinks:  data.uplinks  ?? null,
    lastRssi: data.lastRssi ?? null,
    lastSnr:  data.lastSnr  ?? null,
    wifiRssi: data.wifiRssi ?? null,
    ip:       data.ip       ?? null,
    statusTs: ServerValue.TIMESTAMP,
  };
  await deviceRef(deviceId).child('meta').update(patch);
}

// ---------- ACK ----------

export async function recordAck(deviceId, data) {
  await deviceRef(deviceId).child('acks').push({
    ...data,
    serverTs: ServerValue.TIMESTAMP,
  });
}

// ---------- Alert event ----------

export async function recordAlertEvent(deviceId, level, payload) {
  await deviceRef(deviceId).child('alerts').push({
    level,
    serverTs: ServerValue.TIMESTAMP,
    ...payload,
  });
}

// ---------- Prune old readings ----------

export async function pruneOldReadings(retentionDays) {
  if (!retentionDays || retentionDays <= 0) return 0;
  const cutoff = Date.now() - retentionDays * 86400_000;
  const snap = await db.ref('devices').once('value');
  let removed = 0;
  const ops = [];
  snap.forEach((deviceSnap) => {
    deviceSnap.child('readings').forEach((r) => {
      const t = r.child('serverTs').val();
      if (typeof t === 'number' && t < cutoff) {
        ops.push(r.ref.remove());
        removed++;
      }
    });
  });
  await Promise.all(ops);
  if (removed > 0) logger.info({ removed, retentionDays }, 'Pruned old readings');
  return removed;
}
