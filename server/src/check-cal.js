// Quick diagnostic: dump calibration + thresholds + latest reading for pond-01
// Run with:  node src/check-cal.js
import { db } from './firebase.js';

const deviceId = process.argv[2] ?? 'pond-01';

console.log(`\n=== Diagnostic for device "${deviceId}" ===\n`);

const cal      = (await db.ref(`devices/${deviceId}/calibration`).once('value')).val();
const thresh   = (await db.ref(`devices/${deviceId}/meta/thresholds`).once('value')).val();
const latest   = (await db.ref(`devices/${deviceId}/latest`).once('value')).val();

console.log('CALIBRATION:');
console.log(JSON.stringify(cal, null, 2));
console.log('\nTHRESHOLDS:');
console.log(JSON.stringify(thresh, null, 2));
console.log('\nLATEST READING:');
console.log(JSON.stringify(latest, null, 2));

process.exit(0);
