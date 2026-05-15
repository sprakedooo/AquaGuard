import Icon from './Icon';
import SignOutButton from './SignOutButton';
import type { Section } from './Sidebar';

interface Props {
  active: Section;
  onChange: (s: Section) => void;
}

interface Item { id: Section; icon: string; label: string; }

const ITEMS: Item[] = [
  { id: 'dashboard',   icon: 'dashboard',   label: 'Home'       },
  { id: 'ponds',       icon: 'water',       label: 'Ponds'      },
  { id: 'thresholds',  icon: 'instant_mix', label: 'Thresholds' },
  { id: 'alerts',      icon: 'warning',     label: 'Alerts'     },
  { id: 'calibration', icon: 'tune',        label: 'Calibrate'  },
];

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t border-white/10 safe-area-inset-bottom"
      style={{ backgroundImage: 'linear-gradient(180deg, #001e40 0%, #001428 100%)' }}
    >
      {ITEMS.map((it) => {
        const isActive = it.id === active;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold tracking-wide transition-colors ${
              isActive ? 'text-[#79f6ed]' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Icon name={it.icon} size={22} filled={isActive} />
            <span>{it.label}</span>
          </button>
        );
      })}

      {/* Sign-out sits at the far right */}
      <SignOutButton
        iconOnly
        showLabel
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold tracking-wide text-white/50 hover:text-white/80 transition-colors"
      />
    </nav>
  );
}
