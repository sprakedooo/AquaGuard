import { ref, set, get, update, remove, serverTimestamp } from 'firebase/database';
import { db, auth } from '../firebase';
import type { DeviceProfile } from '../types';

export interface ProvisionConfig {
  wifiSsid:    string;
  wifiPass:    string;
  mqttUrl:     string;
  mqttUser?:   string;
  mqttPass?:   string;
  topicPrefix: string;
}

const VALID_ID_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;

export function validateDeviceId(id: string): string | null {
  if (!id) return 'Device ID is required.';
  if (!VALID_ID_RE.test(id))
    return 'Use 2–40 lowercase letters / numbers / hyphens, starting with a letter or number.';
  return null;
}

/** Base path for the current user's device data. */
function devicePath(uid: string, id: string) {
  return `users/${uid}/devices/${id}`;
}

/**
 * Claims a device ID in the global index.
 * - If the ID is already owned by someone else → throws a friendly "already taken" error.
 * - If the write is blocked by rules (e.g. someone else owns it) → same friendly error.
 * - If the ID is free or already owned by this user → succeeds silently.
 */
async function claimDeviceId(id: string, uid: string) {
  // Try to read the index entry first (allowed for any authenticated user).
  try {
    const snap = await get(ref(db, `device-index/${id}`));
    const owner = snap.val();
    if (owner && owner !== uid) {
      throw new Error(`Device ID "${id}" is already taken. Please choose a different ID.`);
    }
  } catch (e) {
    // Re-throw our own friendly errors as-is.
    if (e instanceof Error && e.message.includes('already taken')) throw e;
    // If reading the index fails for any other reason (e.g. rules not yet deployed),
    // fall through and let the write attempt reveal the issue.
  }

  // Write the claim. If rules block it (someone else owns it), map to a friendly message.
  try {
    await set(ref(db, `device-index/${id}`), uid);
  } catch (e) {
    const code = (e as { code?: string })?.code ?? '';
    if (code === 'PERMISSION_DENIED') {
      throw new Error(`Device ID "${id}" is already taken. Please choose a different ID.`);
    }
    throw e;
  }
}

export async function createPond(id: string, profile: Omit<DeviceProfile, 'createdAt' | 'createdBy'>) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const err = validateDeviceId(id);
  if (err) throw new Error(err);

  await claimDeviceId(id, uid);
  await set(ref(db, `${devicePath(uid, id)}/meta/profile`), {
    ...profile,
    createdAt: serverTimestamp(),
    createdBy: uid,
  });
}

export async function updatePond(id: string, patch: Partial<DeviceProfile>) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  await update(ref(db, `${devicePath(uid, id)}/meta/profile`), patch);
}

export async function deletePond(id: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  await remove(ref(db, devicePath(uid, id)));
  await remove(ref(db, `commands/${id}`));
  await remove(ref(db, `device-index/${id}`));
}

/** Called during onboarding — creates the device profile AND stores
 *  provisioning credentials so the ESP32 can pull them on first boot. */
export async function setupDevice(
  id: string,
  profile: Omit<DeviceProfile, 'createdAt' | 'createdBy'>,
  provision: ProvisionConfig,
) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const err = validateDeviceId(id);
  if (err) throw new Error(err);

  // Claim the ID in the global index first — throws if already taken by someone else.
  await claimDeviceId(id, uid);

  await set(ref(db, devicePath(uid, id)), {
    meta: {
      profile: {
        name:      profile.name,
        location:  profile.location  ?? null,
        species:   profile.species   ?? null,
        notes:     profile.notes     ?? null,
        createdAt: serverTimestamp(),
        createdBy: uid,
      },
      online: false,
    },
    provision: {
      wifiSsid:    provision.wifiSsid,
      wifiPass:    provision.wifiPass,
      mqttUrl:     provision.mqttUrl,
      mqttUser:    provision.mqttUser ?? null,
      mqttPass:    provision.mqttPass ?? null,
      topicPrefix: provision.topicPrefix,
      ownerId:     uid,
      createdAt:   serverTimestamp(),
      claimed:     false,
    },
  });
}
