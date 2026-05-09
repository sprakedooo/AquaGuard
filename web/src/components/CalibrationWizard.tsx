import { useState } from 'react';
import type { Reading } from '../types';
import { issueCommand } from '../lib/commands';
import { useAuth } from '../auth/AuthProvider';
import { fmt } from '../lib/format';

interface Props { deviceId: string; latest: Reading | null; }

type Tab = 'ph' | 'turb' | 'temp';

export default function CalibrationWizard({ deviceId, latest }: Props) {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('ph');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function send(type: 'cal/ph' | 'cal/turb' | 'cal/temp', payload: Record<string, unknown>, label: string) {
    setBusy(true); setMsg('');
    try {
      await issueCommand(deviceId, type, payload);
      setMsg(`Sent ${label} — applying…`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  }

  const TabBtn = ({ id, label }: { id: Tab; label: string }) => (
    <button onClick={() => setTab(id)}
            className={`px-3 py-1.5 text-sm rounded ${tab === id
              ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
      {label}
    </button>
  );

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Calibration</h3>
        {!isAdmin && <span className="text-xs text-slate-500">Read-only (admin required)</span>}
      </div>
      <div className="flex gap-2 mb-4">
        <TabBtn id="ph"   label="pH (2-point)" />
        <TabBtn id="turb" label="Turbidity"     />
        <TabBtn id="temp" label="Temperature"   />
      </div>

      {tab === 'ph'   && <PhPanel   latest={latest} disabled={!isAdmin || busy} onSend={send} />}
      {tab === 'turb' && <TurbPanel latest={latest} disabled={!isAdmin || busy} onSend={send} />}
      {tab === 'temp' && <TempPanel latest={latest} disabled={!isAdmin || busy} onSend={send} />}

      {msg && <p className="mt-3 text-xs text-slate-600">{msg}</p>}
    </div>
  );
}

// ---------- pH ----------
function PhPanel({ latest, disabled, onSend }: {
  latest: Reading | null; disabled: boolean;
  onSend: (t: 'cal/ph', p: Record<string, unknown>, label: string) => Promise<void>;
}) {
  const mv = latest?.pH_mv ?? null;
  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-600">
        Rinse the probe with distilled water, dip into a buffer, wait until the live voltage stabilises (~30 s), then capture.
      </p>
      <LiveVoltage label="probe" mv={mv} />
      <div className="grid grid-cols-2 gap-3">
        <button disabled={disabled || mv == null}
                onClick={() => onSend('cal/ph', { point: 7, voltage_mv: mv }, 'pH 7 calibration')}
                className="px-3 py-2 rounded bg-slate-900 text-white disabled:opacity-50 hover:bg-slate-800">
          Capture as pH 7
        </button>
        <button disabled={disabled || mv == null}
                onClick={() => onSend('cal/ph', { point: 4, voltage_mv: mv }, 'pH 4 calibration')}
                className="px-3 py-2 rounded bg-slate-900 text-white disabled:opacity-50 hover:bg-slate-800">
          Capture as pH 4
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Both points needed for accuracy. After calibration, future pH readings are temperature-compensated automatically.
      </p>
    </div>
  );
}

// ---------- Turbidity ----------
function TurbPanel({ latest, disabled, onSend }: {
  latest: Reading | null; disabled: boolean;
  onSend: (t: 'cal/turb', p: Record<string, unknown>, label: string) => Promise<void>;
}) {
  const mv = latest?.turb_mv ?? null;
  const [ntu, setNtu] = useState<number>(1000);
  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-600">
        Place probe in clear (distilled) water for the zero point, then in a known-NTU sample for the dirty point.
      </p>
      <LiveVoltage label="probe" mv={mv} />
      <div className="grid grid-cols-2 gap-3 items-end">
        <button disabled={disabled || mv == null}
                onClick={() => onSend('cal/turb', { point: 0, voltage_mv: mv, ntu: 0 }, 'turbidity zero')}
                className="px-3 py-2 rounded bg-slate-900 text-white disabled:opacity-50 hover:bg-slate-800">
          Capture clear (0 NTU)
        </button>
        <div>
          <label className="block text-xs text-slate-500">Dirty NTU</label>
          <input type="number" value={ntu} step={1} min={1}
                 onChange={(e) => setNtu(Number(e.target.value))}
                 className="w-full rounded border border-slate-300 px-2 py-1 text-sm tabular-nums" />
        </div>
        <button disabled={disabled || mv == null}
                onClick={() => onSend('cal/turb', { point: 1, voltage_mv: mv, ntu }, `turbidity ${ntu} NTU`)}
                className="col-span-2 px-3 py-2 rounded bg-slate-900 text-white disabled:opacity-50 hover:bg-slate-800">
          Capture as {ntu} NTU
        </button>
      </div>
    </div>
  );
}

// ---------- Temperature ----------
function TempPanel({ latest, disabled, onSend }: {
  latest: Reading | null; disabled: boolean;
  onSend: (t: 'cal/temp', p: Record<string, unknown>, label: string) => Promise<void>;
}) {
  const [reference, setReference] = useState<number>(25);
  const measured = latest?.temp ?? null;
  const offset = measured == null ? null : Number((reference - measured).toFixed(2));
  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-600">
        Compare against a trusted thermometer in the same water. The offset (reference − measured) will be added to all future readings.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-500">Reference temp (°C)</label>
          <input type="number" value={reference} step={0.1}
                 onChange={(e) => setReference(Number(e.target.value))}
                 className="w-full rounded border border-slate-300 px-2 py-1 text-sm tabular-nums" />
        </div>
        <div>
          <div className="text-xs text-slate-500">Measured</div>
          <div className="px-2 py-1 tabular-nums">{fmt(measured, 2, ' °C')}</div>
        </div>
      </div>
      <div className="text-sm">Offset to apply: <b className="tabular-nums">{offset == null ? '—' : `${offset > 0 ? '+' : ''}${offset} °C`}</b></div>
      <button disabled={disabled || offset == null}
              onClick={() => onSend('cal/temp', { offset_c: offset }, `temperature offset ${offset}°C`)}
              className="px-3 py-2 rounded bg-slate-900 text-white disabled:opacity-50 hover:bg-slate-800">
        Send offset to device
      </button>
    </div>
  );
}

function LiveVoltage({ label, mv }: { label: string; mv: number | null }) {
  return (
    <div className="rounded bg-slate-50 border border-slate-200 px-3 py-2 flex items-center justify-between">
      <span className="text-slate-600">Live {label} voltage</span>
      <span className="font-semibold tabular-nums">{mv == null ? '—' : `${mv} mV`}</span>
    </div>
  );
}
