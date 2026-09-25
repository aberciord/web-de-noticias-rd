import type { SessionClient } from './session.js';

export interface AuthStatus {
  user: { id: string; email: string | null };
  isEditor: boolean;
  aal: { current: string | null; next: string | null };
  factors: { id: string; status: string; factor_type: string; friendly_name: string | null }[];
}

// Estado de la sesión que ve el panel: quién es, si está en la tabla editors
// (el mismo chequeo de is_editor() que ya existía, ahora del lado servidor),
// y en qué nivel de verificación está (aal1/aal2) con sus factores TOTP.
export async function buildStatus(supabase: SessionClient): Promise<AuthStatus | null> {
  // getUser() valida el token contra Supabase y, si expiró, lo refresca con el
  // refresh token de la cookie (la librería llama a setAll con las nuevas).
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const user = data.user;

  const [{ data: aal }, { data: factors }, { data: editor }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
    supabase.from('editors').select('id').eq('id', user.id).maybeSingle(),
  ]);

  return {
    user: { id: user.id, email: user.email ?? null },
    isEditor: !!editor,
    aal: { current: aal?.currentLevel ?? null, next: aal?.nextLevel ?? null },
    // `all` (no `totp`): incluye también los factores aún sin verificar, que
    // hacen falta para terminar de activar uno recién creado.
    factors: (factors?.all ?? []).filter((f) => f.factor_type === 'totp').map((f) => ({
      id: f.id,
      status: f.status,
      factor_type: f.factor_type,
      friendly_name: f.friendly_name ?? null,
    })),
  };
}
