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
import { getSupabase, type ProfileRow } from '@/lib/supabaseClient';

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

async function loadProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error) return null;
  return data as ProfileRow | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const backend = hasReadmissionBackend();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(backend);

  const hydrateUser = useCallback(async (userId: string, email: string) => {
    const profile = await loadProfile(userId);
    setUser({
      id: userId,
      email,
      displayName: profile?.display_name || email,
      role: profile?.role || 'reviewer',
    });
  }, []);

  useEffect(() => {
    if (!backend) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    let mounted = true;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        void hydrateUser(session.user.id, session.user.email ?? '').finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        void hydrateUser(session.user.id, session.user.email ?? '');
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [backend, hydrateUser]);

  const login = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Login failed');
    await hydrateUser(data.user.id, data.user.email ?? email);
  }, [hydrateUser]);

  const logout = useCallback(() => {
    void getSupabase().auth.signOut();
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
