// One-off: write default aquaculture thresholds for a device.
// Usage:  node src/set-thresholds.js <deviceId>
import { db } from './firebase.js';

const deviceId = process.argv[2] ?? 'pond-01';

const thresholds = {
  temp: {
    critLow:  22,   // <22°C: cold stress (tilapia stop feeding)
    warnLow:  25,
    warnHigh: 32,
    critHigh: 35,   // >35°C: heat stress, oxygen drops
  },
  ph: {
    critLow:  5.5,  // acidic, fish gill damage
    warnLow:  6.5,
    warnHigh: 8.5,
    critHigh: 9.5,  // alkaline, ammonia toxicity rises
  },
  turb: {
    critLow:  0,    // turbidity low is fine, ignored
    warnLow:  0,
    warnHigh: 100,  // >100 NTU: fish stress, reduced photosynthesis
    critHigh: 300,  // >300 NTU: severe — likely runoff or algal bloom
  },
};

// Look up the device owner from the index.
const uidSnap = await db.ref(`device-index/${deviceId}`).once('value');
const uid     = uidSnap.val();

if (!uid) {
  console.error(`No owner found in device-index for "${deviceId}". Has the device been set up via the web app?`);
  process.exit(1);
}

await db.ref(`users/${uid}/devices/${deviceId}/meta/thresholds`).set(thresholds);
console.log(`✓ Thresholds written for "${deviceId}" (uid=${uid}):`);
console.log(JSON.stringify(thresholds, null, 2));
process.exit(0);
