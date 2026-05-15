import { useEffect, useState } from 'react';
import type { Thresholds, VarThresh } from '../types';
import { issueCommand } from '../lib/commands';

interface Props { deviceId: string; current: Thresholds; }

type Var = 'temp' | 'ph' | 'turb';

const ROWS: Array<{ key: Var; label: string; step: number; upperOnly?: boolean }> = [
  { key: 'temp', label: 'Temperature (°C)', step: 0.1 },
  { key: 'ph',   label: 'pH',                step: 0.1 },
  { key: 'turb', label: 'Turbidity (NTU)',   step: 1, upperOnly: true },
];

function Field({ label, value, step, onChange }: {
  label: string; value: number; step: number; onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">{label}</span>
      <input type="number" step={step} value={value}
             onChange={(e) => onChange(Number(e.target.value))}
             className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1.5 text-data-tabular tabular-nums focus:outline-none focus:border-secondary" />
    </label>
  );
}

export default function ThresholdEditor({ deviceId, current }: Props) {
  const [draft, setDraft] = useState<Thresholds>(current);
  const [busy, setBusy]   = useState(false);
  const [msg, setMsg]     = useState('');

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
    <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high">
      <div className="p-6 border-b border-surface-container-high">
        <h3 className="text-headline-md text-primary">Thresholds</h3>
      </div>

      <div className="divide-y divide-surface-container-high">
        {ROWS.map((row) => {
          const v: VarThresh = draft[row.key];
          const upd = (patch: Partial<VarThresh>) =>
            setDraft({ ...draft, [row.key]: { ...v, ...patch } });
          return (
            <div key={row.key} className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-data-tabular font-semibold text-on-surface">{row.label}</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {!row.upperOnly && <Field label="crit low"  value={v.critLow}  step={row.step} onChange={(n) => upd({ critLow: n })} />}
                {!row.upperOnly && <Field label="warn low"  value={v.warnLow}  step={row.step} onChange={(n) => upd({ warnLow: n })} />}
                <Field label="warn high" value={v.warnHigh} step={row.step} onChange={(n) => upd({ warnHigh: n })} />
                <Field label="crit high" value={v.critHigh} step={row.step} onChange={(n) => upd({ critHigh: n })} />
              </div>
              <div className="flex justify-end mt-3">
                <button disabled={busy} onClick={() => send(row.key)}
                        className="px-4 py-1.5 rounded-lg bg-primary text-on-primary text-label-sm disabled:opacity-50 hover:opacity-90">
                  Send to device
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {msg && <div className="px-6 pb-4 text-label-sm text-on-surface-variant">{msg}</div>}
    </div>
  );
}
