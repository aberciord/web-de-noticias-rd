import { createSessionClient } from '../_lib/session.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../_lib/config.js';
import { isSameOrigin, isSafeMethod, json, NO_STORE } from '../_lib/http.js';

// Proxy autenticado del panel: el navegador ya no tiene el token (vive en una
// cookie httpOnly), así que sus llamadas a Supabase pasan por aquí. Se lee la
// sesión de la cookie (refrescándola si expiró), se pone el access token como
// Authorization y se reenvía. RLS y las Edge Functions siguen decidiendo quién
// puede qué, exactamente igual que antes.
//
// Solo se reenvían las rutas que el panel realmente usa.
const ALLOWED_PATHS: RegExp[] = [
  /^rest\/v1\/[A-Za-z0-9_]+$/,
  /^rest\/v1\/rpc\/[A-Za-z0-9_]+$/,
  /^storage\/v1\/object\/article-images\/[^/]+$/,
  /^functions\/v1\/(generate-draft|search-images|manage-editors|fix-article-images)$/,
];

const FORWARD_REQUEST_HEADERS = [
  'content-type',
  'accept',
  'prefer',
  'range',
  'x-upsert',
  'cache-control',
  'content-profile',
  'accept-profile',
  'x-client-info',
];

const FORWARD_RESPONSE_HEADERS = ['content-type', 'content-range', 'range-unit', 'location', 'etag'];

async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = decodeURIComponent(url.pathname.replace(/^\/api\/sb\//, ''));

  if (!ALLOWED_PATHS.some((re) => re.test(path)) || path.includes('..')) {
    return json({ error: 'path_not_allowed' }, 403);
  }
  if (!isSafeMethod(request.method) && !isSameOrigin(request)) {
    return json({ error: 'forbidden_origin' }, 403);
  }

  const { supabase, applyTo } = createSessionClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return applyTo(json({ error: 'no_session' }, 401));

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Se ignora cualquier Authorization/apikey que mande el navegador.
  headers.set('apikey', SUPABASE_ANON_KEY);
  headers.set('Authorization', `Bearer ${session.access_token}`);

  let upstream: Response;
  try {
    upstream = await fetch(`${SUPABASE_URL}/${path}${url.search}`, {
      method: request.method,
      headers,
      body: isSafeMethod(request.method) ? undefined : await request.arrayBuffer(),
    });
  } catch {
    return applyTo(json({ error: 'upstream_unreachable' }, 502));
  }

  const responseHeaders = new Headers({ 'Cache-Control': NO_STORE });
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  const noBody = request.method === 'HEAD' || upstream.status === 204 || upstream.status === 304;
  return applyTo(new Response(noBody ? null : upstream.body, { status: upstream.status, headers: responseHeaders }));
}

export const GET = handler;
export const HEAD = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
