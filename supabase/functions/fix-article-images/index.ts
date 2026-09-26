import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://elpoderdelpueblord.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY");

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Palabras clave del titular (ES) -> búsqueda en Pexels (EN). Se prueba en orden.
const KEYWORDS: [RegExp, string][] = [
  [/tenis|tenista/i, "tennis player court"],
  [/b[eé]isbol|mlb|jonr[oó]n|bateo|dodgers|mets|yankees|cardenales|grandes ligas|estrellas orientales|[áa]guilas|lidom|pitcher/i, "baseball stadium game"],
  [/baloncesto|nba/i, "basketball court game"],
  [/f[uú]tbol|chelsea|tottenham|mundial de atletismo|atletismo/i, "soccer stadium match"],
  [/juegos santo domingo|comit[eé] organizador/i, "sports competition stadium"],
  [/omsa|metro|corredor|transporte|autob[uú]s/i, "city bus public transport"],
  [/arroz|agr[ií]cola|agro|importaci/i, "rice field farm"],
  [/coe|alerta|lluvia|tormenta|el[eé]ctrica/i, "storm clouds lightning"],
  [/air france|aerol[ií]nea|vuelo|aeropuerto/i, "airplane airport"],
  [/google|conectividad|internet|datos|tecnolog/i, "data center technology"],
  [/alcantarillado|obra|infraestructura/i, "construction workers infrastructure"],
  [/banda|drogaba|robo|arrest|desmantel|polic[ií]a/i, "police officers"],
  [/adolescent|hogares|menores/i, "teenager silhouette"],
  [/tribunal|scj|indemnizaci[oó]n|justicia|juez/i, "courthouse justice gavel"],
  [/educaci[oó]n|escuela|rural/i, "school classroom students"],
  [/congreso|ley|reforma|decreto|senado|diputado/i, "parliament legislative chamber"],
  [/contaminaci[oó]n|salud|suicidio/i, "air pollution city smog"],
  [/frontera|dajab[oó]n|haiti|comercio/i, "border market trade"],
  [/turismo|tur[ií]stic/i, "caribbean beach tourism"],
  [/banco central|econom|inflaci/i, "economy money coins"],
  [/cine|pel[ií]cula|festival de cine|actor|actriz|premio|ovaci[oó]n/i, "movie theater cinema"],
  [/m[uú]sica|artista|concierto|lanzamiento/i, "concert stage lights"],
  [/desaparici[oó]n|madre|fallecimiento/i, "candle vigil"],
  [/presidente|abinader|gobierno/i, "government building flag"],
];

const CATEGORY_FALLBACK: Record<string, string> = {
  noticias: "Santo Domingo city skyline",
  politica: "government building flag",
  deportes: "sports stadium",
  entretenimiento: "entertainment stage lights",
};

function buildQuery(titulo: string, categoria: string): string {
  for (const [re, q] of KEYWORDS) if (re.test(titulo)) return q;
  return CATEGORY_FALLBACK[categoria] ?? "news";
}

// Evita SSRF: no seguir fuente_url si no es http(s) publico o si resuelve a una
// IP privada/loopback/link-local (incluye el endpoint de metadatos de nube
// 169.254.169.254). No es infalible contra DNS rebinding (el fetch real hace
// su propia resolucion despues), pero bloquea el caso comun de un fuente_url
// manipulado para apuntar a la red interna.
function isBlockedIp(hostname: string): boolean {
  // IPv4 literal
  const v4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (incl. metadatos de nube)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
    return false;
  }
  // IPv6 literal (con o sin corchetes)
  const v6 = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (v6 === "::1") return true; // loopback
  if (v6.startsWith("fe80:") || v6.startsWith("fc") || v6.startsWith("fd")) return true; // link-local / unique local
  return false;
}

async function isSafeExternalUrl(pageUrl: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const hostname = url.hostname;
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) return false;
  if (hostname === "metadata.google.internal") return false;
  if (isBlockedIp(hostname)) return false;

  // Si el host no es una IP literal, resolvemos DNS y validamos las IPs
  // reales (evita que un dominio publico apunte a una IP interna).
  const isLiteralIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(":");
  if (!isLiteralIp) {
    try {
      const records = await Deno.resolveDns(hostname, "A").catch(() => []);
      const records6 = await Deno.resolveDns(hostname, "AAAA").catch(() => []);
      for (const ip of [...records, ...records6]) {
        if (isBlockedIp(ip)) return false;
      }
    } catch {
      // Si no se puede resolver, dejamos que el fetch normal falle despues;
      // no bloqueamos por un error de resolucion en si mismo.
    }
  }
  return true;
}

// Imagen original de la noticia (og:image / twitter:image de la página fuente).
async function fetchSourceImage(pageUrl: string | null | undefined): Promise<string | null> {
  if (!pageUrl) return null;
  if (!(await isSafeExternalUrl(pageUrl))) return null;
  try {
    const r = await fetch(pageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ElPoderDelPuebloBot/1.0)" },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });
    if (!r.ok) return null;
    const html = (await r.text()).slice(0, 200000);
    const tags = html.match(/<meta[^>]+>/gi) ?? [];
    for (const prop of ["og:image:secure_url", "og:image", "twitter:image"]) {
      for (const t of tags) {
        if (!new RegExp(`(property|name)=["']${prop}["']`, "i").test(t)) continue;
        const m = t.match(/content=["']([^"']+)["']/i);
        if (!m) continue;
        const abs = new URL(m[1].replace(/&amp;/g, "&"), r.url).toString();
        if (!abs.startsWith("http") || /logo|default|placeholder|favicon/i.test(abs)) continue;
        return abs;
      }
    }
  } catch { /* sin imagen de origen: se usa Pexels */ }
  return null;
}

// La página de inicio de un medio no es la noticia: su og:image es el logo o una portada genérica.
function isHomepage(u: string | null | undefined): boolean {
  try { return !u || new URL(u).pathname.replace(/\/+$/, "") === ""; } catch { return true; }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function searchPexels(query: string, page: number) {
  const r = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&page=${page}&orientation=landscape`,
    { headers: { Authorization: PEXELS_API_KEY! } },
  );
  if (!r.ok) throw new Error(`Pexels ${r.status}`);
  const d = await r.json();
  return (d.photos ?? []) as { id: number; src: { large: string } }[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "No autenticado" }, 401);
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "No autenticado" }, 401);
    const { data: editorRow } = await adminClient
      .from("editors").select("id").eq("id", userData.user.id).maybeSingle();
    if (!editorRow) return json({ error: "No autorizado" }, 403);
    if (!PEXELS_API_KEY) return json({ error: "PEXELS_API_KEY no configurada" }, 500);

    const body = await req.json().catch(() => ({}));
    const forceIds: string[] = Array.isArray(body.force_ids) ? body.force_ids : [];
    const doneIds: string[] = Array.isArray(body.done_ids) ? body.done_ids : [];
    const batch = Math.min(Number(body.batch) || 6, 10);
    let processed = 0;
    let pending = 0;

    const { data: articles, error } = await adminClient
      .from("articles")
      .select("id, categoria, titulo_es, imagen_url, fuente_url")
      .eq("estado", "publicado");
    if (error) throw error;

    const counts = new Map<string, number>();
    for (const a of articles ?? []) if (a.imagen_url) counts.set(a.imagen_url, (counts.get(a.imagen_url) ?? 0) + 1);
    const used = new Set<string>((articles ?? []).map((a) => a.imagen_url).filter(Boolean) as string[]);

    const summary: Record<string, { revisados: number; incorrectas: number; corregidas: number }> = {};
    const details: unknown[] = [];
    const doneNow: string[] = [];

    for (const a of articles ?? []) {
      const s = (summary[a.categoria] ??= { revisados: 0, incorrectas: 0, corregidas: 0 });
      s.revisados++;
      if (doneIds.includes(a.id)) continue;
      if (processed >= batch) { pending++; continue; }
      processed++;
      doneNow.push(a.id);

      // 1) Imagen original de la noticia, si la fuente tiene una.
      const homepage = isHomepage(a.fuente_url);
      const src = homepage ? null : await fetchSourceImage(a.fuente_url);
      if (src && src !== a.imagen_url && !used.has(src)) {
        const { error: srcErr } = await adminClient.from("articles").update({ imagen_url: src }).eq("id", a.id);
        if (!srcErr) {
          used.add(src);
          s.incorrectas++; s.corregidas++;
          details.push({ id: a.id, titulo: a.titulo_es, origen: "fuente", imagen_url: src });
          continue;
        }
      }
      if (src && src === a.imagen_url) continue;

      // 2) Sin imagen de origen: Pexels solo si falta, está repetida o se marcó a mano.
      const isPexels = (a.imagen_url ?? "").includes("images.pexels.com");
      // Sin fuente real (solo la portada del medio), la imagen del sitio es un logo: se reemplaza.
      const bad = !a.imagen_url || (counts.get(a.imagen_url) ?? 0) > 1 || forceIds.includes(a.id) ||
        (homepage && !isPexels);
      if (!bad) continue;
      s.incorrectas++;

      const query = buildQuery(a.titulo_es, a.categoria);
      let chosen: string | null = null;
      for (let page = 1; page <= 3 && !chosen; page++) {
        const photos = await searchPexels(query, page);
        for (const p of photos) {
          const url = `https://images.pexels.com/photos/${p.id}/pexels-photo-${p.id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;
          const key = (u: string) => u.split("?")[0];
          if (![...used].some((u) => key(u) === key(url))) { chosen = url; break; }
        }
      }
      if (!chosen) { details.push({ id: a.id, titulo: a.titulo_es, query, resultado: "sin resultado" }); continue; }

      const { error: upErr } = await adminClient.from("articles").update({ imagen_url: chosen }).eq("id", a.id);
      if (upErr) { details.push({ id: a.id, titulo: a.titulo_es, error: upErr.message }); continue; }
      used.add(chosen);
      s.corregidas++;
      details.push({ id: a.id, titulo: a.titulo_es, query, imagen_url: chosen });
    }

    return json({ por_categoria: summary, detalle: details, hechos: doneNow, pendientes: pending });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Error interno" }, 500);
  }
});
