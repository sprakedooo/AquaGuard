import type { DeviceMeta } from '../types';
import { relTime } from '../lib/format';

export default function ConnectionCard({ meta }: { meta: DeviceMeta | null }) {
  const online = !!meta?.online;
  const stale  = meta?.lastSeen && Date.now() - meta.lastSeen > 60000;

  let dot = 'bg-slate-400', label = 'unknown';
  if (online && !stale)      { dot = 'bg-ok';   label = 'online'; }
  else if (online && stale)  { dot = 'bg-warn'; label = 'stale'; }
  else                       { dot = 'bg-crit'; label = 'offline'; }

  const Item = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div><span className="text-slate-500">{k}: </span><span className="tabular-nums">{v}</span></div>
  );

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Connection</h3>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
          <span className="text-sm">{label}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <Item k="Last seen" v={relTime(meta?.lastSeen)} />
        <Item k="WiFi RSSI" v={meta?.wifiRssi != null ? `${meta.wifiRssi} dBm` : '—'} />
        <Item k="LoRa RSSI" v={meta?.lastRssi != null ? `${meta.lastRssi} dBm` : '—'} />
        <Item k="LoRa SNR"  v={meta?.lastSnr  != null ? `${meta.lastSnr.toFixed(1)} dB` : '—'} />
        <Item k="Firmware"  v={meta?.fw ?? '—'} />
        <Item k="Uplinks"   v={meta?.uplinks ?? '—'} />
      </div>
    </div>
  );
}
