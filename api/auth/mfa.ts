import { createSessionClient } from '../_lib/session.js';
import { buildStatus } from '../_lib/status.js';
import { isSameOrigin, json, readJson } from '../_lib/http.js';

// 2FA (TOTP) con la sesión de las cookies. Acciones:
//  - enroll:   crea un factor nuevo y devuelve el QR + el código manual.
//  - verify:   {code, factorId?} verifica el código (challenge + verify). Sirve
//              para activar un factor recién creado y para el login (sube la
//              sesión de aal1 a aal2; las cookies nuevas viajan en la respuesta).
//  - unenroll: {factorId} quita el factor (Supabase exige estar en aal2).
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return json({ error: 'forbidden_origin' }, 403);

  const body = await readJson(request);
  const action = body?.action;
  const { supabase, applyTo } = createSessionClient(request);

  const status = await buildStatus(supabase);
  if (!status) return applyTo(json({ error: 'no_session' }, 401));
  if (!status.isEditor) return applyTo(json({ error: 'not_editor' }, 403));

  if (action === 'enroll') {
    // Limpia factores sin verificar de un intento anterior.
    for (const f of status.factors.filter((f) => f.status === 'unverified')) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error || !data) return applyTo(json({ error: 'enroll_failed', message: error?.message }, 400));
    return applyTo(json({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }));
  }

  if (action === 'verify') {
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!/^\d{6}$/.test(code)) return applyTo(json({ error: 'invalid_code_format' }, 400));

    let factorId = typeof body?.factorId === 'string' ? body.factorId : null;
    if (factorId && !status.factors.some((f) => f.id === factorId)) {
      return applyTo(json({ error: 'unknown_factor' }, 400));
    }
    if (!factorId) factorId = status.factors.find((f) => f.status === 'verified')?.id ?? null;
    if (!factorId) return applyTo(json({ error: 'no_factor' }, 400));

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) return applyTo(json({ error: 'invalid_code', message: error.message }, 400));

    const fresh = await buildStatus(supabase);
    return applyTo(json(fresh ?? { error: 'internal_error' }, fresh ? 200 : 500));
  }

  if (action === 'unenroll') {
    const factorId = typeof body?.factorId === 'string' ? body.factorId : '';
    if (!status.factors.some((f) => f.id === factorId)) return applyTo(json({ error: 'unknown_factor' }, 400));
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) return applyTo(json({ error: 'unenroll_failed', message: error.message }, 400));
    const fresh = await buildStatus(supabase);
    return applyTo(json(fresh ?? { error: 'internal_error' }, fresh ? 200 : 500));
  }

  return applyTo(json({ error: 'unknown_action' }, 400));
}
