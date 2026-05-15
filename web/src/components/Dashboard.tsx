import { useEffect, useRef, useState } from 'react';
import { useDeviceLatest } from '../hooks/useDeviceLatest';
import { useDeviceMeta }   from '../hooks/useDeviceMeta';
import { useThresholds }   from '../hooks/useThresholds';
import { useReadings }     from '../hooks/useReadings';
import { useDevices }      from '../hooks/useDevices';
import { relTime } from '../lib/format';
import LiveGauges        from './LiveGauges';
import AlertBadge        from './AlertBadge';
import ConnectionCard    from './ConnectionCard';
import TelemetryChart    from './TelemetryChart';
import AlertsLog         from './AlertsLog';
import ThresholdEditor   from './ThresholdEditor';
import CalibrationWizard from './CalibrationWizard';
import Header            from './Header';
import Sidebar, { type Section } from './Sidebar';
import BottomNav         from './BottomNav';
import PondsManager      from './PondsManager';
import { useUI } from '../ui/UIProvider';

export default function Dashboard() {
  const [section, setSection] = useState<Section>('dashboard');
  const { sidebarCollapsed, currentDeviceId } = useUI();
  const { devices, loaded: devicesLoaded } = useDevices();
  const latest  = useDeviceLatest(currentDeviceId);
  const meta    = useDeviceMeta(currentDeviceId);
  const th      = useThresholds(currentDeviceId);
  const history = useReadings(currentDeviceId, 60 * 60_000);

  const mainOffset = sidebarCollapsed ? 'md:ml-sidebar-collapsed' : 'md:ml-sidebar-width';
  const noPondsYet = devicesLoaded && devices.length === 0;

  // One-time redirect to Ponds only after Firebase confirms there are no ponds.
  const redirected = useRef(false);
  useEffect(() => {
    if (!redirected.current && noPondsYet) {
      redirected.current = true;
      setSection('ponds');
    }
  }, [noPondsYet]);

  const effectiveSection = section;

  return (
    <div className="min-h-full bg-background text-on-background">
      <Sidebar active={effectiveSection} onChange={setSection} />
      <BottomNav active={effectiveSection} onChange={setSection} />

      <main className={`${mainOffset} min-h-screen flex flex-col transition-all duration-200`}>
        <Header onGotoPonds={() => setSection('ponds')} />

        {/* pb-20 reserves space above the bottom nav on mobile */}
        <div className="px-4 py-4 md:p-margin-page space-y-gutter flex-1 max-w-[1280px] mx-auto w-full pb-24 md:pb-margin-page">
          <div className="flex flex-wrap items-end justify-between mb-4 md:mb-8 gap-3">
            <div>
              <h2 className="text-2xl md:text-headline-lg font-bold text-primary leading-tight">
                {effectiveSection === 'dashboard'   && 'Real-time Monitoring'}
                {effectiveSection === 'ponds'       && 'Pond Management'}
                {effectiveSection === 'calibration' && 'Sensor Calibration'}
                {effectiveSection === 'thresholds'  && 'Alert Thresholds'}
                {effectiveSection === 'alerts'      && 'Alert Log'}
              </h2>
              {effectiveSection !== 'ponds' && (
                <p className="text-sm md:text-body-md text-on-surface-variant mt-0.5">
                  Station <span className="font-semibold text-on-surface">{currentDeviceId}</span>
                  {' • '}{meta?.lastSeen ? `last reading ${relTime(meta.lastSeen)}` : 'no telemetry yet'}
                </p>
              )}
            </div>
            {effectiveSection !== 'ponds' && <AlertBadge level={latest?.alert ?? null} />}
          </div>

          {effectiveSection === 'dashboard' && (
            <>
              <LiveGauges latest={latest} th={th} history={history} />
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-gutter mt-4">
                <div className="xl:col-span-2 flex flex-col gap-gutter">
                  <TelemetryChart deviceId={currentDeviceId} />
                </div>
                <div className="flex flex-col gap-gutter">
                  <ConnectionCard meta={meta} />
                  <AlertsLog deviceId={currentDeviceId} />
                </div>
              </div>
            </>
          )}

          {effectiveSection === 'ponds' && <PondsManager />}

          {effectiveSection === 'calibration' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-gutter">
              <div className="xl:col-span-2">
                <CalibrationWizard deviceId={currentDeviceId} latest={latest} />
              </div>
              <div>
                <ConnectionCard meta={meta} />
              </div>
            </div>
          )}

          {effectiveSection === 'thresholds' && (
            <ThresholdEditor deviceId={currentDeviceId} current={th} />
          )}

          {effectiveSection === 'alerts' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-gutter">
              <div className="xl:col-span-2">
                <AlertsLog deviceId={currentDeviceId} />
              </div>
              <div>
                <ConnectionCard meta={meta} />
              </div>
            </div>
          )}

          <footer className="mt-8 md:mt-12 py-6 md:py-8 border-t border-outline-variant flex flex-col md:flex-row justify-between items-center gap-3 opacity-70">
            <p className="text-label-sm text-on-surface-variant text-center md:text-left">© 2025 AquaSense Water Quality Monitoring System</p>
            <div className="flex gap-6">
              <a className="text-label-sm text-on-surface-variant hover:text-primary" href="#">System Status</a>
              <a className="text-label-sm text-on-surface-variant hover:text-primary" href="#">Documentation</a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
