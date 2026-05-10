// Create a Firebase Auth user and optionally grant admin.
// Usage:  node scripts/create-user.js <email> <password> [--admin]
//
// Requires GOOGLE_APPLICATION_CREDENTIALS to point at your service-account.json.
// Run from the server/ directory (dotenv loads .env automatically).

import 'dotenv/config';
import admin from 'firebase-admin';

const [email, password, flag] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: node scripts/create-user.js <email> <password> [--admin]');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });

const auth = admin.auth();

// Check if user already exists
let user;
try {
  user = await auth.getUserByEmail(email);
  console.log(`User already exists: ${user.uid} — skipping creation.`);
} catch (e) {
  if (e.code !== 'auth/user-not-found') throw e;
  user = await auth.createUser({ email, password, emailVerified: true });
  console.log(`Created user: uid=${user.uid}  email=${user.email}`);
}

if (flag === '--admin') {
  await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), admin: true });
  console.log('Admin claim granted. User must sign in fresh for the token to take effect.');
} else {
  console.log('No --admin flag supplied. To grant admin later:');
  console.log(`  node scripts/grant-admin.js ${email}`);
}

process.exit(0);
