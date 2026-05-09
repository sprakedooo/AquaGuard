import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import { useReadings } from '../hooks/useReadings';

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
  const [rangeIdx, setRangeIdx] = useState(1);   // default 1h
  const range = RANGES[rangeIdx];
  const points = useReadings(deviceId, range.ms);

  const data = useMemo(() => points.map((p) => ({
    t:    p.serverTs,
    temp: p.temp,
    pH:   p.pH,
    turb: p.turb,
  })), [points]);

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Live trend</h3>
        <div className="flex gap-1">
          {RANGES.map((r, i) => (
            <button key={r.label} onClick={() => setRangeIdx(i)}
                    className={`px-2.5 py-1 text-xs rounded ${i === rangeIdx
                      ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500">
            Waiting for telemetry…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#eef2f7" />
              <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']}
                     scale="time" tickFormatter={fmtTime} stroke="#94a3b8" fontSize={12} />
              <YAxis yAxisId="L" stroke="#94a3b8" fontSize={12}
                     tickFormatter={(v) => v.toFixed(1)} />
              <YAxis yAxisId="R" orientation="right" stroke="#94a3b8" fontSize={12}
                     tickFormatter={(v) => v.toFixed(0)} />
              <Tooltip labelFormatter={(v) => new Date(Number(v)).toLocaleString()}
                       formatter={(v: number, n) =>
                         [typeof v === 'number' ? v.toFixed(2) : v, n]} />
              <Legend />
              <Line yAxisId="L" name="Temp (°C)" type="monotone" dataKey="temp"
                    stroke="#0ea5e9" dot={false} isAnimationActive={false} strokeWidth={2} />
              <Line yAxisId="L" name="pH"        type="monotone" dataKey="pH"
                    stroke="#16a34a" dot={false} isAnimationActive={false} strokeWidth={2} />
              <Line yAxisId="R" name="Turb (NTU)" type="monotone" dataKey="turb"
                    stroke="#a855f7" dot={false} isAnimationActive={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500 tabular-nums">{data.length} points · {range.label}</p>
    </div>
  );
}
