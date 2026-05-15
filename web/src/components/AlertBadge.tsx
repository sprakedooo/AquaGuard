import type { AlertLevel } from '../types';

const STYLES: Record<string, { text: string; cls: string; dot: string }> = {
  '0':  { text: 'All Systems Nominal', cls: 'bg-secondary-container/30 text-on-secondary-container', dot: 'bg-secondary' },
  '1':  { text: 'Warning',              cls: 'bg-amber-100 text-amber-800',                            dot: 'bg-amber-500' },
  '2':  { text: 'Critical',             cls: 'bg-error-container text-on-error-container',             dot: 'bg-error animate-pulse' },
  none: { text: 'No Data',              cls: 'bg-surface-container-high text-on-surface-variant',     dot: 'bg-outline' },
};

export default function AlertBadge({ level }: { level: AlertLevel | null | undefined }) {
  const s = STYLES[level == null ? 'none' : String(level)];
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${s.cls}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      <span className="text-label-sm">{s.text}</span>
    </div>
  );
}
