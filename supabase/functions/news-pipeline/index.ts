import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://elpoderdelpueblord.com",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY");
const CATEGORIAS = ["noticias", "politica", "deportes", "entretenimiento"];

// Imagen original de la noticia (og:image / twitter:image de la página fuente).
async function fetchSourceImage(pageUrl: string | null | undefined): Promise<string | null> {
  if (!pageUrl) return null;
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

// Busca en Pexels una foto que ilustre la nota y que no esté ya en otro artículo.
async function findImage(query: string): Promise<string | null> {
  if (!PEXELS_API_KEY || !query) return null;
  try {
    const r = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY } },
    );
    if (!r.ok) return null;
    const photos = ((await r.json()).photos ?? []) as { id: number }[];
    for (const p of photos) {
      const url = `https://images.pexels.com/photos/${p.id}/pexels-photo-${p.id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;
      const { data } = await supabase
        .from("articles").select("id").like("imagen_url", `%pexels-photo-${p.id}.%`).limit(1);
      if (!data || data.length === 0) return url;
    }
  } catch { /* la nota se publica sin imagen y el panel puede corregirla */ }
  return null;
}

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

interface Source {
  id: string;
  nombre: string;
  feed_url: string;
  categoria: string;
  idioma: string;
  activo: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Step 1: Fetch active sources
    const { data: sources, error: sourcesError } = await supabase
      .from("sources")
      .select("*")
      .eq("activo", true);

    if (sourcesError) throw sourcesError;
    if (!sources || sources.length === 0) {
      const msg = JSON.stringify({ message: "No hay fuentes activas configuradas" });
      await supabase.from("cron_run_log").insert({
        job_name: "news-pipeline",
        status_code: 200,
        response_body: msg,
        success: true,
      });
      return new Response(
        msg,
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = {
      sources_checked: sources.length,
      raw_items_collected: 0,
      items_selected: 0,
      articles_generated: 0,
      errors: [] as string[],
    };

    // Step 2: Fetch RSS feeds and collect raw items
    for (const source of sources as Source[]) {
      try {
        const feedResponse = await fetch(source.feed_url, {
          headers: { "User-Agent": "ElPoderDelPuebloRD-Bot/1.0" },
          signal: AbortSignal.timeout(10000),
        });

        if (!feedResponse.ok) {
          results.errors.push(`Feed ${source.nombre}: HTTP ${feedResponse.status}`);
          continue;
        }

        const feedText = await feedResponse.text();
        const items = parseRSSFeed(feedText);

        for (const item of items.slice(0, 10)) {
          // Deduplicate by url_original
          const { data: existing } = await supabase
            .from("raw_items")
            .select("id")
            .eq("url_original", item.link)
            .maybeSingle();

          if (existing) continue;

          const { error: insertError } = await supabase.from("raw_items").insert({
            source_id: source.id,
            categoria: source.categoria,
            titulo_original: item.title,
            resumen_original: item.description,
            url_original: item.link,
            fecha_publicacion: item.pubDate ? new Date(item.pubDate).toISOString() : null,
            procesado: false,
            seleccionado: false,
          });

          if (insertError) {
            results.errors.push(`Insert error for ${source.nombre}: ${insertError.message}`);
          } else {
            results.raw_items_collected++;
          }
        }
      } catch (err) {
        results.errors.push(`Feed ${source.nombre}: ${err instanceof Error ? err.message : "error"}`);
      }
    }

    if (!OPENAI_API_KEY) {
      const noKeyBody = JSON.stringify({
        ...results,
        message: "OPENAI_API_KEY no configurada. Se recolectaron items pero no se generaron artículos.",
      });
      await supabase.from("cron_run_log").insert({
        job_name: "news-pipeline",
        status_code: 200,
        response_body: noKeyBody,
        success: true,
      });
      return new Response(
        noKeyBody,
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Select most relevant items per category using Claude
    const { data: unprocessedItems } = await supabase
      .from("raw_items")
      .select("*")
      .eq("procesado", false)
      .order("fecha_recoleccion", { ascending: false })
      .limit(50);

    if (unprocessedItems && unprocessedItems.length > 0) {
      const byCategory: Record<string, typeof unprocessedItems> = {};
      for (const item of unprocessedItems) {
        if (!byCategory[item.categoria]) byCategory[item.categoria] = [];
        byCategory[item.categoria].push(item);
      }

      const topN = 3;

      for (const [categoria, items] of Object.entries(byCategory)) {
        if (items.length === 0) continue;

        const selectionPrompt = `Eres un editor de noticias. Te doy una lista de titulares con su resumen y fecha.
Selecciona los ${topN} más relevantes para un público dominicano, priorizando: actualidad,
impacto local, y diversidad de temas (evita 3 notas sobre el mismo evento).

Artículos:
${items.map((item, i) => `[${i}] ID: ${item.id} | ${item.titulo_original} | ${item.resumen_original ?? ""} | ${item.fecha_publicacion ?? ""}`).join("\n")}

Responde SOLO en JSON: [{"id": "...", "indice": 0}]`;

        try {
          const selectionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o",
              max_tokens: 1000,
              messages: [{ role: "user", content: selectionPrompt }],
            }),
          });

          if (selectionResponse.ok) {
            const selData = await selectionResponse.json();
            const selText = selData.choices?.[0]?.message?.content ?? "";
            const jsonMatch = selText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const selections = JSON.parse(jsonMatch[0]) as Array<{ id: string }>;
              for (const sel of selections) {
                await supabase
                  .from("raw_items")
                  .update({ seleccionado: true })
                  .eq("id", sel.id);
                results.items_selected++;
              }
            }
          }
        } catch (err) {
          results.errors.push(`Selection error (${categoria}): ${err instanceof Error ? err.message : "error"}`);
        }
      }

      // Step 4: Generate articles from selected items
      const { data: selectedItems } = await supabase
        .from("raw_items")
        .select("*, sources(*)")
        .eq("seleccionado", true)
        .eq("procesado", false)
        .limit(15);

      if (selectedItems) {
        for (const item of selectedItems) {
          try {
            const sourceName = (item.sources as Source)?.nombre ?? "Fuente";
            const rewritePrompt = `Basado en este hecho noticioso (NO copies el texto, redacta desde cero):
Titular: ${item.titulo_original}
Resumen: ${item.resumen_original ?? ""}
Categoría: ${item.categoria}

Escribe una nota periodística original de 150-250 palabras en español, tono neutral,
para un portal dominicano. Al final agrega: "Fuente: ${sourceName}" con enlace ${item.url_original}.
Luego traduce la nota completa al inglés.

categoria (una sola): noticias | politica (gobierno, partidos, justicia, corrupción) | deportes | entretenimiento (música, cine, series y streaming, celebridades, artistas, conciertos, premios, televisión, cultura pop y contenido viral, con énfasis en República Dominicana y Latinoamérica; excluir rumores sin fuente, vida privada y contenido difamatorio).
imagen_query: 2 a 5 palabras EN INGLÉS para una foto de stock que ilustre la noticia (sin nombres de personas).`;

            const rewriteResponse = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: "gpt-4o",
                max_tokens: 1500,
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "nota",
                    strict: true,
                    schema: {
                      type: "object",
                      additionalProperties: false,
                      required: ["titulo_es", "cuerpo_es", "titulo_en", "cuerpo_en", "resumen_seo", "imagen_query", "categoria"],
                      properties: {
                        titulo_es: { type: "string" },
                        cuerpo_es: { type: "string" },
                        titulo_en: { type: "string" },
                        cuerpo_en: { type: "string" },
                        resumen_seo: { type: "string" },
                        imagen_query: { type: "string" },
                        categoria: { type: "string", enum: CATEGORIAS },
                      },
                    },
                  },
                },
                messages: [{ role: "user", content: rewritePrompt }],
              }),
            });

            if (rewriteResponse.ok) {
              const rwData = await rewriteResponse.json();
              const rwText = rwData.choices?.[0]?.message?.content ?? "";
              const jsonMatch = rwText.match(/\{[\s\S]*\}/);

              if (jsonMatch) {
                const article = JSON.parse(jsonMatch[0]);

                const imagenUrl =
                  (await fetchSourceImage(item.url_original)) ??
                  (await findImage(String(article.imagen_query ?? "").trim()));

                const { error: articleError } = await supabase.from("articles").insert({
                  imagen_url: imagenUrl,
                  raw_item_id: item.id,
                  categoria: CATEGORIAS.includes(article.categoria)
                    ? article.categoria
                    : item.categoria,
                  titulo_es: article.titulo_es,
                  cuerpo_es: article.cuerpo_es,
                  titulo_en: article.titulo_en,
                  cuerpo_en: article.cuerpo_en,
                  resumen_seo: article.resumen_seo,
                  fuente_nombre: sourceName,
                  fuente_url: item.url_original,
                  autor: "IA",
                  estado: "pendiente_revision",
                });

                if (!articleError) {
                  results.articles_generated++;
                  await supabase
                    .from("raw_items")
                    .update({ procesado: true })
                    .eq("id", item.id);
                }
              }
            }
          } catch (err) {
            results.errors.push(`Rewrite error (item ${item.id}): ${err instanceof Error ? err.message : "error"}`);
          }
        }
      }

      // Mark all unprocessed items as processed
      await supabase
        .from("raw_items")
        .update({ procesado: true })
        .eq("procesado", false);
    }

    const responseBody = JSON.stringify(results);
    await supabase.from("cron_run_log").insert({
      job_name: "news-pipeline",
      status_code: 200,
      response_body: responseBody,
      success: true,
    });

    return new Response(
      responseBody,
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errBody = JSON.stringify({ error: err instanceof Error ? err.message : "Error interno" });
    await supabase.from("cron_run_log").insert({
      job_name: "news-pipeline",
      status_code: 500,
      response_body: errBody,
      success: false,
    });

    return new Response(
      errBody,
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseRSSFeed(xml: string): RSSItem[] {
  const items: RSSItem[] = [];

  // Simple regex-based RSS parser (works for RSS 2.0)
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const itemMatches = xml.match(itemRegex) ?? [];

  for (const itemXml of itemMatches) {
    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const description = stripHtml(extractTag(itemXml, "description"));
    const pubDate = extractTag(itemXml, "pubDate");

    if (title && link) {
      items.push({ title, link, description, pubDate });
    }
  }

  // Also handle Atom feeds
  if (items.length === 0) {
    const entryRegex = /<entry[\s\S]*?<\/entry>/gi;
    const entryMatches = xml.match(entryRegex) ?? [];

    for (const entryXml of entryMatches) {
      const title = extractTag(entryXml, "title");
      const link = entryXml.match(/<link[^>]*href="([^"]*)"[^>]*>/i)?.[1] ?? "";
      const description = stripHtml(extractTag(entryXml, "summary") || extractTag(entryXml, "content"));
      const pubDate = extractTag(entryXml, "published") || extractTag(entryXml, "updated");

      if (title && link) {
        items.push({ title, link, description, pubDate });
      }
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>\\s*([\\s\\S]*?)\\s*</${tag}>`, "i");
  const match = xml.match(regex);
  if (!match) return "";
  const cdataMatch = match[1].match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return cdataMatch ? cdataMatch[1].trim() : match[1].trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
    .substring(0, 500);
}
