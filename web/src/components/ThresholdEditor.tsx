import { useEffect, useState } from 'react';
import type { Thresholds, VarThresh } from '../types';
import { issueCommand } from '../lib/commands';
import { useAuth } from '../auth/AuthProvider';

interface Props { deviceId: string; current: Thresholds; }

type Var = 'temp' | 'ph' | 'turb';

const ROWS: Array<{ key: Var; label: string; step: number; upperOnly?: boolean }> = [
  { key: 'temp', label: 'Temperature (°C)', step: 0.1 },
  { key: 'ph',   label: 'pH',                step: 0.1 },
  { key: 'turb', label: 'Turbidity (NTU)',   step: 1, upperOnly: true },
];

function Row({ row, val, onChange }: {
  row: typeof ROWS[number]; val: VarThresh; onChange: (v: VarThresh) => void;
}) {
  const f = (k: keyof VarThresh) => (
    <input type="number" step={row.step} value={val[k]}
           onChange={(e) => onChange({ ...val, [k]: Number(e.target.value) })}
           className="w-full rounded border border-slate-300 px-2 py-1 text-sm tabular-nums" />
  );
  return (
    <div className="grid grid-cols-5 gap-2 items-center py-2">
      <div className="text-sm font-medium">{row.label}</div>
      {row.upperOnly
        ? <><div /><div /></>
        : <><label className="text-xs text-slate-500">crit low{f('critLow')}</label>
            <label className="text-xs text-slate-500">warn low{f('warnLow')}</label></>}
      <label className="text-xs text-slate-500">warn high{f('warnHigh')}</label>
      <label className="text-xs text-slate-500">crit high{f('critHigh')}</label>
    </div>
  );
}

export default function ThresholdEditor({ deviceId, current }: Props) {
  const { isAdmin } = useAuth();
  const [draft, setDraft] = useState<Thresholds>(current);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState('');

  useEffect(() => setDraft(current), [current]);

  async function send(v: Var) {
    setBusy(true); setMsg('');
    try {
      await issueCommand(deviceId, 'threshold', { var: v, ...draft[v] });
      setMsg(`Sent ${v} thresholds — applying…`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">Thresholds</h3>
        {!isAdmin && <span className="text-xs text-slate-500">Read-only (admin required)</span>}
      </div>
      {ROWS.map((row) => (
        <div key={row.key} className="border-t border-slate-100 first:border-t-0">
          <Row row={row} val={draft[row.key]}
               onChange={(v) => setDraft({ ...draft, [row.key]: v })} />
          <div className="flex justify-end pb-2">
            <button disabled={!isAdmin || busy} onClick={() => send(row.key)}
                    className="text-xs px-3 py-1 rounded bg-slate-900 text-white disabled:opacity-50 hover:bg-slate-800">
              Send to device
            </button>
          </div>
        </div>
      ))}
      {msg && <p className="mt-2 text-xs text-slate-600">{msg}</p>}
    </div>
  );
}
