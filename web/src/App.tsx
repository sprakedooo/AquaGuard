import { useAuth } from './auth/AuthProvider';
import Login from './auth/Login';
import Dashboard from './components/Dashboard';
import { DEFAULT_DEVICE_ID } from './firebase';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center text-slate-500">Loading…</div>
    );
  }
  if (!user) return <Login />;
  return <Dashboard deviceId={DEFAULT_DEVICE_ID} />;
}
