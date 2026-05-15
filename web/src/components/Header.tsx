import { useAuth } from '../auth/AuthProvider';
import { useUI }   from '../ui/UIProvider';
import Icon from './Icon';
import DevicePicker from './DevicePicker';

export default function Header({ onGotoPonds }: { onGotoPonds?: () => void }) {
  const { user, isAdmin } = useAuth();
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar } = useUI();

  return (
    <header className="flex justify-between items-center w-full px-margin-page h-16 sticky top-0 z-40 bg-surface-bright shadow-sm border-b border-outline-variant/40">
      <div className="flex items-center gap-2">
        <button onClick={toggleSidebar}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors">
          <Icon name={sidebarCollapsed ? 'menu_open' : 'menu'} />
        </button>
        <DevicePicker onAddNew={onGotoPonds} />
      </div>

      <div className="flex items-center gap-2">
        <button onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors">
          <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} />
        </button>
        <button className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant relative transition-colors">
          <Icon name="notifications" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
        </button>
        <div className="flex items-center gap-3 ml-2 pl-4 border-l border-outline-variant">
          <div className="text-right">
            <p className="text-label-sm text-on-surface">{user?.email}</p>
            <p className="text-[10px] text-on-surface-variant uppercase font-bold">
              {isAdmin ? 'Admin' : 'Read-only'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold border-2 border-secondary">
            {(user?.email ?? '?').slice(0, 1).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
