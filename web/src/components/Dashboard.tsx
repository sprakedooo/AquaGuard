import { useDeviceLatest } from '../hooks/useDeviceLatest';
import { useDeviceMeta }   from '../hooks/useDeviceMeta';
import { useThresholds }   from '../hooks/useThresholds';
import LiveGauges        from './LiveGauges';
import AlertBadge        from './AlertBadge';
import ConnectionCard    from './ConnectionCard';
import TelemetryChart    from './TelemetryChart';
import AlertsLog         from './AlertsLog';
import ThresholdEditor   from './ThresholdEditor';
import CalibrationWizard from './CalibrationWizard';
import Header            from './Header';

export default function Dashboard({ deviceId }: { deviceId: string }) {
  const latest = useDeviceLatest(deviceId);
  const meta   = useDeviceMeta(deviceId);
  const th     = useThresholds(deviceId);

  return (
    <div className="min-h-full">
      <Header deviceId={deviceId} />
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <AlertBadge level={latest?.alert ?? null} />
          <span className="text-sm text-slate-500">
            {latest?.serverTs ? `last reading at ${new Date(latest.serverTs).toLocaleString()}` : 'no data yet'}
          </span>
        </div>

        <LiveGauges latest={latest} th={th} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TelemetryChart deviceId={deviceId} />
            <AlertsLog deviceId={deviceId} />
          </div>
          <div className="space-y-6">
            <ConnectionCard meta={meta} />
            <ThresholdEditor deviceId={deviceId} current={th} />
            <CalibrationWizard deviceId={deviceId} latest={latest} />
          </div>
        </div>
      </main>
    </div>
  );
}
