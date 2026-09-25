import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer, loadEnv, type Plugin, type ViteDevServer } from 'vite';

// Sirve las funciones de /api (las mismas que corren en Vercel) desde
// `npm run dev` y `vite preview`, para poder probar el login con cookies
// httpOnly en local sin el CLI de Vercel. En producción no interviene:
// Vercel ejecuta api/ directamente.
type Handler = (request: Request) => Promise<Response> | Response;

function routeFile(pathname: string): string | null {
  const segments = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  if (segments.length === 0 || segments.some((s) => s.startsWith('_') || s.includes('..'))) return null;
  if (segments[0] === 'sb') return 'api/sb/[...path].ts';
  const file = `api/${segments.join('/')}.ts`;
  return existsSync(resolve(process.cwd(), file)) ? file : null;
}

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'http';
  const url = `${proto}://${req.headers.host}${req.url}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else if (v !== undefined) headers.set(k, v);
  }
  const init: RequestInit & { duplex?: 'half' } = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = Readable.toWeb(req) as unknown as ReadableStream;
    init.duplex = 'half';
  }
  return new Request(url, init);
}

async function sendWebResponse(res: ServerResponse, response: Response, method?: string): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') res.setHeader(key, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader('set-cookie', cookies);
  if (method === 'HEAD') res.end();
  else res.end(Buffer.from(await response.arrayBuffer()));
}

export default function apiPlugin(): Plugin {
  let loader: ViteDevServer | null = null;

  const attach = (middlewares: { use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void }) => {
    middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/')) return next();
      const file = routeFile(new URL(req.url, 'http://x').pathname);
      if (!file) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      try {
        const mod = await loader!.ssrLoadModule(`/${file}`);
        const handler = (mod as Record<string, Handler | undefined>)[req.method ?? 'GET'];
        if (!handler) {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        await sendWebResponse(res, await handler(await toWebRequest(req)), req.method);
      } catch (err) {
        console.error('[api]', err);
        res.statusCode = 500;
        res.end('Internal error');
      }
    });
  };

  return {
    name: 'local-api-functions',
    config(_config, { mode }) {
      // Las funciones leen process.env (como en Vercel); en local se llena
      // desde .env para que VITE_SUPABASE_* funcionen igual.
      const env = loadEnv(mode, process.cwd(), '');
      for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
    },
    configureServer(server) {
      loader = server;
      attach(server.middlewares);
    },
    async configurePreviewServer(server) {
      loader = await createServer({
        configFile: false,
        appType: 'custom',
        server: { middlewareMode: true, hmr: false, watch: null },
        optimizeDeps: { noDiscovery: true },
        logLevel: 'warn',
      });
      attach(server.middlewares);
    },
  };
}
