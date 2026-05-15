import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import type { DeviceMeta, DeviceProfile, DeviceSummary } from '../types';

export function useDevices(): DeviceSummary[] {
  const [rows, setRows] = useState<DeviceSummary[]>([]);
  useEffect(() => {
    const r = ref(db, 'devices');
    return onValue(
      r,
      (snap) => {
        const out: DeviceSummary[] = [];
        snap.forEach((c) => {
          const meta = (c.child('meta').val() ?? null) as DeviceMeta | null;
          const profile = (meta as unknown as { profile?: DeviceProfile })?.profile ?? null;
          out.push({ id: c.key!, profile, meta });
          return false;
        });
        out.sort((a, b) => (a.profile?.name ?? a.id).localeCompare(b.profile?.name ?? b.id));
        setRows(out);
      },
      (err) => {
        console.error('[useDevices] /devices subscribe failed:', err.message);
      },
    );
  }, []);
  return rows;
}
