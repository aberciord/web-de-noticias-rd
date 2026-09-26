// Cliente de las funciones de sesión (api/auth/*). El navegador nunca ve los
// tokens: viajan en cookies httpOnly que el navegador manda solo, por eso cada
// llamada es same-origin y sin manejar ningún Authorization.
export interface AuthStatus {
  user: { id: string; email: string | null };
  isEditor: boolean;
  aal: { current: string | null; next: string | null };
  factors: { id: string; status: string; factor_type: string; friendly_name: string | null }[];
}

export class AuthApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  let data: Record<string, unknown> = {};
  try {
    data = await response.json();
  } catch {
    /* respuesta sin JSON */
  }
  if (!response.ok) {
    throw new AuthApiError(String(data.error ?? 'internal_error'), response.status, data.message as string | undefined);
  }
  return data as T;
}

const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const authApi = {
  // Devuelve null si no hay sesión válida (o ya no se pudo refrescar).
  async getSession(): Promise<AuthStatus | null> {
    const data = await request<AuthStatus | { user: null }>('/api/auth/session');
    return data.user ? (data as AuthStatus) : null;
  },
  login: (email: string, password: string) => post<AuthStatus>('/api/auth/login', { email, password }),
  logout: () => post<{ ok: true }>('/api/auth/logout', {}),
  mfaEnroll: () => post<{ factorId: string; qrCode: string; secret: string }>('/api/auth/mfa', { action: 'enroll' }),
  mfaVerify: (code: string, factorId?: string) => post<AuthStatus>('/api/auth/mfa', { action: 'verify', code, factorId }),
  mfaUnenroll: (factorId: string) => post<AuthStatus>('/api/auth/mfa', { action: 'unenroll', factorId }),
};
