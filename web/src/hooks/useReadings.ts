import { useEffect, useRef, useState } from 'react';
import {
  query, ref, orderByChild, limitToLast,
  onChildAdded, onChildChanged, onChildRemoved,
} from 'firebase/database';
import { db } from '../firebase';
import type { Reading } from '../types';

export interface Point extends Reading { key: string; }

const MAX_POINTS = 4000;   // ~11h at 10s cadence; trims oldest beyond this

/**
 * Streams the most recent readings for a device. New points arrive via
 * child_added; React state updates incrementally — no full re-fetch.
 */
export function useReadings(deviceId: string, rangeMs: number) {
  const [points, setPoints] = useState<Point[]>([]);
  const bufferRef = useRef<Point[]>([]);

  useEffect(() => {
    bufferRef.current = [];
    setPoints([]);

    const q = query(
      ref(db, `devices/${deviceId}/readings`),
      orderByChild('serverTs'),
      limitToLast(MAX_POINTS),
    );

    const flush = () => setPoints([...bufferRef.current]);

    const insertSorted = (p: Point) => {
      const buf = bufferRef.current;
      // append-mostly: usually p.serverTs > last.serverTs
      const last = buf[buf.length - 1];
      if (!last || p.serverTs >= (last.serverTs ?? 0)) buf.push(p);
      else {
        let i = buf.length - 1;
        while (i >= 0 && (buf[i].serverTs ?? 0) > p.serverTs) i--;
        buf.splice(i + 1, 0, p);
      }
      if (buf.length > MAX_POINTS) buf.splice(0, buf.length - MAX_POINTS);
    };

    const offAdded = onChildAdded(q, (snap) => {
      const v = snap.val();
      if (!v) return;
      insertSorted({ key: snap.key!, ...v });
      flush();
    });
    const offChanged = onChildChanged(q, (snap) => {
      const idx = bufferRef.current.findIndex((x) => x.key === snap.key);
      if (idx >= 0) {
        bufferRef.current[idx] = { key: snap.key!, ...snap.val() };
        flush();
      }
    });
    const offRemoved = onChildRemoved(q, (snap) => {
      bufferRef.current = bufferRef.current.filter((x) => x.key !== snap.key);
      flush();
    });

    return () => { offAdded(); offChanged(); offRemoved(); };
  }, [deviceId]);

  // Filter to range at render time (cheap; rangeMs may change without re-subscribing).
  const cutoff = Date.now() - rangeMs;
  return points.filter((p) => (p.serverTs ?? 0) >= cutoff);
}
