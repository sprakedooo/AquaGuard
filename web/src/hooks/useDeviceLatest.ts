import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import type { Reading } from '../types';

export function useDeviceLatest(deviceId: string) {
  const [data, setData] = useState<Reading | null>(null);
  useEffect(() => {
    const r = ref(db, `devices/${deviceId}/latest`);
    return onValue(r, (snap) => setData(snap.val() ?? null));
  }, [deviceId]);
  return data;
}
