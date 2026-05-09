import { useAlerts } from '../hooks/useAlerts';
import { alertLabel, fmt, relTime } from '../lib/format';

export default function AlertsLog({ deviceId }: { deviceId: string }) {
  const rows = useAlerts(deviceId, 15);
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
      <h3 className="font-medium mb-3">Recent alerts</h3>
      {rows.length === 0
        ? <p className="text-sm text-slate-500">No alert events yet.</p>
        : (
          <ul className="divide-y divide-slate-100 text-sm">
            {rows.map((r) => {
              const { text, cls } = alertLabel(r.level);
              return (
                <li key={r.key} className="py-2 flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cls}`}>{text}</span>
                  <span className="text-slate-500 tabular-nums">{relTime(r.serverTs)}</span>
                  <span className="ml-auto text-slate-700 tabular-nums text-xs">
                    T {fmt(r.temp ?? null, 1, '°')} · pH {fmt(r.pH ?? null, 2)} · {fmt(r.turb ?? null, 0, ' NTU')}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );
}
