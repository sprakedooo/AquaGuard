import Icon from './Icon';
import type { Point } from '../hooks/useReadings';
import type { VarThresh } from '../types';

interface Props {
  icon: string;
  label: string;
  value: number | null | undefined;
  unit?: string;
  digits?: number;
  thresh: VarThresh;
  upperOnly?: boolean;
  history: Point[];
  field: 'temp' | 'pH' | 'turb';
}

function statusOf(v: number | null | undefined, t: VarThresh, upperOnly?: boolean): 0 | 1 | 2 {
  if (v == null || Number.isNaN(v)) return 0;
  if (upperOnly) {
    if (v >= t.critHigh) return 2;
    if (v >= t.warnHigh) return 1;
    return 0;
  }
  if (v <= t.critLow || v >= t.critHigh) return 2;
  if (v < t.warnLow || v > t.warnHigh)   return 1;
  return 0;
}

const CHIP = [
  { text: 'OPTIMAL', cls: 'bg-secondary-container/30 text-on-secondary-container' },
  { text: 'WATCH',   cls: 'bg-amber-100 text-amber-800' },
  { text: 'ALERT',   cls: 'bg-error-container text-on-error-container' },
];

export default function MetricCard({ icon, label, value, unit, digits = 1, thresh, upperOnly, history, field }: Props) {
  const status = statusOf(value, thresh, upperOnly);
  const chip   = CHIP[status];

  const recent = history.slice(-12).map((p) => p[field] ?? null);
  const finite = recent.filter((v): v is number => v != null && !Number.isNaN(v));
  const min = finite.length ? Math.min(...finite) : 0;
  const max = finite.length ? Math.max(...finite) : 1;
  const span = Math.max(0.0001, max - min);

  const barColor = (s: 0 | 1 | 2) =>
    s === 2 ? 'bg-error' : s === 1 ? 'bg-amber-500' : 'bg-secondary';

  return (
    <div className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm border border-surface-container-high flex flex-col gap-4 h-full min-h-[200px] transition-transform hover:scale-[1.01]">
      {/* Header row */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-on-primary-fixed shrink-0">
            <Icon name={icon} size={20} />
          </div>
          <span className="text-label-sm text-on-surface-variant uppercase font-bold tracking-widest truncate">{label}</span>
        </div>
        <div className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap shrink-0 ${chip.cls}`}>{chip.text}</div>
      </div>

      {/* Value */}
      <div className="flex-1 flex flex-col justify-center">
        <h3 className="text-4xl sm:text-5xl font-bold tracking-tight text-primary tabular-nums leading-none">
          {value == null || Number.isNaN(value) ? '—' : value.toFixed(digits)}
          {unit && <span className="text-xl sm:text-2xl font-normal ml-1 text-on-surface-variant">{unit}</span>}
        </h3>
        <p className={`mt-2 text-label-sm flex items-center gap-1 ${
          status === 0 ? 'text-secondary' : status === 1 ? 'text-amber-600' : 'text-error'}`}>
          <Icon name={status === 0 ? 'check_circle' : 'trending_up'} size={14} />
          {status === 0 ? 'Within nominal range'
            : status === 1 ? 'Above warning threshold'
            : 'Critical threshold breached'}
        </p>
      </div>

      {/* Sparkline */}
      <div className="h-10 w-full flex items-end gap-1">
        {recent.length === 0
          ? <div className="text-xs text-on-surface-variant self-center">No history yet</div>
          : recent.map((v, i) => {
              const h = v == null ? 5 : Math.max(8, Math.round(((v - min) / span) * 100));
              const last = i === recent.length - 1;
              const s = statusOf(v, thresh, upperOnly);
              const cls = last ? barColor(s) : `${barColor(s)}/30`;
              return <div key={i} className={`flex-1 rounded-t-sm ${cls}`} style={{ height: `${h}%` }} />;
            })}
      </div>
    </div>
  );
}
