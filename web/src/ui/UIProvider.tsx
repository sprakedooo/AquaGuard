import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_DEVICE_ID } from '../firebase';

type Theme = 'light' | 'dark';

interface UICtx {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  currentDeviceId: string;
  setCurrentDeviceId: (id: string) => void;
}

const Ctx = createContext<UICtx | null>(null);

const PREF_KEY = 'aquaguard:ui';

interface Prefs {
  theme: Theme;
  sidebarCollapsed: boolean;
  currentDeviceId: string;
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      return {
        theme: p.theme === 'dark' ? 'dark' : 'light',
        sidebarCollapsed: !!p.sidebarCollapsed,
        currentDeviceId: p.currentDeviceId || DEFAULT_DEVICE_ID,
      };
    }
  } catch { /* ignore */ }
  const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return { theme: dark ? 'dark' : 'light', sidebarCollapsed: false, currentDeviceId: DEFAULT_DEVICE_ID };
}

function savePrefs(p: Prefs) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function UIProvider({ children }: { children: ReactNode }) {
  const init = loadPrefs();
  const [theme,     setThemeState]     = useState<Theme>(init.theme);
  const [collapsed, setCollapsed]      = useState<boolean>(init.sidebarCollapsed);
  const [deviceId,  setDeviceIdState]  = useState<string>(init.currentDeviceId);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    savePrefs({ theme, sidebarCollapsed: collapsed, currentDeviceId: deviceId });
  }, [theme, collapsed, deviceId]);

  const value: UICtx = {
    theme,
    setTheme: setThemeState,
    toggleTheme: () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
    sidebarCollapsed: collapsed,
    toggleSidebar: () => setCollapsed((c) => !c),
    currentDeviceId: deviceId,
    setCurrentDeviceId: setDeviceIdState,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUI() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUI must be used inside <UIProvider>');
  return v;
}
