import { useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useUI } from '../ui/UIProvider';

function authError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export default function Login() {
  const { theme } = useUI();
  const [mode, setMode]     = useState<'login' | 'signup'>('login');
  const [email, setEmail]   = useState('');
  const [pw, setPw]         = useState('');
  const [pw2, setPw2]       = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr]       = useState('');
  const [busy, setBusy]     = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (mode === 'signup' && pw !== pw2) { setErr('Passwords do not match.'); return; }
    if (mode === 'signup' && pw.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, pw);
      } else {
        await createUserWithEmailAndPassword(auth, email, pw);
      }
    } catch (e: unknown) {
      setErr(authError(e));
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md focus:outline-none focus:border-secondary';
  const labelCls = 'block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1';

  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-background">
      <form onSubmit={onSubmit}
            className="w-full max-w-sm bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant p-8 space-y-5">

        {/* Logo + tagline */}
        <div className="flex flex-col items-center gap-3 pb-2">
          <img src="/aquasense-wordmark.svg" alt="AquaSense" height={52}
               style={theme === 'dark' ? { filter: 'brightness(0) invert(1)' } : undefined} />
          <p className="text-label-sm text-on-surface-variant">
            {mode === 'login' ? 'Sign in to your dashboard' : 'Create your AquaSense account'}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-lg overflow-hidden border border-outline-variant text-[11px] font-semibold">
          <button type="button" onClick={() => { setMode('login'); setErr(''); }}
                  className={`flex-1 py-2 transition-colors ${mode === 'login'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}>
            Sign In
          </button>
          <button type="button" onClick={() => { setMode('signup'); setErr(''); }}
                  className={`flex-1 py-2 transition-colors ${mode === 'signup'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}>
            Create Account
          </button>
        </div>

        {/* Email */}
        <label className="block">
          <span className={labelCls}>Email</span>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
        </label>

        {/* Password */}
        <label className="block">
          <span className={labelCls}>Password</span>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} required value={pw}
                   onChange={e => setPw(e.target.value)} className={`${inputCls} pr-14`} />
            <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[11px] font-semibold hover:text-on-surface">
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        {/* Confirm password — sign-up only */}
        {mode === 'signup' && (
          <label className="block">
            <span className={labelCls}>Confirm Password</span>
            <input type={showPw ? 'text' : 'password'} required value={pw2}
                   onChange={e => setPw2(e.target.value)} className={inputCls} />
          </label>
        )}

        {err && <p className="text-label-sm text-error">{err}</p>}

        <button disabled={busy} type="submit"
                className="w-full bg-primary text-on-primary py-2.5 rounded-lg text-label-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
          {busy
            ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
            : (mode === 'login' ? 'Sign in' : 'Create account & continue →')}
        </button>

        {mode === 'signup' && (
          <p className="text-[10px] text-on-surface-variant text-center leading-relaxed">
            After creating your account you'll be guided through setting up your first monitoring station.
          </p>
        )}
      </form>
    </div>
  );
}
