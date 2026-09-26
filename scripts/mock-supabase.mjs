// Supabase FALSO (solo GoTrue + un pedazo de PostgREST) para probar en local el
// flujo de sesión con cookies httpOnly sin credenciales reales:
//   MOCK_TTL=8 node scripts/mock-supabase.mjs        (puerto 54999)
//   SUPABASE_URL=http://127.0.0.1:54999 npm run dev
// Cuentas de prueba (inventadas, no existen en ningún lado):
//   editor@test.local   / PassNoMfa-1  editor sin 2FA
//   editor2fa@test.local / Pass2fa-1   editor con 2FA verificado (código 123456)
//   outsider@test.local / PassOut-1    cuenta que NO está en editors
import http from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';

const PORT = Number(process.env.MOCK_PORT ?? 54999);
const TTL = Number(process.env.MOCK_TTL ?? 3600);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

const users = {
  'editor@test.local': { id: randomUUID(), password: 'PassNoMfa-1', isEditor: true, factors: [] },
  'editor2fa@test.local': {
    id: randomUUID(),
    password: 'Pass2fa-1',
    isEditor: true,
    factors: [{ id: 'fac-verified', factor_type: 'totp', status: 'verified', friendly_name: 'totp' }],
  },
  'outsider@test.local': { id: randomUUID(), password: 'PassOut-1', isEditor: false, factors: [] },
};
const byId = (id) => Object.values(users).find((u) => u.id === id);
const emailOf = (u) => Object.keys(users).find((e) => users[e] === u);

const sessions = new Map(); // access_token -> {user, aal, exp}
const refreshTokens = new Map(); // refresh_token -> {user, aal, used}
const log = [];

function issue(user, aal) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'mock', sub: user.id, aud: 'authenticated', role: 'authenticated', email: emailOf(user),
    aal, amr: [{ method: aal === 'aal2' ? 'totp' : 'password', timestamp: now }],
    session_id: randomUUID(), iat: now, exp: now + TTL,
  };
  const access = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.${randomBytes(12).toString('base64url')}`;
  const refresh = randomBytes(9).toString('base64url');
  sessions.set(access, { user, aal, exp: payload.exp });
  refreshTokens.set(refresh, { user, aal, used: false });
  return {
    access_token: access, token_type: 'bearer', expires_in: TTL, expires_at: payload.exp,
    refresh_token: refresh, user: userJson(user),
  };
}

const userJson = (u) => ({
  id: u.id, aud: 'authenticated', role: 'authenticated', email: emailOf(u),
  email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {},
  factors: u.factors, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
});

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...headers });
  res.end(body === undefined ? undefined : JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((r) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => r(Buffer.concat(c).toString())); });
const bearer = (req) => {
  const t = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  const s = sessions.get(t);
  return s && s.exp > Math.floor(Date.now() / 1000) ? { token: t, ...s } : null;
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const raw = await readBody(req);
  let body = {};
  try { body = raw && raw.startsWith('{') ? JSON.parse(raw) : {}; } catch { /* multipart */ }
  log.push(`${req.method} ${url.pathname}${url.search}`);

  if (req.method === 'OPTIONS') return send(res, 200, {}, { 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' });
  if (url.pathname === '/__log') return send(res, 200, log);

  if (url.pathname === '/auth/v1/token') {
    const grant = url.searchParams.get('grant_type');
    if (grant === 'password') {
      const u = users[String(body.email).toLowerCase()];
      if (!u || u.password !== body.password) return send(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      return send(res, 200, issue(u, 'aal1'));
    }
    if (grant === 'refresh_token') {
      const rt = refreshTokens.get(body.refresh_token);
      if (!rt) return send(res, 400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' });
      rt.used = true;
      return send(res, 200, issue(rt.user, rt.aal));
    }
  }

  if (url.pathname === '/auth/v1/user' && req.method === 'GET') {
    const s = bearer(req);
    return s ? send(res, 200, userJson(s.user)) : send(res, 401, { code: 401, error_code: 'bad_jwt', msg: 'invalid JWT' });
  }
  if (url.pathname === '/auth/v1/logout') {
    const s = bearer(req);
    if (s) for (const [k, v] of refreshTokens) if (v.user === s.user) refreshTokens.delete(k);
    return send(res, 204);
  }

  if (url.pathname === '/auth/v1/factors' && req.method === 'POST') {
    const s = bearer(req);
    if (!s) return send(res, 401, { msg: 'invalid JWT' });
    const f = { id: `fac-${randomUUID().slice(0, 8)}`, factor_type: 'totp', status: 'unverified', friendly_name: body.friendly_name ?? 'totp' };
    s.user.factors.push(f);
    return send(res, 200, {
      id: f.id, type: 'totp', friendly_name: f.friendly_name,
      totp: { qr_code: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>', secret: 'MOCKSECRETMOCK', uri: 'otpauth://totp/mock' },
    });
  }
  const m = url.pathname.match(/^\/auth\/v1\/factors\/([^/]+)(?:\/(challenge|verify))?$/);
  if (m) {
    const s = bearer(req);
    if (!s) return send(res, 401, { msg: 'invalid JWT' });
    const f = s.user.factors.find((x) => x.id === m[1]);
    if (!f) return send(res, 404, { code: 404, msg: 'factor not found' });
    if (m[2] === 'challenge') return send(res, 200, { id: 'chal-1', type: 'totp', expires_at: Math.floor(Date.now() / 1000) + 300 });
    if (m[2] === 'verify') {
      if (body.code !== '123456') return send(res, 400, { code: 400, error_code: 'mfa_verification_failed', msg: 'Invalid TOTP code entered' });
      f.status = 'verified';
      return send(res, 200, issue(s.user, 'aal2'));
    }
    if (req.method === 'DELETE') {
      if (f.status === 'verified' && s.aal !== 'aal2') return send(res, 422, { code: 422, error_code: 'insufficient_aal', msg: 'AAL2 required' });
      s.user.factors = s.user.factors.filter((x) => x !== f);
      return send(res, 200, { id: f.id });
    }
  }

  if (url.pathname === '/rest/v1/editors') {
    const s = bearer(req);
    const wanted = url.searchParams.get('id')?.replace('eq.', '');
    return send(res, 200, s && s.user.isEditor && s.user.id === wanted ? [{ id: wanted }] : []);
  }

  if (/^\/(rest|functions|storage)\/v1\//.test(url.pathname)) {
    const s = bearer(req);
    const echo = { method: req.method, path: url.pathname + url.search, hasBearerOfLoggedUser: !!s, user: s ? emailOf(s.user) : null, aal: s?.aal ?? null, apikey: !!req.headers.apikey, contentType: req.headers['content-type'] ?? null };
    const h = { 'x-mock-echo': JSON.stringify(echo) };
    if (!s) return send(res, 401, { message: 'JWT expired' }, h);
    // Las listas de REST devuelven [] para que las pantallas del panel rendericen vacías.
    return send(res, 200, url.pathname.startsWith('/rest/') ? [] : { echo }, h);
  }

  send(res, 404, { msg: 'mock: not found', path: url.pathname });
}).listen(PORT, '127.0.0.1', () => console.log(`mock supabase en http://127.0.0.1:${PORT} (TTL ${TTL}s)`));
