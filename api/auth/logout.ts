import { createSessionClient } from '../_lib/session.js';
import { isSameOrigin, json } from '../_lib/http.js';

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return json({ error: 'forbidden_origin' }, 403);

  const { supabase, applyTo, clearAllAuthCookies } = createSessionClient(request);
  try {
    await supabase.auth.signOut();
  } catch {
    /* si Supabase no responde, igual se borran las cookies locales */
  }
  clearAllAuthCookies();
  return applyTo(json({ ok: true }));
}
