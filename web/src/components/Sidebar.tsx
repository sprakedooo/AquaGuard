import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useUI } from '../ui/UIProvider';
import Icon from './Icon';

export type Section = 'dashboard' | 'ponds' | 'calibration' | 'thresholds' | 'alerts';

interface Props {
  active: Section;
  onChange: (s: Section) => void;
}

interface Item { id: Section; icon: string; label: string; }

const ITEMS: Item[] = [
  { id: 'dashboard',   icon: 'dashboard',   label: 'Dashboard' },
  { id: 'ponds',       icon: 'water',       label: 'Ponds' },
  { id: 'calibration', icon: 'tune',        label: 'Calibration' },
  { id: 'thresholds',  icon: 'instant_mix', label: 'Thresholds' },
  { id: 'alerts',      icon: 'warning',     label: 'Alerts' },
];

export default function Sidebar({ active, onChange }: Props) {
  const { sidebarCollapsed: collapsed } = useUI();
  const width = collapsed ? 'w-sidebar-collapsed' : 'w-sidebar-width';

  return (
    <aside className={`fixed left-0 top-0 h-full ${width} flex flex-col p-unit border-r border-white/5 z-50 transition-all duration-200 text-white`}
           style={{
             backgroundImage: 'linear-gradient(180deg, #001428 0%, #001e40 35%, #003366 100%)',
           }}>
      <div className={`flex items-center gap-3 px-3 py-6 ${collapsed ? 'justify-center' : ''}`}>
        {collapsed ? (
          <div className="w-10 h-10 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center shrink-0 ring-1 ring-white/20">
            <img src="/aquasense-mark.svg" alt="AquaSense" width={28} height={28}
                 style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
        ) : (
          <img src="/aquasense-wordmark.svg" alt="AquaSense" height={44}
               style={{ filter: 'brightness(0) invert(1)', maxWidth: '210px' }} />
        )}
      </div>

      <nav className="flex-1 mt-4 space-y-1">
        {ITEMS.map((it) => {
          const isActive = it.id === active;
          return (
            <button key={it.id} onClick={() => onChange(it.id)}
                    title={collapsed ? it.label : undefined}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      collapsed ? 'justify-center' : ''
                    } ${
                      isActive
                        ? 'bg-white/10 text-[#79f6ed] font-bold ring-1 ring-white/10'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}>
              <Icon name={it.icon} filled={isActive} />
              {!collapsed && <span className="text-label-sm whitespace-nowrap">{it.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="space-y-1 pt-4 border-t border-white/10">
        <button onClick={() => signOut(auth)}
                title={collapsed ? 'Sign out' : undefined}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all ${
                  collapsed ? 'justify-center' : ''
                }`}>
          <Icon name="logout" />
          {!collapsed && <span className="text-label-sm whitespace-nowrap">Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
