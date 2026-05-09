import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../auth/AuthProvider';

export default function Header({ deviceId }: { deviceId: string }) {
  const { user, isAdmin } = useAuth();
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold">AquaGuard</h1>
          <span className="text-sm text-slate-500">/ {deviceId}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-600">{user?.email}</span>
          {isAdmin && <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">admin</span>}
          <button onClick={() => signOut(auth)}
                  className="text-slate-500 hover:text-slate-900">Sign out</button>
        </div>
      </div>
    </header>
  );
}
