import { createSessionClient } from '../_lib/session.js';
import { buildStatus } from '../_lib/status.js';
import { isSameOrigin, json, readJson } from '../_lib/http.js';

// Paso 1 del login: email + contraseña. Si son válidos, las cookies httpOnly
// quedan con la sesión (nivel aal1). Si el editor tiene 2FA, el panel pide el
// código y lo verifica en /api/auth/mfa (que sube la sesión a aal2).
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return json({ error: 'forbidden_origin' }, 403);

  const body = await readJson(request);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password || email.length > 254 || password.length > 1024) {
    return json({ error: 'invalid_request' }, 400);
  }

  const { supabase, applyTo, clearAllAuthCookies } = createSessionClient(request);

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return applyTo(json({ error: 'invalid_credentials', message: error.message }, 401));

  const status = await buildStatus(supabase);
  if (!status) return applyTo(json({ error: 'internal_error' }, 500));

  // Una cuenta que no está en la tabla editors no debe quedar con sesión.
  if (!status.isEditor) {
    await supabase.auth.signOut();
    clearAllAuthCookies();
    return applyTo(json({ error: 'not_editor' }, 403));
  }

  return applyTo(json(status));
}
