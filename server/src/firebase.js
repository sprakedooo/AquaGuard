import admin from 'firebase-admin';
import { config } from './config.js';
import { logger } from './logger.js';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: config.firebase.databaseURL,
});

export const db = admin.database();
export const ServerValue = admin.database.ServerValue;

const deviceRef = (id) => db.ref(`devices/${id}`);

export async function recordTelemetry(deviceId, data) {
  const { seq, ts, temp, pH, turb, alert, flags, pH_mv, turb_mv, rssi, snr } = data;
  const reading = {
    serverTs: ServerValue.TIMESTAMP,
    deviceTs: ts ?? null,
    seq: seq ?? null,
    temp: temp ?? null,
    pH:   pH   ?? null,
    turb: turb ?? null,
    alert: alert ?? 0,
    flags: flags ?? 0,
    pH_mv:   pH_mv   ?? null,
    turb_mv: turb_mv ?? null,
    rssi: rssi ?? null,
    snr:  snr  ?? null,
  };
  const dr = deviceRef(deviceId);
  await Promise.all([
    dr.child('latest').set(reading),
    dr.child('readings').push(reading),
    dr.child('meta/lastSeen').set(ServerValue.TIMESTAMP),
    dr.child('meta/lastAlert').set(alert ?? 0),
  ]);
}

export async function recordStatus(deviceId, data) {
  const patch = {
    online: data.online !== false,
    fw: data.fw ?? null,
    uptime: data.uptime ?? null,
    uplinks: data.uplinks ?? null,
    lastRssi: data.lastRssi ?? null,
    lastSnr: data.lastSnr ?? null,
    wifiRssi: data.wifiRssi ?? null,
    ip: data.ip ?? null,
    statusTs: ServerValue.TIMESTAMP,
  };
  await deviceRef(deviceId).child('meta').update(patch);
}

export async function recordAck(deviceId, data) {
  await deviceRef(deviceId).child('acks').push({
    ...data,
    serverTs: ServerValue.TIMESTAMP,
  });
}

export async function recordAlertEvent(deviceId, level, payload) {
  await deviceRef(deviceId).child('alerts').push({
    level,
    serverTs: ServerValue.TIMESTAMP,
    ...payload,
  });
}

export async function pruneOldReadings(retentionDays) {
  if (!retentionDays || retentionDays <= 0) return 0;
  const cutoff = Date.now() - retentionDays * 86400_000;
  const snap = await db.ref('devices').once('value');
  let removed = 0;
  const ops = [];
  snap.forEach((deviceSnap) => {
    const readings = deviceSnap.child('readings');
    readings.forEach((r) => {
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
