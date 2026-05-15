import { useEffect, useState } from 'react';
import { useAuth } from './auth/AuthProvider';
import Login from './auth/Login';
import Dashboard from './components/Dashboard';
import OnboardingWizard from './onboarding/OnboardingWizard';
import { useDevices } from './hooks/useDevices';

/** Shown only after the user is authenticated — decides whether to
 *  show the onboarding wizard or the main dashboard. */
function AuthenticatedApp() {
  const { devices, loaded } = useDevices();

  // Lock in the routing decision once on first load.
  // We never let a mid-session device write (step 2 of onboarding) kick us
  // back to the dashboard — only the user's explicit "Go to dashboard" does.
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (loaded && needsOnboarding === null) {
      setNeedsOnboarding(devices.length === 0);
    }
  }, [loaded, devices.length, needsOnboarding]);

  if (!loaded || needsOnboarding === null) {
    return (
      <div className="min-h-full flex items-center justify-center text-on-surface-variant">
        Loading…
      </div>
    );
  }

  if (needsOnboarding) {
    return <OnboardingWizard onFinish={() => setNeedsOnboarding(false)} />;
  }
  return <Dashboard />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center text-on-surface-variant">
        Loading…
      </div>
    );
  }

  if (!user) return <Login />;
  return <AuthenticatedApp />;
}
