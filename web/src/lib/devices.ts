import { ref, set, update, remove, serverTimestamp } from 'firebase/database';
import { db, auth } from '../firebase';
import type { DeviceProfile } from '../types';

const VALID_ID_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;

export function validateDeviceId(id: string): string | null {
  if (!id) return 'Device ID is required.';
  if (!VALID_ID_RE.test(id))
    return 'Use 2–40 lowercase letters / numbers / hyphens, starting with a letter or number.';
  return null;
}

export async function createPond(id: string, profile: Omit<DeviceProfile, 'createdAt' | 'createdBy'>) {
  const err = validateDeviceId(id);
  if (err) throw new Error(err);
  await set(ref(db, `devices/${id}/meta/profile`), {
    ...profile,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid ?? null,
  });
}

export async function updatePond(id: string, patch: Partial<DeviceProfile>) {
  await update(ref(db, `devices/${id}/meta/profile`), patch);
}

export async function deletePond(id: string) {
  await remove(ref(db, `devices/${id}`));
  await remove(ref(db, `commands/${id}`));
}
