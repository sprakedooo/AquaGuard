export function fmt(n: number | null | undefined, digits = 2, suffix = ''): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toFixed(digits) + suffix;
}

export function relTime(ts?: number | null): string {
  if (!ts) return '—';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function alertLabel(lvl: number | null | undefined): { text: string; cls: string } {
  switch (lvl) {
    case 2: return { text: 'CRITICAL', cls: 'bg-crit text-white' };
    case 1: return { text: 'WARNING',  cls: 'bg-warn text-white' };
    case 0: return { text: 'NORMAL',   cls: 'bg-ok text-white' };
    default: return { text: 'NO DATA', cls: 'bg-slate-400 text-white' };
  }
}
