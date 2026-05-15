import { useEffect, useRef, useState } from 'react';
import { useDevices } from '../hooks/useDevices';
import { useUI } from '../ui/UIProvider';
import Icon from './Icon';

export default function DevicePicker({ onAddNew }: { onAddNew?: () => void }) {
  const { devices } = useDevices();
  const { currentDeviceId, setCurrentDeviceId } = useUI();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const current = devices.find((d) => d.id === currentDeviceId);
  const label   = current?.profile?.name || currentDeviceId;
  const stale   = current?.meta?.lastSeen ? Date.now() - current.meta.lastSeen > 60000 : false;
  const online  = current?.meta?.online && !stale;
  const dot     = online ? 'bg-secondary' : (current?.meta?.online ? 'bg-amber-500' : 'bg-error');

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors max-w-[200px] md:max-w-none">
        <span className={`w-2 h-2 rounded-full shrink-0 ${current ? dot : 'bg-outline'}`} />
        <span className="hidden sm:inline text-on-surface-variant text-label-sm uppercase tracking-wider shrink-0">Station</span>
        <span className="text-data-tabular font-semibold text-on-surface truncate">{label}</span>
        <Icon name={open ? 'expand_less' : 'expand_more'} size={18} className="shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[min(320px,calc(100vw-2rem))] max-h-96 overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-50 p-1">
          {devices.length === 0 ? (
            <p className="px-3 py-4 text-body-md text-on-surface-variant text-center">
              No ponds yet.
            </p>
          ) : (
            <ul>
              {devices.map((d) => {
                const isCurrent = d.id === currentDeviceId;
                const dStale = d.meta?.lastSeen ? Date.now() - d.meta.lastSeen > 60000 : false;
                const dOnline = d.meta?.online && !dStale;
                const dDot = dOnline ? 'bg-secondary' : (d.meta?.online ? 'bg-amber-500' : 'bg-outline');
                return (
                  <li key={d.id}>
                    <button onClick={() => { setCurrentDeviceId(d.id); setOpen(false); }}
                            className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                              isCurrent ? 'bg-surface-container-high' : 'hover:bg-surface-container-high'
                            }`}>
                      <span className={`w-2 h-2 rounded-full ${dDot}`} />
                      <span className="flex-1 min-w-0">
                        <div className="text-data-tabular font-semibold text-on-surface truncate">
                          {d.profile?.name || d.id}
                        </div>
                        <div className="text-[11px] text-on-surface-variant truncate">
                          {d.id}{d.profile?.location ? ` · ${d.profile.location}` : ''}
                        </div>
                      </span>
                      {isCurrent && <Icon name="check" size={16} className="text-secondary" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {onAddNew && (
            <>
              <div className="border-t border-outline-variant my-1" />
              <button onClick={() => { setOpen(false); onAddNew(); }}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-primary hover:bg-surface-container-high transition-colors">
                <Icon name="add" size={18} />
                <span className="text-label-sm">Add a new pond</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
