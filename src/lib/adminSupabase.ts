import { createClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLIC_ANON_KEY, SUPABASE_PUBLIC_URL } from '@/lib/supabase';

// Cliente del PANEL ADMIN. No habla con Supabase directo: apunta al proxy
// same-origin /api/sb, que lee la sesión de la cookie httpOnly, pone el token
// y reenvía. Así el JavaScript del navegador nunca tiene el access/refresh
// token. La anon key va solo porque supabase-js exige una; el proxy la ignora
// y usa la suya.
export const ADMIN_API_BASE = '/api/sb';

export const SESSION_EXPIRED_EVENT = 'admin-session-expired';

const fetchWithSessionWatch: typeof fetch = async (input, init) => {
  const response = await fetch(input, { credentials: 'same-origin', ...init });
  // 401 del proxy = la cookie ya no sirve (expiró o se revocó): avisa al
  // AuthContext para que mande al login en vez de dejar la pantalla rota.
  if (response.status === 401) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  return response;
};

export const adminSupabase = createClient(`${window.location.origin}${ADMIN_API_BASE}`, SUPABASE_PUBLIC_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: fetchWithSessionWatch },
});

// Para las Edge Functions que el panel llama con fetch (generate-draft,
// search-images, manage-editors, fix-article-images), también vía el proxy.
export function adminFunctionFetch(name: string, init?: RequestInit & { query?: string }): Promise<Response> {
  const { query, ...rest } = init ?? {};
  return fetchWithSessionWatch(`${ADMIN_API_BASE}/functions/v1/${name}${query ?? ''}`, rest);
}

// URL pública real de Storage (no la del proxy): es la que se guarda en la base.
export function publicStorageUrl(bucket: string, path: string): string {
  return `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/${bucket}/${path}`;
}
