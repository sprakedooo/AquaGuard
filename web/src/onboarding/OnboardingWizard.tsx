import { useState } from 'react';
import { setupDevice, validateDeviceId, type ProvisionConfig } from '../lib/devices';
import { useUI } from '../ui/UIProvider';
import Icon from '../components/Icon';
import SignOutButton from '../components/SignOutButton';

const TOTAL_STEPS = 3;

const DEFAULT_MQTT = 'mqtt://localhost:1883';
const DEFAULT_PREFIX = 'aquaguard';

interface FormState {
  // Step 1 — pond info
  pondName:     string;
  location:     string;
  species:      string;
  // Step 2 — device + credentials
  deviceId:     string;
  wifiSsid:     string;
  wifiPass:     string;
  mqttUrl:      string;
  mqttUser:     string;
  mqttPass:     string;
  topicPrefix:  string;
}

const INIT: FormState = {
  pondName: '', location: '', species: 'Tilapia',
  deviceId: 'pond-01',
  wifiSsid: '', wifiPass: '',
  mqttUrl: DEFAULT_MQTT, mqttUser: '', mqttPass: '',
  topicPrefix: DEFAULT_PREFIX,
};

interface Props {
  onFinish: () => void;
}

export default function OnboardingWizard({ onFinish }: Props) {
  const { theme, setCurrentDeviceId } = useUI();
  const [step, setStep]   = useState(1);
  const [form, setForm]   = useState<FormState>(INIT);
  const [showPw, setShowPw] = useState(false);
  const [err, setErr]     = useState('');
  const [busy, setBusy]   = useState(false);

  const field = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // ── Step validation ────────────────────────────────────────────────────────
  function validateStep1() {
    if (!form.pondName.trim()) return 'Pond name is required.';
    return null;
  }
  function validateStep2() {
    const idErr = validateDeviceId(form.deviceId);
    if (idErr) return idErr;
    if (!form.wifiSsid.trim()) return 'WiFi network name (SSID) is required.';
    if (!form.wifiPass.trim()) return 'WiFi password is required.';
    if (!form.mqttUrl.trim())  return 'MQTT broker URL is required.';
    return null;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  function next() {
    setErr('');
    const e = step === 1 ? validateStep1() : null;
    if (e) { setErr(e); return; }
    setStep(s => s + 1);
  }

  async function submit() {
    setErr('');
    const e = validateStep2();
    if (e) { setErr(e); return; }
    setBusy(true);
    try {
      const provision: ProvisionConfig = {
        wifiSsid:    form.wifiSsid,
        wifiPass:    form.wifiPass,
        mqttUrl:     form.mqttUrl,
        mqttUser:    form.mqttUser || undefined,
        mqttPass:    form.mqttPass || undefined,
        topicPrefix: form.topicPrefix || DEFAULT_PREFIX,
      };
      await setupDevice(
        form.deviceId,
        { name: form.pondName, location: form.location || undefined, species: form.species || undefined },
        provision,
      );
      setCurrentDeviceId(form.deviceId);
      setStep(3);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Setup failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // ── Config file download ───────────────────────────────────────────────────
  function downloadConfig() {
    const cfg = {
      deviceId:    form.deviceId,
      topicPrefix: form.topicPrefix || DEFAULT_PREFIX,
      wifi:        { ssid: form.wifiSsid, password: form.wifiPass },
      mqtt: {
        url:      form.mqttUrl,
        username: form.mqttUser || '',
        password: form.mqttPass || '',
      },
    };
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `aquasense-config-${form.deviceId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ── Finish → go to dashboard ───────────────────────────────────────────────
  function finish() { onFinish(); }

  const inputCls = 'w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md focus:outline-none focus:border-secondary';
  const labelCls = 'block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1';

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
        <img src="/aquasense-wordmark.svg" alt="AquaSense" height={36}
             style={theme === 'dark' ? { filter: 'brightness(0) invert(1)' } : undefined} />
        <SignOutButton className="text-label-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1.5" />
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-surface-container-high">
        <div className="h-1 bg-primary transition-all duration-500"
             style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center p-6 pt-10">
        <div className="w-full max-w-lg space-y-6">

          {/* Step indicator */}
          <div className="flex items-center gap-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-colors ${
                  n < step  ? 'bg-primary border-primary text-on-primary'
                  : n === step ? 'border-primary text-primary bg-transparent'
                  : 'border-outline-variant text-on-surface-variant bg-transparent'
                }`}>
                  {n < step ? <Icon name="check" size={14} /> : n}
                </div>
                {n < 3 && <div className={`flex-1 h-px w-12 ${n < step ? 'bg-primary' : 'bg-outline-variant'}`} />}
              </div>
            ))}
            <span className="text-label-sm text-on-surface-variant ml-2">Step {step} of {TOTAL_STEPS}</span>
          </div>

          {/* ── Step 1: Pond info ── */}
          {step === 1 && (
            <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high p-6 space-y-5">
              <div>
                <h2 className="text-headline-md text-primary font-bold">Set up your first pond</h2>
                <p className="text-body-md text-on-surface-variant mt-1">
                  Tell us about the pond or cage you'll be monitoring.
                </p>
              </div>

              <label className="block">
                <span className={labelCls}>Pond / Station name <span className="text-error">*</span></span>
                <input type="text" value={form.pondName} onChange={field('pondName')}
                       placeholder="e.g. North Pond A" className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Location</span>
                <input type="text" value={form.location} onChange={field('location')}
                       placeholder="e.g. Bacolod Fish Farm, Area 2" className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Species</span>
                <input type="text" value={form.species} onChange={field('species')}
                       placeholder="e.g. Tilapia, Bangus, Catfish" className={inputCls} />
              </label>

              {err && <p className="text-label-sm text-error">{err}</p>}

              <button onClick={next}
                      className="w-full bg-primary text-on-primary py-2.5 rounded-lg text-label-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                Next: Configure Device <Icon name="arrow_forward" size={16} />
              </button>
            </div>
          )}

          {/* ── Step 2: Device ID + WiFi + MQTT ── */}
          {step === 2 && (
            <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high p-6 space-y-5">
              <div>
                <h2 className="text-headline-md text-primary font-bold">Configure your receiver</h2>
                <p className="text-body-md text-on-surface-variant mt-1">
                  These settings will be saved to the cloud and bundled into a config file for your ESP32.
                </p>
              </div>

              {/* Device ID */}
              <div className="p-4 rounded-lg bg-surface-container space-y-3 border border-outline-variant/50">
                <p className="text-label-sm text-on-surface font-bold flex items-center gap-1.5">
                  <Icon name="router" size={16} /> Device ID
                </p>
                <label className="block">
                  <span className={labelCls}>Unique device identifier <span className="text-error">*</span></span>
                  <input type="text" value={form.deviceId} onChange={field('deviceId')}
                         placeholder="pond-01" className={inputCls} />
                  <p className="mt-1 text-[10px] text-on-surface-variant">
                    Lowercase letters, numbers and hyphens only. This ID links the physical device to this dashboard.
                  </p>
                </label>
              </div>

              {/* WiFi */}
              <div className="p-4 rounded-lg bg-surface-container space-y-3 border border-outline-variant/50">
                <p className="text-label-sm text-on-surface font-bold flex items-center gap-1.5">
                  <Icon name="wifi" size={16} /> WiFi Credentials
                </p>
                <label className="block">
                  <span className={labelCls}>Network name (SSID) <span className="text-error">*</span></span>
                  <input type="text" value={form.wifiSsid} onChange={field('wifiSsid')}
                         placeholder="MyNetwork" className={inputCls} autoComplete="off" />
                </label>
                <label className="block">
                  <span className={labelCls}>Password <span className="text-error">*</span></span>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={form.wifiPass}
                           onChange={field('wifiPass')} placeholder="••••••••"
                           className={`${inputCls} pr-14`} autoComplete="off" />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-on-surface-variant hover:text-on-surface">
                      {showPw ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </label>
                <p className="text-[10px] text-on-surface-variant">
                  Credentials are stored in Firebase and embedded in your downloadable config file. Use Firebase Security Rules to restrict access.
                </p>
              </div>

              {/* MQTT */}
              <div className="p-4 rounded-lg bg-surface-container space-y-3 border border-outline-variant/50">
                <p className="text-label-sm text-on-surface font-bold flex items-center gap-1.5">
                  <Icon name="cell_tower" size={16} /> MQTT Broker
                </p>
                <label className="block">
                  <span className={labelCls}>Broker URL <span className="text-error">*</span></span>
                  <input type="text" value={form.mqttUrl} onChange={field('mqttUrl')}
                         placeholder="mqtt://192.168.1.100:1883" className={inputCls} />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={labelCls}>Username (optional)</span>
                    <input type="text" value={form.mqttUser} onChange={field('mqttUser')}
                           className={inputCls} autoComplete="off" />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Password (optional)</span>
                    <input type={showPw ? 'text' : 'password'} value={form.mqttPass}
                           onChange={field('mqttPass')} className={inputCls} autoComplete="off" />
                  </label>
                </div>
                <label className="block">
                  <span className={labelCls}>Topic prefix</span>
                  <input type="text" value={form.topicPrefix} onChange={field('topicPrefix')}
                         placeholder="aquaguard" className={inputCls} />
                  <p className="mt-1 text-[10px] text-on-surface-variant">
                    Topics will follow: <code className="bg-surface-container px-1 rounded">{form.topicPrefix || 'aquaguard'}/{form.deviceId}/telemetry</code>
                  </p>
                </label>
              </div>

              {err && <p className="text-label-sm text-error">{err}</p>}

              <div className="flex gap-3">
                <button onClick={() => { setErr(''); setStep(1); }}
                        className="px-4 py-2.5 rounded-lg border border-outline-variant text-label-sm hover:bg-surface-container-high">
                  Back
                </button>
                <button onClick={submit} disabled={busy}
                        className="flex-1 bg-primary text-on-primary py-2.5 rounded-lg text-label-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
                  {busy ? 'Saving…' : <><Icon name="save" size={16} /> Save & generate config</>}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Download + instructions ── */}
          {step === 3 && (
            <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high p-6 space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-container/30 flex items-center justify-center shrink-0">
                  <Icon name="check_circle" size={24} className="text-secondary" />
                </div>
                <div>
                  <h2 className="text-headline-md text-primary font-bold">Your device is configured!</h2>
                  <p className="text-body-md text-on-surface-variant mt-1">
                    Download the config file and flash it to your ESP32 to complete setup.
                  </p>
                </div>
              </div>

              {/* Download button */}
              <button onClick={downloadConfig}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-secondary text-on-secondary text-label-sm font-semibold hover:opacity-90 transition-opacity">
                <Icon name="download" size={18} />
                Download <code className="font-mono">aquasense-config-{form.deviceId}.json</code>
              </button>

              {/* Instructions */}
              <div className="rounded-lg border border-outline-variant/50 overflow-hidden">
                <div className="px-4 py-2 bg-surface-container border-b border-outline-variant/50">
                  <p className="text-label-sm font-bold text-on-surface">Flash instructions</p>
                </div>
                <ol className="p-4 space-y-3 text-body-md text-on-surface-variant list-none">
                  {[
                    { icon: 'download', text: <>Download the <code className="bg-surface-container px-1 rounded text-[12px]">aquasense-config-{form.deviceId}.json</code> file above.</> },
                    { icon: 'folder_open', text: <>Place it in the <code className="bg-surface-container px-1 rounded text-[12px]">/data</code> folder of your ESP32 Arduino or PlatformIO project.</> },
                    { icon: 'upload', text: <>Use the <strong className="text-on-surface">ESP32 Sketch Data Upload</strong> tool (Arduino IDE) or <code className="bg-surface-container px-1 rounded text-[12px]">pio run --target uploadfs</code> to flash the filesystem.</> },
                    { icon: 'flash_on', text: 'Upload the firmware sketch to the device.' },
                    { icon: 'power', text: 'Power on the device. It will read the config, connect to your WiFi, and begin sending telemetry.' },
                    { icon: 'dashboard', text: 'Return to your dashboard — readings will appear within seconds of the device connecting.' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">
                        {i + 1}
                      </div>
                      <span className="flex-1 text-sm">{item.text}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Summary card */}
              <div className="rounded-lg bg-surface-container p-4 space-y-1 text-sm">
                <p className="text-label-sm font-bold text-on-surface mb-2">Configuration summary</p>
                <Row label="Pond"      value={form.pondName} />
                <Row label="Device ID" value={form.deviceId} mono />
                <Row label="WiFi SSID" value={form.wifiSsid} />
                <Row label="MQTT"      value={form.mqttUrl} mono />
                <Row label="Topic"     value={`${form.topicPrefix || 'aquaguard'}/${form.deviceId}/telemetry`} mono />
              </div>

              <button onClick={finish}
                      className="w-full bg-primary text-on-primary py-2.5 rounded-lg text-label-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <Icon name="dashboard" size={16} />
                Go to my dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold shrink-0">{label}</span>
      <span className={`text-[12px] text-on-surface truncate ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}
