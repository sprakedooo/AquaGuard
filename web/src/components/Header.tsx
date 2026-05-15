import { useAuth } from '../auth/AuthProvider';
import { useUI }   from '../ui/UIProvider';
import Icon from './Icon';
import DevicePicker from './DevicePicker';
import { useState, useEffect } from 'react';

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Header({ onGotoPonds }: { onGotoPonds?: () => void }) {
  const { user } = useAuth();
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar } = useUI();
  const now = useClock();

  return (
    <header className="sticky top-0 z-40 bg-surface-bright shadow-sm border-b border-outline-variant/40">

      {/* ── Mobile-only top strip: logo + clock ── */}
      <div className="md:hidden flex items-center justify-between px-4 pt-3 pb-1"
           style={{ backgroundImage: 'linear-gradient(90deg, #001428 0%, #003366 100%)' }}>
        <img src="/aquasense-wordmark.svg" alt="AquaSense" height={32}
             style={{ filter: 'brightness(0) invert(1)', maxWidth: '160px' }} />
        <div className="text-right select-none">
          <p className="text-[15px] font-semibold text-white tabular-nums leading-tight">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-[10px] text-white/60 uppercase tracking-wider">
            {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ── Main toolbar row (desktop: single row, mobile: second row) ── */}
      <div className="flex justify-between items-center w-full px-4 md:px-margin-page h-14 md:h-16">
        <div className="flex items-center gap-1 md:gap-2 min-w-0">
          {/* Sidebar toggle — desktop only */}
          <button onClick={toggleSidebar}
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  className="hidden md:flex p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors">
            <Icon name={sidebarCollapsed ? 'menu' : 'menu_open'} />
          </button>
          <DevicePicker onAddNew={onGotoPonds} />
        </div>

        {/* Clock — hide at tablet when sidebar is expanded to avoid overlap */}
        <div className={`${sidebarCollapsed ? 'hidden md:flex' : 'hidden lg:flex'} flex-col items-center px-4 select-none`}>
          <span className="text-data-tabular font-semibold text-on-surface tabular-nums tracking-tight">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">
            {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <button onClick={toggleTheme}
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors">
            <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} />
          </button>

          <div className="flex items-center gap-2 ml-1 md:ml-2 pl-2 md:pl-4 border-l border-outline-variant">
            {/* Email + role — hidden on small screens */}
            <div className="hidden sm:block text-right">
              <p className="text-label-sm text-on-surface">{user?.email}</p>
              <p className="text-[10px] text-on-surface-variant uppercase font-bold">
                Owner
              </p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold border-2 border-secondary text-sm md:text-base">
              {(user?.email ?? '?').slice(0, 1).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

    </header>
  );
}
