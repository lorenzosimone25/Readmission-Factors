import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { hasReadmissionBackend } from '@/features/readmission/api/readmissionApi';
import { clearAuthToken, getAuthToken, setAuthToken } from '@/services/authStorage';
import { fetchJson, postJson } from '@/services/api';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  reviewerId: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type UserDto = {
  id: string;
  email: string;
  displayName: string;
  role: string;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const backend = hasReadmissionBackend();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(backend);

  const loadMe = useCallback(async () => {
    if (!backend || !getAuthToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await fetchJson<UserDto>('/auth/me');
      setUser({
        id: me.id,
        email: me.email,
        displayName: me.displayName,
        role: me.role,
      });
    } catch {
      clearAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { access_token } = await postJson<{ access_token: string }>('/auth/login', {
        email,
        password,
      });
      setAuthToken(access_token);
      await loadMe();
    },
    [loadMe],
  );

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
  }, []);

  const reviewerId = user?.id ?? 'clinician-demo-01';

  const value = useMemo(
    () => ({ user, loading, login, logout, reviewerId }),
    [user, loading, login, logout, reviewerId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
