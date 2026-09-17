import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SITE = "https://elpoderdelpueblord.com";

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

Deno.serve(async () => {
  try {
    const { data: articles } = await supabase
      .from("articles")
      .select("id, publicado_en")
      .eq("estado", "publicado")
      .order("publicado_en", { ascending: false });

    const staticUrls = [
      { loc: `${SITE}/`, changefreq: "hourly", priority: "1.0" },
      { loc: `${SITE}/categoria/noticias`, changefreq: "hourly", priority: "0.8" },
      { loc: `${SITE}/categoria/deportes`, changefreq: "hourly", priority: "0.8" },
      { loc: `${SITE}/categoria/politica`, changefreq: "hourly", priority: "0.8" },
      { loc: `${SITE}/categoria/farandula`, changefreq: "hourly", priority: "0.8" },
      { loc: `${SITE}/acerca`, changefreq: "monthly", priority: "0.3" },
      { loc: `${SITE}/privacidad`, changefreq: "yearly", priority: "0.1" },
      { loc: `${SITE}/terminos`, changefreq: "yearly", priority: "0.1" },
    ];

    const staticXml = staticUrls
      .map((u) => `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`)
      .join("\n");

    const articlesXml = (articles ?? [])
      .map((a) => {
        const lastmod = a.publicado_en ? new Date(a.publicado_en).toISOString().split("T")[0] : "";
        return `  <url>\n    <loc>${xmlEscape(`${SITE}/articulo/${a.id}`)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n    <changefreq>daily</changefreq>\n    <priority>0.6</priority>\n  </url>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticXml}\n${articlesXml}\n</urlset>\n`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=1800",
      },
    });
  } catch (err) {
    return new Response(`<!-- error: ${err instanceof Error ? err.message : "unknown"} -->`, {
      status: 500,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }
});
