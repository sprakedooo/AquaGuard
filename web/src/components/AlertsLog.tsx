import { useAlerts } from '../hooks/useAlerts';
import { fmt, relTime } from '../lib/format';
import type { AlertLevel } from '../types';

const DOT: Record<string, string> = { '0': 'bg-secondary', '1': 'bg-amber-500', '2': 'bg-error' };
const TXT = (lvl: AlertLevel | undefined) => lvl === 2 ? 'Critical breach' : lvl === 1 ? 'Warning' : 'Returned to nominal';

export default function AlertsLog({ deviceId }: { deviceId: string }) {
  const rows = useAlerts(deviceId, 15);
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high flex flex-col">
      <div className="p-6 border-b border-surface-container-high">
        <h3 className="text-headline-md text-primary">Recent Activity</h3>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1 max-h-[400px]">
        {rows.length === 0 ? (
          <p className="text-body-md text-on-surface-variant px-3 py-6 text-center">No alert events yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.key} className="flex gap-4 p-3 rounded-lg hover:bg-surface-container transition-colors">
              <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${DOT[String(r.level)]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-label-sm text-on-surface">{TXT(r.level)}</p>
                <p className="text-[11px] text-on-surface-variant">
                  {relTime(r.serverTs)} · T {fmt(r.temp ?? null, 1, '°')} · pH {fmt(r.pH ?? null, 2)} · {fmt(r.turb ?? null, 0, ' NTU')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
