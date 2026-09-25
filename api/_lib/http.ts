export const NO_STORE = 'private, no-cache, no-store, max-age=0, must-revalidate';

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': NO_STORE, ...headers },
  });
}

export function isSecureRequest(request: Request): boolean {
  const proto = request.headers.get('x-forwarded-proto');
  return proto ? proto.split(',')[0].trim() === 'https' : new URL(request.url).protocol === 'https:';
}

function requestHost(request: Request): string {
  return (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host)
    .split(',')[0]
    .trim();
}

// Defensa CSRF para los métodos que cambian datos: SameSite=Lax ya impide que
// otro sitio mande la cookie en un POST, y además se exige que la petición
// venga de este mismo origen.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).host === requestHost(request);
    } catch {
      return false;
    }
  }
  const site = request.headers.get('sec-fetch-site');
  return site === 'same-origin' || site === 'none';
}

export const isSafeMethod = (method: string) => method === 'GET' || method === 'HEAD';

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
