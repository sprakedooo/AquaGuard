import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db, auth } from '../firebase';
import type { Reading } from '../types';

export function useDeviceLatest(deviceId: string) {
  const [data, setData] = useState<Reading | null>(null);
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const r = ref(db, `users/${uid}/devices/${deviceId}/latest`);
    return onValue(r, (snap) => setData(snap.val() ?? null));
  }, [deviceId]);
  return data;
}
