import { useState } from 'react';
import type { Reading } from '../types';
import { issueCommand } from '../lib/commands';
import { useAuth } from '../auth/AuthProvider';
import { fmt } from '../lib/format';
import Icon from './Icon';

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

  const TabBtn = ({ id, label, icon }: { id: Tab; label: string; icon: string }) => (
    <button onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-label-sm transition-colors ${
              tab === id
                ? 'bg-primary text-on-primary'
                : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-high'}`}>
      <Icon name={icon} size={16} />
      {label}
    </button>
  );

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high">
      <div className="p-6 border-b border-surface-container-high flex items-center justify-between">
        <h3 className="text-headline-md text-primary">Calibration</h3>
        {!isAdmin && <span className="text-label-sm text-on-surface-variant">Admin required</span>}
      </div>
      <div className="p-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          <TabBtn id="ph"   label="pH (2-point)" icon="science" />
          <TabBtn id="turb" label="Turbidity"     icon="water_drop" />
          <TabBtn id="temp" label="Temperature"   icon="thermostat" />
        </div>

        {tab === 'ph'   && <PhPanel   latest={latest} disabled={!isAdmin || busy} onSend={send} />}
        {tab === 'turb' && <TurbPanel latest={latest} disabled={!isAdmin || busy} onSend={send} />}
        {tab === 'temp' && <TempPanel latest={latest} disabled={!isAdmin || busy} onSend={send} />}

        {msg && <p className="text-label-sm text-on-surface-variant">{msg}</p>}
      </div>
    </div>
  );
}

function LiveVoltage({ label, mv }: { label: string; mv: number | null }) {
  return (
    <div className="rounded-lg bg-surface-container-low border border-outline-variant px-3 py-2 flex items-center justify-between">
      <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">Live {label} voltage</span>
      <span className="text-data-tabular font-bold tabular-nums text-primary">{mv == null ? '—' : `${mv} mV`}</span>
    </div>
  );
}

function PrimaryBtn({ disabled, onClick, children }: { disabled?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button disabled={disabled} onClick={onClick}
            className="px-3 py-2 rounded-lg bg-primary text-on-primary text-label-sm disabled:opacity-50 hover:opacity-90">
      {children}
    </button>
  );
}

function PhPanel({ latest, disabled, onSend }: {
  latest: Reading | null; disabled: boolean;
  onSend: (t: 'cal/ph', p: Record<string, unknown>, label: string) => Promise<void>;
}) {
  const mv = latest?.pH_mv ?? null;
  return (
    <div className="space-y-3 text-body-md">
      <p className="text-on-surface-variant">
        Rinse the probe with distilled water, dip into a buffer, wait ~30 s for the live voltage to stabilise, then capture.
      </p>
      <LiveVoltage label="probe" mv={mv} />
      <div className="grid grid-cols-2 gap-3">
        <PrimaryBtn disabled={disabled || mv == null}
                    onClick={() => onSend('cal/ph', { point: 7, voltage_mv: mv }, 'pH 7 calibration')}>
          Capture as pH 7
        </PrimaryBtn>
        <PrimaryBtn disabled={disabled || mv == null}
                    onClick={() => onSend('cal/ph', { point: 4, voltage_mv: mv }, 'pH 4 calibration')}>
          Capture as pH 4
        </PrimaryBtn>
      </div>
      <p className="text-label-sm text-on-surface-variant">
        Both points needed for accuracy. Future readings are temperature-compensated automatically (Nernst).
      </p>
    </div>
  );
}

function TurbPanel({ latest, disabled, onSend }: {
  latest: Reading | null; disabled: boolean;
  onSend: (t: 'cal/turb', p: Record<string, unknown>, label: string) => Promise<void>;
}) {
  const mv = latest?.turb_mv ?? null;
  const [ntu, setNtu] = useState(1000);
  return (
    <div className="space-y-3 text-body-md">
      <p className="text-on-surface-variant">
        Place the probe in clear water for the zero point, then in a known-NTU sample for the dirty point.
      </p>
      <LiveVoltage label="probe" mv={mv} />
      <div className="grid grid-cols-2 gap-3 items-end">
        <PrimaryBtn disabled={disabled || mv == null}
                    onClick={() => onSend('cal/turb', { point: 0, voltage_mv: mv, ntu: 0 }, 'turbidity zero')}>
          Capture clear (0 NTU)
        </PrimaryBtn>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Dirty NTU</span>
          <input type="number" value={ntu} step={1} min={1}
                 onChange={(e) => setNtu(Number(e.target.value))}
                 className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1.5 text-data-tabular tabular-nums" />
        </label>
        <div className="col-span-2">
          <PrimaryBtn disabled={disabled || mv == null}
                      onClick={() => onSend('cal/turb', { point: 1, voltage_mv: mv, ntu }, `turbidity ${ntu} NTU`)}>
            Capture as {ntu} NTU
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

function TempPanel({ latest, disabled, onSend }: {
  latest: Reading | null; disabled: boolean;
  onSend: (t: 'cal/temp', p: Record<string, unknown>, label: string) => Promise<void>;
}) {
  const [reference, setReference] = useState(25);
  const measured = latest?.temp ?? null;
  const offset = measured == null ? null : Number((reference - measured).toFixed(2));
  return (
    <div className="space-y-3 text-body-md">
      <p className="text-on-surface-variant">
        Compare against a trusted thermometer in the same water. Offset (reference − measured) is added to all future readings.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Reference (°C)</span>
          <input type="number" value={reference} step={0.1}
                 onChange={(e) => setReference(Number(e.target.value))}
                 className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1.5 text-data-tabular tabular-nums" />
        </label>
        <div>
          <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Measured</span>
          <div className="mt-1 px-2 py-1.5 text-data-tabular tabular-nums text-primary font-semibold">{fmt(measured, 2, ' °C')}</div>
        </div>
      </div>
      <div className="text-data-tabular">
        Offset: <b className="tabular-nums text-primary">{offset == null ? '—' : `${offset > 0 ? '+' : ''}${offset} °C`}</b>
      </div>
      <PrimaryBtn disabled={disabled || offset == null}
                  onClick={() => onSend('cal/temp', { offset_c: offset }, `temperature offset ${offset}°C`)}>
        Send offset to device
      </PrimaryBtn>
    </div>
  );
}
