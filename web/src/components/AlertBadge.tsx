import type { AlertLevel } from '../types';
import { alertLabel } from '../lib/format';

export default function AlertBadge({ level }: { level: AlertLevel | null | undefined }) {
  const { text, cls } = alertLabel(level);
  const animate = level === 2 ? 'animate-pulse' : '';
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${cls} ${animate}`}>
      {text}
    </span>
  );
}
