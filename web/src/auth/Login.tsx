import { useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useUI } from '../ui/UIProvider';

export default function Login() {
  const { theme } = useUI();
  const [email, setEmail] = useState('');
  const [pw, setPw]       = useState('');
  const [err, setErr]     = useState('');
  const [busy, setBusy]   = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await signInWithEmailAndPassword(auth, email, pw);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-background">
      <form onSubmit={onSubmit}
            className="w-full max-w-sm bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant p-8 space-y-5">
        <div className="flex flex-col items-center gap-4 pb-2">
          <img src="/aquasense-wordmark.svg" alt="AquaSense" height={56}
               style={theme === 'dark' ? { filter: 'brightness(0) invert(1)' } : undefined} />
          <p className="text-label-sm text-on-surface-variant">Sign in to your dashboard</p>
        </div>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                 className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md focus:outline-none focus:border-secondary" />
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Password</span>
          <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)}
                 className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md focus:outline-none focus:border-secondary" />
        </label>

        {err && <p className="text-label-sm text-error">{err}</p>}

        <button disabled={busy} type="submit"
                className="w-full bg-primary text-on-primary py-2.5 rounded-lg text-label-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
