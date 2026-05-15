import { useState } from 'react';
import { useDevices } from '../hooks/useDevices';
import { useAuth } from '../auth/AuthProvider';
import { useUI }   from '../ui/UIProvider';
import { createPond, updatePond, deletePond, validateDeviceId } from '../lib/devices';
import { relTime, alertLabel } from '../lib/format';
import type { DeviceSummary } from '../types';
import Icon from './Icon';

export default function PondsManager() {
  const devices = useDevices();
  const { isAdmin } = useAuth();
  const { currentDeviceId, setCurrentDeviceId } = useUI();
  const [editing, setEditing] = useState<DeviceSummary | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-gutter">
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high">
        <div className="p-6 border-b border-surface-container-high flex items-center justify-between gap-4">
          <div>
            <h3 className="text-headline-md text-primary">Ponds & Cages</h3>
            <p className="text-body-md text-on-surface-variant">
              {devices.length === 0 ? 'No ponds yet — add your first one to get started.'
                                    : `${devices.length} pond${devices.length === 1 ? '' : 's'} registered`}
            </p>
          </div>
          <button onClick={() => setCreating(true)} disabled={!isAdmin}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-label-sm disabled:opacity-50 hover:opacity-90">
            <Icon name="add" size={18} />
            Add pond
          </button>
        </div>

        {devices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-fixed text-primary mb-4">
              <Icon name="water" size={32} />
            </div>
            <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
              Each pond is a separate ESP32 receiver + transmitter pair (or a mock feed).
              Click <b>Add pond</b> to register one and it will appear in the dashboard's station picker.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-surface-container-high">
            {devices.map((d) => {
              const stale = d.meta?.lastSeen ? Date.now() - d.meta.lastSeen > 60000 : false;
              const online = d.meta?.online && !stale;
              const dot = online ? 'bg-secondary' : (d.meta?.online ? 'bg-amber-500' : 'bg-error');
              const lvl = alertLabel(d.meta?.lastAlert);
              const isCurrent = d.id === currentDeviceId;
              return (
                <li key={d.id} className="p-6 flex flex-wrap items-center gap-4">
                  <span className={`w-3 h-3 rounded-full ${dot} shrink-0`} />
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="text-data-tabular font-semibold text-on-surface">{d.profile?.name || d.id}</span>
                      {!d.profile && <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Unregistered</span>}
                      {isCurrent && <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-secondary-container/30 text-on-secondary-container">Selected</span>}
                    </div>
                    <div className="text-label-sm text-on-surface-variant">
                      {d.id}
                      {d.profile?.location && ` · ${d.profile.location}`}
                      {d.profile?.species  && ` · ${d.profile.species}`}
                    </div>
                  </div>
                  <div className="text-right text-label-sm text-on-surface-variant min-w-[120px]">
                    <div>Last seen <span className="text-on-surface tabular-nums">{relTime(d.meta?.lastSeen)}</span></div>
                    <div>Alert <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${lvl.cls}`}>{lvl.text}</span></div>
                  </div>
                  <div className="flex gap-2">
                    {!isCurrent && (
                      <button onClick={() => setCurrentDeviceId(d.id)}
                              className="px-3 py-1.5 rounded-lg border border-outline-variant text-label-sm hover:bg-surface-container-high">
                        Select
                      </button>
                    )}
                    <button onClick={() => setEditing(d)} disabled={!isAdmin}
                            className="px-3 py-1.5 rounded-lg border border-outline-variant text-label-sm hover:bg-surface-container-high disabled:opacity-50">
                      Edit
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {creating && <PondFormModal title="Add a pond" submitLabel="Create" onClose={() => setCreating(false)}
                                  onSubmit={async ({ id, ...profile }) => {
                                    await createPond(id, profile);
                                    setCurrentDeviceId(id);
                                    setCreating(false);
                                  }} />}

      {editing && <PondFormModal title={`Edit ${editing.profile?.name || editing.id}`} submitLabel="Save"
                                 lockId initial={{ id: editing.id, ...editing.profile }}
                                 onClose={() => setEditing(null)}
                                 onDelete={isAdmin ? async () => {
                                   if (!confirm(`Delete "${editing.profile?.name || editing.id}" and all its readings? This cannot be undone.`)) return;
                                   await deletePond(editing.id);
                                   setEditing(null);
                                 } : undefined}
                                 onSubmit={async ({ id: _id, ...profile }) => {
                                   await updatePond(editing.id, profile);
                                   setEditing(null);
                                 }} />}
    </div>
  );
}

// ---------- Modal ----------
interface FormValues {
  id: string;
  name: string;
  location?: string;
  species?: string;
  notes?: string;
}

function PondFormModal({ title, submitLabel, initial, lockId, onSubmit, onClose, onDelete }: {
  title: string;
  submitLabel: string;
  initial?: Partial<FormValues>;
  lockId?: boolean;
  onSubmit: (v: FormValues) => Promise<void>;
  onClose: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [v, setV] = useState<FormValues>({
    id: initial?.id ?? '',
    name: initial?.name ?? '',
    location: initial?.location ?? '',
    species: initial?.species ?? 'Tilapia',
    notes: initial?.notes ?? '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (!lockId) {
        const e1 = validateDeviceId(v.id);
        if (e1) throw new Error(e1);
      }
      if (!v.name.trim()) throw new Error('Pond name is required.');
      await onSubmit(v);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md focus:outline-none focus:border-secondary disabled:opacity-60';
  const labelCls = 'block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
            className="bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container-high w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-headline-md text-primary">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-surface-container-high text-on-surface-variant">
            <Icon name="close" size={20} />
          </button>
        </div>

        <label className="block">
          <span className={labelCls}>Device ID</span>
          <input type="text" value={v.id} disabled={!!lockId} placeholder="pond-01"
                 onChange={(e) => setV({ ...v, id: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Pond name</span>
          <input type="text" value={v.name} placeholder="North Pond A"
                 onChange={(e) => setV({ ...v, name: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Location</span>
          <input type="text" value={v.location ?? ''} placeholder="North field, GPS …"
                 onChange={(e) => setV({ ...v, location: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Species</span>
          <input type="text" value={v.species ?? ''} placeholder="Tilapia / Bangus / Catfish …"
                 onChange={(e) => setV({ ...v, species: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Notes</span>
          <textarea value={v.notes ?? ''} rows={3}
                    onChange={(e) => setV({ ...v, notes: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md focus:outline-none focus:border-secondary" />
        </label>

        {err && <p className="text-label-sm text-error">{err}</p>}

        <div className="flex items-center justify-between pt-2">
          {onDelete ? (
            <button type="button" onClick={onDelete}
                    className="px-3 py-2 rounded-lg text-error text-label-sm hover:bg-error-container/40">
              Delete pond
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-outline-variant text-label-sm hover:bg-surface-container-high">
              Cancel
            </button>
            <button type="submit" disabled={busy}
                    className="px-4 py-2 rounded-lg bg-primary text-on-primary text-label-sm disabled:opacity-50 hover:opacity-90">
              {busy ? '…' : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
