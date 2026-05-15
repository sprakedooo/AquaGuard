import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import { useReadings } from '../hooks/useReadings';
import { useUI } from '../ui/UIProvider';

const RANGES = [
  { label: '15m', ms: 15 * 60_000 },
  { label: '1h',  ms: 60 * 60_000 },
  { label: '6h',  ms: 6  * 60 * 60_000 },
  { label: '24h', ms: 24 * 60 * 60_000 },
];

const fmtTime = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function TelemetryChart({ deviceId }: { deviceId: string }) {
  const [rangeIdx, setRangeIdx] = useState(1);
  const { theme } = useUI();
  const range = RANGES[rangeIdx];
  const points = useReadings(deviceId, range.ms);

  const isDark = theme === 'dark';
  const gridColor   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const axisColor   = isDark ? 'rgba(255,255,255,0.4)'  : '#94a3b8';
  const tooltipBg   = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

  const data = useMemo(() => points.map((p) => ({
    t:    p.serverTs,
    temp: p.temp,
    pH:   p.pH,
    turb: p.turb,
  })), [points]);

  return (
    <div className="rounded-xl bg-surface-container-lowest p-5 shadow-sm border border-surface-container-high">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-label-lg font-semibold text-on-surface">Live trend</h3>
        <div className="flex gap-1">
          {RANGES.map((r, i) => (
            <button key={r.label} onClick={() => setRangeIdx(i)}
                    className={`px-2.5 py-1 text-xs rounded transition-colors ${i === rangeIdx
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-on-surface-variant">
            Waiting for telemetry…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} />
              <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']}
                     scale="time" tickFormatter={fmtTime} stroke={axisColor} fontSize={12} />
              <YAxis yAxisId="L" stroke={axisColor} fontSize={12}
                     tickFormatter={(v) => v.toFixed(1)} />
              <YAxis yAxisId="R" orientation="right" stroke={axisColor} fontSize={12}
                     tickFormatter={(v) => v.toFixed(0)} />
              <Tooltip labelFormatter={(v) => new Date(Number(v)).toLocaleString()}
                       formatter={(v: number, n) => [typeof v === 'number' ? v.toFixed(2) : v, n]}
                       contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                       labelStyle={{ color: isDark ? '#e2e8f0' : '#1e293b' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.7)' : undefined }} />
              <Line yAxisId="L" name="Temp (°C)"  type="monotone" dataKey="temp"
                    stroke="#0ea5e9" dot={false} isAnimationActive={false} strokeWidth={2} />
              <Line yAxisId="L" name="pH"          type="monotone" dataKey="pH"
                    stroke="#22c55e" dot={false} isAnimationActive={false} strokeWidth={2} />
              <Line yAxisId="R" name="Turb (NTU)" type="monotone" dataKey="turb"
                    stroke="#a78bfa" dot={false} isAnimationActive={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="mt-2 text-xs text-on-surface-variant tabular-nums">{data.length} points · {range.label}</p>
    </div>
  );
}
