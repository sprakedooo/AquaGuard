import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebase';

interface AuthCtx {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
}

const Ctx = createContext<AuthCtx>({ user: null, isAdmin: false, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u);
    if (u) {
      const tok = await u.getIdTokenResult();
      setIsAdmin(tok.claims.admin === true);
    } else {
      setIsAdmin(false);
    }
    setLoading(false);
  }), []);

  return <Ctx.Provider value={{ user, isAdmin, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
