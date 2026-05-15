import admin from 'firebase-admin';
import { config } from './config.js';
import { logger } from './logger.js';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: config.firebase.databaseURL,
});

export const db = admin.database();
export const ServerValue = admin.database.ServerValue;

// ──────────────────────────────────────────────────────────────────────────────
// Device-index cache: deviceId → uid
// Written by the web app during onboarding; read here to resolve the user path.
// ──────────────────────────────────────────────────────────────────────────────
const _uidCache = new Map();

async function uidOf(deviceId) {
  if (_uidCache.has(deviceId)) return _uidCache.get(deviceId);
  const snap = await db.ref(`device-index/${deviceId}`).once('value');
  const uid  = snap.val() ?? null;
  if (uid) _uidCache.set(deviceId, uid);
  return uid;
}

/** Returns the database ref for a device, resolving the per-user path.
 *  Falls back to the legacy /devices/{id} path if the device has no owner
 *  in the index (e.g. mock-feed or pre-migration data). */
async function deviceRef(deviceId) {
  const uid = await uidOf(deviceId);
  if (!uid) {
    logger.warn({ deviceId }, 'device-index miss — falling back to /devices path');
    return db.ref(`devices/${deviceId}`);
  }
  return db.ref(`users/${uid}/devices/${deviceId}`);
}

const calRef   = async (id) => (await deviceRef(id)).child('calibration');
const threshRef = async (id) => (await deviceRef(id)).child('meta/thresholds');

// ---------- Calibration (read / write) ----------

export async function saveCalibration(deviceId, type, data) {
  const r = await calRef(deviceId);
  await r.child(type).set({ ...data, savedAt: ServerValue.TIMESTAMP });
}

async function readCalibration(deviceId) {
  const r    = await calRef(deviceId);
  const snap = await r.once('value');
  return snap.val() ?? {};
}

async function readThresholds(deviceId) {
  const r    = await threshRef(deviceId);
  const snap = await r.once('value');
  return snap.val() ?? null;
}

// ---------- Server-side sensor computation ----------

// Two-point linear interpolation between (v7, pH 7) and (v4, pH 4), with
// Nernst temperature correction applied to the slope.
function computePh(pH_mv, tempC, phCal) {
  if (!phCal?.v7_mv || !phCal?.v4_mv) return null;
  const v7 = phCal.v7_mv;
  const v4 = phCal.v4_mv;
  let slopeRef = (v4 - v7) / (4 - 7);
  if (Math.abs(slopeRef) < 1) slopeRef = -167;

  const tK   = (typeof tempC === 'number' && tempC > -50) ? tempC + 273.15 : 298.15;
  const slope = slopeRef * (tK / 298.15);

  let pH = 7 + (pH_mv - v7) / slope;
  if (pH < 0)  pH = 0;
  if (pH > 14) pH = 14;
  return Math.round(pH * 100) / 100;
}

function computeTurbNTU(turb_mv, turbCal) {
  if (!turbCal?.v_clear_mv || !turbCal?.v_dirty_mv) return null;
  const vc = turbCal.v_clear_mv;
  const vd = turbCal.v_dirty_mv;
  if (Math.abs(vc - vd) < 50) return null;

  let ntu = (vc - turb_mv) * (turbCal.ntu_dirty / (vc - vd));
  if (ntu < 0)    ntu = 0;
  if (ntu > 4000) ntu = 4000;
  return Math.round(ntu * 10) / 10;
}

function classifyValue(v, thresh) {
  if (v == null || thresh == null) return 0;
  if (v <= (thresh.critLow ?? -Infinity) || v >= (thresh.critHigh ?? Infinity)) return 2;
  if (v <  (thresh.warnLow ?? -Infinity) || v >  (thresh.warnHigh ?? Infinity)) return 1;
  return 0;
}

// ---------- Telemetry ----------

export async function recordTelemetry(deviceId, data) {
  const { seq, ts, temp, pH, turb, alert, flags, pH_mv, turb_mv, rssi, snr } = data;

  const [cal, thresholds] = await Promise.all([
    readCalibration(deviceId),
    readThresholds(deviceId),
  ]);

  const computedPh   = (pH_mv   != null) ? computePh(pH_mv, temp, cal.ph)   : null;
  const computedTurb = (turb_mv != null) ? computeTurbNTU(turb_mv, cal.turb) : null;

  const tempAlert  = classifyValue(temp,        thresholds?.temp);
  const phAlert    = classifyValue(computedPh,  thresholds?.ph);
  const turbAlert  = classifyValue(computedTurb, thresholds?.turb);
  const serverAlert = Math.max(tempAlert, phAlert, turbAlert);

  const reading = {
    serverTs:    ServerValue.TIMESTAMP,
    deviceTs:    ts           ?? null,
    seq:         seq          ?? null,
    temp:        temp         ?? null,
    pH:          computedPh   ?? pH ?? null,
    turb:        computedTurb ?? turb ?? null,
    pH_mv:       pH_mv        ?? null,
    turb_mv:     turb_mv      ?? null,
    alert:       serverAlert,
    deviceAlert: alert        ?? 0,
    flags:       flags        ?? 0,
    rssi:        rssi         ?? null,
    snr:         snr          ?? null,
  };

  const dr = await deviceRef(deviceId);
  await Promise.all([
    dr.child('latest').set(reading),
    dr.child('readings').push(reading),
    dr.child('meta/lastSeen').set(ServerValue.TIMESTAMP),
    dr.child('meta/lastAlert').set(serverAlert),
  ]);

  return serverAlert;
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
  const dr = await deviceRef(deviceId);
  await dr.child('meta').update(patch);
}

// ---------- ACK ----------

export async function recordAck(deviceId, data) {
  const dr = await deviceRef(deviceId);
  await dr.child('acks').push({ ...data, serverTs: ServerValue.TIMESTAMP });
}

// ---------- Alert event ----------

export async function recordAlertEvent(deviceId, level, payload) {
  const dr = await deviceRef(deviceId);
  await dr.child('alerts').push({ level, serverTs: ServerValue.TIMESTAMP, ...payload });
}

// ---------- Prune old readings ----------

export async function pruneOldReadings(retentionDays) {
  if (!retentionDays || retentionDays <= 0) return 0;
  const cutoff = Date.now() - retentionDays * 86400_000;

  // Iterate via the device-index so we know which user each device belongs to.
  const indexSnap = await db.ref('device-index').once('value');
  const entries   = indexSnap.val() ?? {};

  let removed = 0;
  const ops = [];

  for (const [deviceId, uid] of Object.entries(entries)) {
    const readSnap = await db.ref(`users/${uid}/devices/${deviceId}/readings`).once('value');
    readSnap.forEach((r) => {
      const t = r.child('serverTs').val();
      if (typeof t === 'number' && t < cutoff) {
        ops.push(r.ref.remove());
        removed++;
      }
    });
  }

  await Promise.all(ops);
  if (removed > 0) logger.info({ removed, retentionDays }, 'Pruned old readings');
  return removed;
}
