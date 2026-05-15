import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db, auth } from '../firebase';
import type { DeviceMeta, DeviceProfile, DeviceSummary } from '../types';

export function useDevices(): { devices: DeviceSummary[]; loaded: boolean } {
  const [rows, setRows] = useState<DeviceSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoaded(true);   // no user — nothing to load
      return;
    }

    const r = ref(db, `users/${uid}/devices`);
    return onValue(
      r,
      (snap) => {
        const out: DeviceSummary[] = [];
        snap.forEach((c) => {
          const meta    = (c.child('meta').val() ?? null) as DeviceMeta | null;
          const profile = (meta as unknown as { profile?: DeviceProfile })?.profile ?? null;
          out.push({ id: c.key!, profile, meta });
          return false;
        });
        out.sort((a, b) => (a.profile?.name ?? a.id).localeCompare(b.profile?.name ?? b.id));
        setRows(out);
        setLoaded(true);
      },
      (err) => {
        console.error('[useDevices] subscribe failed:', err.message);
        setLoaded(true);   // unblock UI even on error
      },
    );
  }, []);

  return { devices: rows, loaded };
}
