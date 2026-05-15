import Icon from './Icon';
import type { Point } from '../hooks/useReadings';
import type { VarThresh } from '../types';

type MetricKind = 'temp' | 'ph' | 'turb';

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
  kind: MetricKind;
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

interface SemanticLabel { text: string; color: string; bg: string; icon: string; }

function semanticOf(kind: MetricKind, v: number | null | undefined, t: VarThresh): SemanticLabel {
  if (v == null || Number.isNaN(v))
    return { text: 'No data', color: 'text-on-surface-variant', bg: 'bg-surface-container', icon: 'help' };

  if (kind === 'temp') {
    if (v <= t.critLow)  return { text: 'Critically Low',  color: 'text-blue-600',  bg: 'bg-blue-100',  icon: 'arrow_downward' };
    if (v < t.warnLow)   return { text: 'Low',             color: 'text-blue-500',  bg: 'bg-blue-50',   icon: 'arrow_downward' };
    if (v <= t.warnHigh) return { text: 'Normal',          color: 'text-secondary', bg: 'bg-secondary-container/30', icon: 'check_circle' };
    if (v < t.critHigh)  return { text: 'High',            color: 'text-amber-600', bg: 'bg-amber-100', icon: 'arrow_upward' };
    return                      { text: 'Critically High', color: 'text-error',     bg: 'bg-error-container', icon: 'arrow_upward' };
  }

  if (kind === 'ph') {
    if (v < 5.5)  return { text: 'Strongly Acidic', color: 'text-error',     bg: 'bg-error-container',   icon: 'science' };
    if (v < 6.5)  return { text: 'Acidic',          color: 'text-amber-600', bg: 'bg-amber-100',         icon: 'science' };
    if (v <= 7.4) return { text: 'Neutral',         color: 'text-secondary', bg: 'bg-secondary-container/30', icon: 'science' };
    if (v <= 8.5) return { text: 'Basic',           color: 'text-blue-500',  bg: 'bg-blue-50',           icon: 'science' };
    return               { text: 'Strongly Basic',  color: 'text-error',     bg: 'bg-error-container',   icon: 'science' };
  }

  // turb — upper-only
  if (v < t.warnHigh)  return { text: 'Clear',       color: 'text-secondary', bg: 'bg-secondary-container/30', icon: 'water_drop' };
  if (v < t.critHigh)  return { text: 'Turbid',      color: 'text-amber-600', bg: 'bg-amber-100',              icon: 'water' };
  return                      { text: 'Very Dirty',  color: 'text-error',     bg: 'bg-error-container',        icon: 'water' };
}

// ─── pH vertical scale ───────────────────────────────────────────────────────
const PH_MIN = 5;
const PH_MAX = 9;

function PHScale({ value }: { value: number | null | undefined }) {
  const v    = value != null && !Number.isNaN(value) ? value : null;
  // % from top: pH 9 → 0 %, pH 5 → 100 %
  const pct  = v != null
    ? Math.max(4, Math.min(96, ((PH_MAX - v) / (PH_MAX - PH_MIN)) * 100))
    : null;

  // Marker colour follows zone
  const zoneHex = v == null ? '#94a3b8'
    : v < 6.5  ? '#f59e0b'   // amber  – acidic
    : v > 7.5  ? '#60a5fa'   // blue   – basic
    :             '#14b8a6';  // teal   – neutral

  const zoneName = v == null ? '—'
    : v < 6.5  ? 'Acidic'
    : v > 7.5  ? 'Basic'
    :             'Neutral';

  return (
    <div className="flex items-stretch gap-2 h-full min-h-[100px] select-none">

      {/* ── Left: zone label column ───────────────────────── */}
      <div className="relative w-16 shrink-0 self-stretch">
        {/* Basic – top */}
        <div className="absolute top-0 right-0 flex items-center gap-1">
          <span className="text-[9px] font-semibold text-blue-400 leading-none">Basic</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
        </div>
        {/* Neutral – centre */}
        <div className="absolute right-0 flex items-center gap-1" style={{ top: '50%', transform: 'translateY(-50%)' }}>
          <span className="text-[9px] font-bold text-secondary leading-none">Neutral</span>
          <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
        </div>
        {/* Acidic – bottom */}
        <div className="absolute bottom-0 right-0 flex items-center gap-1">
          <span className="text-[9px] font-semibold text-amber-500 leading-none">Acidic</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        </div>
      </div>

      {/* ── Centre: gradient track ────────────────────────── */}
      <div className="relative w-5 rounded-full shrink-0 self-stretch shadow-inner"
           style={{ background: 'linear-gradient(to bottom, #60a5fa 0%, #14b8a6 50%, #f59e0b 100%)' }}>

        {/* Tick marks at pH 8, 7, 6 */}
        <div className="absolute inset-x-0 h-px bg-white/25" style={{ top: '25%' }} />
        <div className="absolute inset-x-0 h-0.5 bg-white/60" style={{ top: '50%' }} />
        <div className="absolute inset-x-0 h-px bg-white/25" style={{ top: '75%' }} />

        {/* Moving marker */}
        {pct != null && (
          <div
            className="absolute left-1/2 w-6 h-6 rounded-full border-[3px] border-white shadow-xl z-10 transition-[top] duration-500 ease-in-out"
            style={{ top: `${pct}%`, transform: 'translate(-50%, -50%)', backgroundColor: zoneHex }}
          />
        )}
      </div>

      {/* ── Right: value badge — always centred, no overflow ── */}
      <div className="flex flex-col items-start justify-center gap-1 flex-1">
        {v != null ? (
          <>
            <span
              className="px-2.5 py-1 rounded-full text-[12px] font-bold tabular-nums text-white shadow-md leading-tight"
              style={{ backgroundColor: zoneHex }}
            >
              {v.toFixed(2)}
            </span>
            <span className="text-[9px] font-semibold leading-none" style={{ color: zoneHex }}>
              {zoneName}
            </span>
          </>
        ) : (
          <span className="text-[10px] text-on-surface-variant">No data</span>
        )}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const CHIP = [
  { text: 'OPTIMAL', cls: 'bg-secondary-container/30 text-on-secondary-container' },
  { text: 'WATCH',   cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  { text: 'ALERT',   cls: 'bg-error-container text-on-error-container' },
];

export default function MetricCard({ icon, label, value, unit, digits = 1, thresh, upperOnly, history, field, kind }: Props) {
  const status   = statusOf(value, thresh, upperOnly);
  const chip     = CHIP[status];
  const semantic = semanticOf(kind, value, thresh);

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

      {/* Value + visualisation */}
      {kind === 'ph' ? (
        /* pH: value on left, scale on right */
        <div className="flex-1 flex items-stretch gap-4 min-h-0">
          <div className="flex flex-col justify-center shrink-0">
            <h3 className="text-4xl sm:text-5xl font-bold tracking-tight text-primary tabular-nums leading-none">
              {value == null || Number.isNaN(value) ? '—' : value.toFixed(digits)}
            </h3>
            <div className={`mt-3 inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-[11px] font-semibold ${semantic.color} ${semantic.bg}`}>
              <Icon name={semantic.icon} size={13} />
              {semantic.text}
            </div>
          </div>
          <div className="flex-1 flex items-center justify-end">
            <PHScale value={value} />
          </div>
        </div>
      ) : (
        /* temp / turb: value stacked above sparkline */
        <>
          <div className="flex-1 flex flex-col justify-center">
            <h3 className="text-4xl sm:text-5xl font-bold tracking-tight text-primary tabular-nums leading-none">
              {value == null || Number.isNaN(value) ? '—' : value.toFixed(digits)}
              {unit && <span className="text-xl sm:text-2xl font-normal ml-1 text-on-surface-variant">{unit}</span>}
            </h3>
            <div className={`mt-3 inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-[11px] font-semibold ${semantic.color} ${semantic.bg}`}>
              <Icon name={semantic.icon} size={13} />
              {semantic.text}
            </div>
          </div>
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
        </>
      )}
    </div>
  );
}
