import { useState } from 'react';
import { ref, set } from 'firebase/database';
import type { Reading } from '../types';
import { issueCommand } from '../lib/commands';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthProvider';
import { fmt } from '../lib/format';

interface Props { deviceId: string; latest: Reading | null; }

type Tab = 'ph' | 'turb' | 'temp';

export default function CalibrationWizard({ deviceId, latest }: Props) {
  const { isAdmin } = useAuth();
  const [tab, setTab]   = useState<Tab>('ph');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState('');

  // pH and turbidity calibration is saved directly to Firebase — the server
  // reads it on every telemetry packet and applies the formula there.
  async function saveCalToFirebase(type: 'ph' | 'turb', data: Record<string, unknown>, label: string) {
    setBusy(true); setMsg('');
    try {
      await set(ref(db, `devices/${deviceId}/calibration/${type}`), {
        ...data,
        savedAt: Date.now(),
      });
      setMsg(`✓ ${label} saved — server will apply on next reading.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  // Temperature offset still goes to the device via LoRa downlink (applied locally).
  async function sendTempOffset(payload: Record<string, unknown>, label: string) {
    setBusy(true); setMsg('');
    try {
      await issueCommand(deviceId, 'cal/temp', payload);
      setMsg(`✓ ${label} sent to device — applying…`);
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
        <TabBtn id="turb" label="Turbidity"    />
        <TabBtn id="temp" label="Temperature"  />
      </div>

      {tab === 'ph'   && <PhPanel   latest={latest} disabled={!isAdmin || busy} onSave={saveCalToFirebase} />}
      {tab === 'turb' && <TurbPanel latest={latest} disabled={!isAdmin || busy} onSave={saveCalToFirebase} />}
      {tab === 'temp' && <TempPanel latest={latest} disabled={!isAdmin || busy} onSend={sendTempOffset}    />}

      {msg && <p className="mt-3 text-xs text-slate-600">{msg}</p>}
    </div>
  );
}

// ---------- pH ----------
function PhPanel({ latest, disabled, onSave }: {
  latest: Reading | null; disabled: boolean;
  onSave: (type: 'ph', data: Record<string, unknown>, label: string) => Promise<void>;
}) {
  const mv = latest?.pH_mv ?? null;
  const [v7, setV7] = useState<number | null>(null);
  const [v4, setV4] = useState<number | null>(null);

  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-600">
        Rinse the probe with distilled water, dip into a buffer, wait until the live
        voltage stabilises (~30 s), then capture. Calibration is saved to the cloud —
        no LoRa downlink required.
      </p>
      <LiveVoltage label="probe" mv={mv} />
      <div className="grid grid-cols-2 gap-3">
        <button disabled={disabled || mv == null}
                onClick={() => { setV7(mv!); onSave('ph', { v7_mv: mv, v4_mv: v4 ?? undefined }, 'pH 7 point'); }}
                className={`px-3 py-2 rounded text-white disabled:opacity-50 hover:opacity-90 ${v7 ? 'bg-ok' : 'bg-slate-900'}`}>
          {v7 ? `✓ pH 7 = ${v7} mV` : 'Capture as pH 7'}
        </button>
        <button disabled={disabled || mv == null}
                onClick={() => { setV4(mv!); onSave('ph', { v7_mv: v7 ?? undefined, v4_mv: mv }, 'pH 4 point'); }}
                className={`px-3 py-2 rounded text-white disabled:opacity-50 hover:opacity-90 ${v4 ? 'bg-ok' : 'bg-slate-900'}`}>
          {v4 ? `✓ pH 4 = ${v4} mV` : 'Capture as pH 4'}
        </button>
      </div>
      {v7 && v4 && (
        <button disabled={disabled}
                onClick={() => onSave('ph', { v7_mv: v7, v4_mv: v4 }, 'pH calibration')}
                className="w-full px-3 py-2 rounded bg-ok text-white disabled:opacity-50 hover:opacity-90">
          Save both points to cloud
        </button>
      )}
      <p className="text-xs text-slate-500">
        Both points needed for accuracy. Future pH readings are temperature-compensated automatically.
      </p>
    </div>
  );
}

// ---------- Turbidity ----------
function TurbPanel({ latest, disabled, onSave }: {
  latest: Reading | null; disabled: boolean;
  onSave: (type: 'turb', data: Record<string, unknown>, label: string) => Promise<void>;
}) {
  const mv = latest?.turb_mv ?? null;
  const [vClear, setVClear] = useState<number | null>(null);
  const [ntu, setNtu]       = useState<number>(100);
  const [vDirty, setVDirty] = useState<number | null>(null);

  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-600">
        Place the probe in clear water for the zero point, then in a known-NTU sample.
        Calibration is saved to the cloud.
      </p>
      <LiveVoltage label="probe" mv={mv} />
      <div className="grid grid-cols-2 gap-3 items-end">
        <button disabled={disabled || mv == null}
                onClick={() => { setVClear(mv!); onSave('turb', { v_clear_mv: mv, v_dirty_mv: vDirty ?? undefined, ntu_dirty: ntu }, 'clear point'); }}
                className={`px-3 py-2 rounded text-white disabled:opacity-50 hover:opacity-90 ${vClear ? 'bg-ok' : 'bg-slate-900'}`}>
          {vClear ? `✓ Clear = ${vClear} mV` : 'Capture clear (0 NTU)'}
        </button>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Dirty reference NTU</label>
          <input type="number" value={ntu} step={1} min={1}
                 onChange={(e) => setNtu(Number(e.target.value))}
                 className="w-full rounded border border-slate-300 px-2 py-1 text-sm tabular-nums" />
        </div>
        <button disabled={disabled || mv == null}
                onClick={() => { setVDirty(mv!); onSave('turb', { v_clear_mv: vClear ?? undefined, v_dirty_mv: mv, ntu_dirty: ntu }, `dirty ${ntu} NTU point`); }}
                className={`col-span-2 px-3 py-2 rounded text-white disabled:opacity-50 hover:opacity-90 ${vDirty ? 'bg-ok' : 'bg-slate-900'}`}>
          {vDirty ? `✓ Dirty = ${vDirty} mV @ ${ntu} NTU` : `Capture as ${ntu} NTU`}
        </button>
      </div>
      {vClear && vDirty && (
        <button disabled={disabled}
                onClick={() => onSave('turb', { v_clear_mv: vClear, v_dirty_mv: vDirty, ntu_dirty: ntu }, 'turbidity calibration')}
                className="w-full px-3 py-2 rounded bg-ok text-white disabled:opacity-50 hover:opacity-90">
          Save both points to cloud
        </button>
      )}
    </div>
  );
}

// ---------- Temperature ----------
function TempPanel({ latest, disabled, onSend }: {
  latest: Reading | null; disabled: boolean;
  onSend: (payload: Record<string, unknown>, label: string) => Promise<void>;
}) {
  const [reference, setReference] = useState<number>(25);
  const measured = latest?.temp ?? null;
  const offset   = measured == null ? null : Number((reference - measured).toFixed(2));

  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-600">
        Compare against a trusted thermometer in the same water. The offset is sent to
        the device via LoRa and applied to all future readings before transmission.
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
      <div className="text-sm">
        Offset: <b className="tabular-nums">
          {offset == null ? '—' : `${offset > 0 ? '+' : ''}${offset} °C`}
        </b>
      </div>
      <button disabled={disabled || offset == null}
              onClick={() => onSend({ offset_c: offset }, `temperature offset ${offset}°C`)}
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
