import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db, auth } from '../firebase';
import type { DeviceMeta } from '../types';

export function useDeviceMeta(deviceId: string) {
  const [meta, setMeta] = useState<DeviceMeta | null>(null);
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const r = ref(db, `users/${uid}/devices/${deviceId}/meta`);
    return onValue(r, (snap) => setMeta(snap.val() ?? {}));
  }, [deviceId]);
  return meta;
}
