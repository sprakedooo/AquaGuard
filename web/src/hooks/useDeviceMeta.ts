import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import type { DeviceMeta } from '../types';

export function useDeviceMeta(deviceId: string) {
  const [meta, setMeta] = useState<DeviceMeta | null>(null);
  useEffect(() => {
    const r = ref(db, `devices/${deviceId}/meta`);
    return onValue(r, (snap) => setMeta(snap.val() ?? {}));
  }, [deviceId]);
  return meta;
}
