import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SESSION_MAX_AGE } from './config.js';
import { isSecureRequest, NO_STORE } from './http.js';

// Cliente de Supabase que lee y escribe la sesión en cookies HTTPONLY. Patrón
// oficial de @supabase/ssr para servidor (getAll/setAll): la librería refresca
// el token cuando expira y nos entrega las cookies nuevas en setAll; aquí se
// fuerzan HttpOnly + Secure + SameSite=Lax y se aplican a la respuesta.
export function createSessionClient(request: Request) {
  const secure = isSecureRequest(request);
  const cacheHeaders: Record<string, string> = {};

  // Estado "vivo" de las cookies durante ESTA petición: lo que mandó el
  // navegador más lo que la librería va escribiendo (login, refresh, logout).
  // Sin esto, getAll() seguiría devolviendo solo lo que llegó en la petición y
  // un signOut() justo después de un signIn() no encontraría la sesión.
  const live = new Map<string, string>();
  for (const c of parseCookieHeader(request.headers.get('cookie') ?? '')) live.set(c.name, c.value ?? '');

  // Set-Cookie finales a enviar (una sola entrada por nombre: la última gana).
  const outgoing = new Map<string, string>();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return [...live].map(([name, value]) => ({ name, value }));
      },
      setAll(cookies, headers) {
        for (const { name, value, options } of cookies) {
          const removing = options.maxAge === 0 || value === '';
          if (removing) live.delete(name);
          else live.set(name, value);
          outgoing.set(
            name,
            serializeCookieHeader(name, value, {
              ...options,
              httpOnly: true,
              secure,
              sameSite: 'lax',
              path: '/',
              ...(removing ? { maxAge: 0 } : { maxAge: SESSION_MAX_AGE }),
            }),
          );
        }
        Object.assign(cacheHeaders, headers);
      },
    },
  });

  // Expira todas las cookies sb-* que el navegador mandó (logout / sesión rota).
  const clearAllAuthCookies = () => {
    for (const name of [...live.keys()].filter((n) => n.startsWith('sb-'))) {
      live.delete(name);
      outgoing.set(name, serializeCookieHeader(name, '', { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 0 }));
    }
  };

  // Devuelve una copia de la respuesta con las cookies (si hubo cambios) y
  // cabeceras anti-caché, para que ningún CDN cachee un Set-Cookie.
  const applyTo = (response: Response): Response => {
    const headers = new Headers(response.headers);
    for (const h of outgoing.values()) headers.append('Set-Cookie', h);
    if (outgoing.size > 0) {
      headers.set('Cache-Control', NO_STORE);
      for (const [k, v] of Object.entries(cacheHeaders)) headers.set(k, v);
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  };

  return { supabase, applyTo, clearAllAuthCookies };
}

export type SessionClient = ReturnType<typeof createSessionClient>['supabase'];
