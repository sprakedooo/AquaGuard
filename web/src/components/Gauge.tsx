import type { VarThresh } from '../types';
import { fmt } from '../lib/format';

interface Props {
  label: string;
  value: number | null | undefined;
  unit: string;
  digits?: number;
  thresh: VarThresh;
  /** Range to draw the bar over (visual min/max). */
  range: [number, number];
  /** Some sensors only have an upper limit (e.g. turbidity). */
  upperOnly?: boolean;
}

export default function Gauge({ label, value, unit, digits = 2, thresh, range, upperOnly }: Props) {
  const [vmin, vmax] = range;
  const v = value ?? null;
  const pct = v == null ? 0 : Math.min(100, Math.max(0, ((v - vmin) / (vmax - vmin)) * 100));

  let level: 0 | 1 | 2 = 0;
  if (v != null) {
    if (upperOnly) {
      if (v >= thresh.critHigh) level = 2;
      else if (v >= thresh.warnHigh) level = 1;
    } else {
      if (v <= thresh.critLow || v >= thresh.critHigh) level = 2;
      else if (v < thresh.warnLow || v > thresh.warnHigh) level = 1;
    }
  }
  const ringCls = ['bg-slate-100', 'bg-warn/15', 'bg-crit/15'][level];
  const valCls  = ['text-slate-900', 'text-warn', 'text-crit'][level];
  const dotCls  = ['bg-ok', 'bg-warn', 'bg-crit'][level];

  return (
    <div className={`rounded-xl ${ringCls} p-5 shadow-sm border border-slate-200`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotCls}`} />
      </div>
      <div className={`mt-2 text-4xl font-semibold tabular-nums ${valCls}`}>
        {fmt(v, digits)} <span className="text-lg text-slate-500">{unit}</span>
      </div>
      <div className="mt-4 h-2 bg-slate-200 rounded overflow-hidden">
        <div className={`h-full ${dotCls}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-500 tabular-nums">
        <span>{vmin}</span>
        <span>{!upperOnly && `warn ${thresh.warnLow}–${thresh.warnHigh}`}</span>
        <span>{vmax}</span>
      </div>
    </div>
  );
}
