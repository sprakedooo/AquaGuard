import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import Icon from './Icon';

interface Props {
  /** Show only the icon (no inline label). Pair with showLabel for custom label rendering. */
  iconOnly?: boolean;
  /** When iconOnly, optionally render a label below the icon (e.g. bottom nav) */
  showLabel?: boolean;
  /** Extra classes on the trigger button */
  className?: string;
}

export default function SignOutButton({ iconOnly, showLabel, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try { await signOut(auth); }
    finally { setBusy(false); setOpen(false); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} title={iconOnly && !showLabel ? 'Sign out' : undefined}
              className={className}>
        <Icon name="logout" size={22} />
        {!iconOnly && <span className="text-label-sm whitespace-nowrap">Sign out</span>}
        {iconOnly && showLabel && <span>Sign out</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
             onClick={() => !busy && setOpen(false)}>
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container-high
                          w-full max-w-sm p-6 space-y-4"
               onClick={(e) => e.stopPropagation()}>

            {/* Icon + title */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center">
                <Icon name="logout" size={24} className="text-on-error-container" />
              </div>
              <div>
                <h3 className="text-headline-sm font-bold text-on-surface">Sign out?</h3>
                <p className="text-body-md text-on-surface-variant mt-1">
                  You'll need to sign in again to access your dashboard.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setOpen(false)} disabled={busy}
                      className="flex-1 py-2.5 rounded-lg border border-outline-variant text-label-sm
                                 text-on-surface hover:bg-surface-container-high disabled:opacity-50 transition-colors">
                Cancel
              </button>
              <button onClick={confirm} disabled={busy}
                      className="flex-1 py-2.5 rounded-lg bg-error text-on-error text-label-sm font-semibold
                                 hover:opacity-90 disabled:opacity-50 transition-opacity">
                {busy ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
