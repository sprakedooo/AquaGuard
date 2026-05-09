import { push, ref, serverTimestamp } from 'firebase/database';
import { db, auth } from '../firebase';
import type { CommandType } from '../types';

export async function issueCommand(deviceId: string, type: CommandType, payload: Record<string, unknown>) {
  const cmdsRef = ref(db, `commands/${deviceId}`);
  const r = await push(cmdsRef, {
    type,
    payload,
    status: 'pending',
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid ?? null,
  });
  return r.key!;
}
