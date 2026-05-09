import { db, ServerValue } from './firebase.js';
import { publishCommand } from './mqtt.js';
import { logger } from './logger.js';

// Command record shape (written by React app):
//   /commands/<deviceId>/<pushId> = {
//     type: "cal/ph" | "cal/turb" | "cal/temp" | "threshold" | "reboot",
//     payload: { ... },
//     status: "pending",            // bridge will move to "sent" / "failed"
//     createdAt: <serverTimestamp>,
//     createdBy: <uid|null>,
//   }
//
// We only act on "pending" rows. To prevent races between concurrent bridge
// instances, we transactionally claim each row by setting status → "sending".

const ALLOWED_TYPES = new Set(['cal/ph', 'cal/turb', 'cal/temp', 'threshold', 'reboot']);

async function claim(snapRef) {
  const result = await snapRef.transaction((cur) => {
    if (!cur || cur.status !== 'pending') return;          // abort
    cur.status = 'sending';
    cur.claimedAt = Date.now();                            // millis (server-side patched below)
    return cur;
  });
  return result.committed && result.snapshot.exists();
}

async function process(deviceId, snap) {
  const ref = snap.ref;
  const cmd = snap.val();
  if (!cmd || cmd.status !== 'pending') return;

  if (!ALLOWED_TYPES.has(cmd.type)) {
    await ref.update({ status: 'failed', error: `unknown type: ${cmd.type}`, finishedAt: ServerValue.TIMESTAMP });
    return;
  }

  const claimed = await claim(ref);
  if (!claimed) return;   // someone else got it

  try {
    const topic = await publishCommand(deviceId, cmd.type, cmd.payload ?? {});
    await ref.update({ status: 'sent', topic, sentAt: ServerValue.TIMESTAMP });
    logger.info({ deviceId, type: cmd.type, key: snap.key }, 'Command sent');
  } catch (err) {
    await ref.update({ status: 'failed', error: String(err?.message ?? err), finishedAt: ServerValue.TIMESTAMP });
    logger.error({ err, deviceId, key: snap.key }, 'Command publish failed');
  }
}

export function startCommandRelay() {
  const root = db.ref('commands');

  // Per-device subscriptions are spawned lazily as device buckets appear.
  const subscribed = new Set();

  function subscribeDevice(deviceId) {
    if (subscribed.has(deviceId)) return;
    subscribed.add(deviceId);
    const q = root.child(deviceId).orderByChild('status').equalTo('pending');
    q.on('child_added',   (snap) => process(deviceId, snap));
    q.on('child_changed', (snap) => process(deviceId, snap));
    logger.info({ deviceId }, 'Watching command queue');
  }

  // Bootstrap from existing buckets, then react to new ones.
  root.on('child_added', (snap) => subscribeDevice(snap.key));

  return () => {
    root.off();
    for (const id of subscribed) db.ref(`commands/${id}`).off();
    subscribed.clear();
  };
}
