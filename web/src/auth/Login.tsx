import { useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login() {
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
    <div className="min-h-full flex items-center justify-center p-6 bg-slate-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">AquaGuard</h1>
          <p className="text-sm text-slate-500">Sign in to your dashboard</p>
        </div>
        <label className="block">
          <span className="text-sm">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                 className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">Password</span>
          <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)}
                 className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
        </label>
        {err && <p className="text-sm text-crit">{err}</p>}
        <button disabled={busy} type="submit"
                className="w-full bg-slate-900 text-white py-2 rounded hover:bg-slate-800 disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
