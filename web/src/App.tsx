import { useAuth } from './auth/AuthProvider';
import Login from './auth/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center text-on-surface-variant">Loading…</div>
    );
  }
  if (!user) return <Login />;
  return <Dashboard />;
}
