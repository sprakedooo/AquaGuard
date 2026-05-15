import type { DeviceMeta } from '../types';
import { relTime } from '../lib/format';
import Icon from './Icon';

export default function ConnectionCard({ meta }: { meta: DeviceMeta | null }) {
  const online = !!meta?.online;
  const stale  = meta?.lastSeen ? Date.now() - meta.lastSeen > 60000 : false;
  const state  = !online ? 'offline' : stale ? 'stale' : 'online';
  const dot    = state === 'online' ? 'bg-secondary' : state === 'stale' ? 'bg-amber-500' : 'bg-error animate-pulse';

  const Item = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="flex items-center justify-between py-2 border-b border-surface-container-high last:border-b-0">
      <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">{k}</span>
      <span className="text-data-tabular text-on-surface tabular-nums">{v}</span>
    </div>
  );

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high">
      <div className="p-6 border-b border-surface-container-high flex items-center justify-between">
        <h3 className="text-headline-md text-primary">Connection</h3>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
          <span className="text-label-sm uppercase">{state}</span>
        </div>
      </div>
      <div className="px-6 py-2">
        <Item k="Last seen"  v={relTime(meta?.lastSeen)} />
        <Item k="WiFi RSSI"  v={meta?.wifiRssi != null ? `${meta.wifiRssi} dBm` : '—'} />
        <Item k="LoRa RSSI"  v={meta?.lastRssi != null ? `${meta.lastRssi} dBm` : '—'} />
        <Item k="LoRa SNR"   v={meta?.lastSnr  != null ? `${meta.lastSnr.toFixed(1)} dB` : '—'} />
        <Item k="Firmware"   v={meta?.fw ?? '—'} />
        <Item k="Uplinks"    v={meta?.uplinks ?? '—'} />
        <Item k="IP"         v={meta?.ip ?? '—'} />
      </div>
      <div className="p-4 border-t border-surface-container-high">
        <button className="w-full py-2 text-primary text-label-sm hover:underline flex items-center justify-center gap-1">
          <Icon name="open_in_new" size={14} />
          Open device admin page
        </button>
      </div>
    </div>
  );
}
