import { useEffect, useState } from 'react';
import { ref, query, orderByChild, limitToLast, onValue } from 'firebase/database';
import { db } from '../firebase';
import type { AlertEvent } from '../types';

export interface AlertRow extends AlertEvent { key: string; }

export function useAlerts(deviceId: string, max = 20) {
  const [rows, setRows] = useState<AlertRow[]>([]);
  useEffect(() => {
    const q = query(ref(db, `devices/${deviceId}/alerts`), orderByChild('serverTs'), limitToLast(max));
    return onValue(q, (snap) => {
      const arr: AlertRow[] = [];
      snap.forEach((c) => { arr.push({ key: c.key!, ...c.val() }); return false; });
      arr.sort((a, b) => (b.serverTs ?? 0) - (a.serverTs ?? 0));
      setRows(arr);
    });
  }, [deviceId, max]);
  return rows;
}
