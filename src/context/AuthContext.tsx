import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi, AuthApiError, type AuthStatus } from '@/lib/authApi';
import { SESSION_EXPIRED_EVENT } from '@/lib/adminSupabase';

interface AalInfo {
  current: string | null;
  next: string | null;
}

export type MfaFactor = AuthStatus['factors'][number];

interface AuthContextType {
  user: AuthStatus['user'] | null;
  // true si la cuenta está en la tabla editors (validado en el servidor).
  isEditor: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  // Estado de verificación en dos pasos (TOTP) de la sesión actual.
  aal: AalInfo | null;
  mfaFactors: MfaFactor[];
  mfaLoading: boolean;
  refreshMfa: () => Promise<void>;
  verifyMfa: (code: string, factorId?: string) => Promise<{ error: string | null }>;
  applyStatus: (status: AuthStatus | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// La sesión vive en cookies httpOnly: aquí solo se guarda lo que el servidor
// dice de ella (quién es, si es editor, nivel aal). Se revalida al abrir, al
// volver a la pestaña y cada pocos minutos — esas llamadas también hacen que el
// servidor refresque el token y renueve las cookies antes de que expire.
const REVALIDATE_MS = 4 * 60 * 1000;

// Las cookies httpOnly no se pueden leer desde JS, así que sin una pista el
// sitio público le preguntaría al servidor "¿hay sesión?" en cada visita.
// Esta marca (sin ningún token, solo "hubo login") evita esa llamada a los
// visitantes normales; en las rutas del panel siempre se pregunta.
const HINT_KEY = 'admin_session_hint';
const ADMIN_PATH_PREFIX = '/panel-8f3k2qx9';

function mayHaveSession(): boolean {
  if (window.location.pathname.startsWith(ADMIN_PATH_PREFIX)) return true;
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function setHint(on: boolean) {
  try {
    if (on) localStorage.setItem(HINT_KEY, '1');
    else localStorage.removeItem(HINT_KEY);
  } catch {
    /* sin localStorage */
  }
}

function loginErrorMessage(err: unknown): string {
  if (err instanceof AuthApiError) {
    if (err.code === 'invalid_credentials') return 'Correo o contraseña incorrectos.';
    if (err.code === 'not_editor') return 'Esta cuenta no tiene acceso al panel.';
  }
  return err instanceof Error ? err.message : 'No se pudo iniciar sesión';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const applyStatus = useCallback((next: AuthStatus | null) => {
    setHint(next !== null);
    setStatus(next);
    setLoading(false);
  }, []);

  const refreshMfa = useCallback(async () => {
    try {
      applyStatus(await authApi.getSession());
    } catch {
      /* sin red: se conserva el último estado conocido */
    }
  }, [applyStatus]);

  useEffect(() => {
    if (!mayHaveSession()) {
      setLoading(false);
      return;
    }
    authApi
      .getSession()
      .then(applyStatus)
      .catch(() => applyStatus(null));
  }, [applyStatus]);

  useEffect(() => {
    if (!status) return;
    const revalidate = () => {
      if (document.visibilityState === 'visible') refreshMfa();
    };
    const timer = window.setInterval(revalidate, REVALIDATE_MS);
    document.addEventListener('visibilitychange', revalidate);
    window.addEventListener('focus', revalidate);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', revalidate);
      window.removeEventListener('focus', revalidate);
    };
  }, [status?.user.id, refreshMfa]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onExpired = () => {
      authApi
        .getSession()
        .then(applyStatus)
        .catch(() => applyStatus(null));
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [applyStatus]);

  const signIn = async (email: string, password: string) => {
    try {
      applyStatus(await authApi.login(email, password));
      return { error: null };
    } catch (err) {
      return { error: loginErrorMessage(err) };
    }
  };

  const verifyMfa = async (code: string, factorId?: string) => {
    try {
      applyStatus(await authApi.mfaVerify(code, factorId));
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Código incorrecto' };
    }
  };

  const signOut = async () => {
    try {
      await authApi.logout();
    } finally {
      applyStatus(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: status?.user ?? null,
        isEditor: status?.isEditor ?? false,
        loading,
        signIn,
        signOut,
        aal: status?.aal ?? null,
        mfaFactors: status?.factors ?? [],
        mfaLoading: loading,
        refreshMfa,
        verifyMfa,
        applyStatus,
      }}
    >
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
