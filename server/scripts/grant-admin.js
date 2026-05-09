// Promote a user to admin by setting custom claim { admin: true }.
// Usage:  node scripts/grant-admin.js <email-or-uid>
//
// Requires GOOGLE_APPLICATION_CREDENTIALS to point at your service-account.json
// (or run from server/ with the same .env).

import 'dotenv/config';
import admin from 'firebase-admin';

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node scripts/grant-admin.js <email|uid>');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });

const auth = admin.auth();

const user = arg.includes('@')
  ? await auth.getUserByEmail(arg)
  : await auth.getUser(arg);

await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), admin: true });
console.log(`Granted admin to ${user.email || user.uid} (uid=${user.uid}).`);
console.log('User must sign out and back in for the new token to take effect.');
process.exit(0);
