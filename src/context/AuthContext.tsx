import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthenticatorAssuranceLevels, Factor, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AalInfo {
  current: AuthenticatorAssuranceLevels | null;
  next: AuthenticatorAssuranceLevels | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  // Estado de verificación en dos pasos (TOTP) de la sesión actual.
  aal: AalInfo | null;
  mfaFactors: Factor[];
  mfaLoading: boolean;
  refreshMfa: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [aal, setAal] = useState<AalInfo | null>(null);
  const [mfaFactors, setMfaFactors] = useState<Factor[]>([]);
  const [mfaLoading, setMfaLoading] = useState(true);

  const refreshMfa = async () => {
    setMfaLoading(true);
    const [{ data: aalData }, { data: factorsData }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
    setAal(aalData ? { current: aalData.currentLevel, next: aalData.nextLevel } : null);
    setMfaFactors(factorsData?.totp ?? []);
    setMfaLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sessionState) => {
      setSession(sessionState);
      setUser(sessionState?.user ?? null);
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setAal(null);
      setMfaFactors([]);
      setMfaLoading(false);
      return;
    }
    refreshMfa();
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signOut, aal, mfaFactors, mfaLoading, refreshMfa }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
