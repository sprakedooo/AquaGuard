import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db, auth } from '../firebase';
import type { Thresholds } from '../types';

const DEFAULT_THRESHOLDS: Thresholds = {
  temp: { warnLow: 24, warnHigh: 32, critLow: 20, critHigh: 35 },
  ph:   { warnLow: 6.5, warnHigh: 9.0, critLow: 6.0, critHigh: 9.5 },
  turb: { warnLow: 0,  warnHigh: 80, critLow: 0,  critHigh: 150 },
};

export function useThresholds(deviceId: string) {
  const [th, setTh] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const r = ref(db, `users/${uid}/devices/${deviceId}/meta/thresholds`);
    return onValue(r, (snap) => {
      const v = snap.val();
      if (v) setTh(v);
    });
  }, [deviceId]);
  return th;
}
