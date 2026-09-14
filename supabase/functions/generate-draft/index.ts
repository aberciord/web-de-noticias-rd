import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

interface GenerateDraftRequest {
  input_text: string;
  categoria: string;
  fuente_nombre?: string;
  fuente_url?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: GenerateDraftRequest = await req.json();

    if (!body.input_text || body.input_text.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "El texto de entrada es muy corto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY no configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Basado en este hecho noticioso (NO copies el texto, redacta desde cero):
Texto base: ${body.input_text}
Categoría: ${body.categoria}

Escribe una nota periodística original de 150-250 palabras en español, tono neutral,
para un portal dominicano. Al final agrega: "Fuente: ${body.fuente_nombre ?? "Fuente"}" con enlace ${body.fuente_url ?? ""}.
Luego traduce la nota completa al inglés.

Responde SOLO en JSON (sin markdown, sin texto adicional):
{"titulo_es": "...", "cuerpo_es": "...", "titulo_en": "...", "cuerpo_en": "...", "resumen_seo": "..."}`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      return new Response(
        JSON.stringify({ error: `Error de la API de OpenAI: ${openaiResponse.status}`, details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiResponse.json();
    const textContent = openaiData.choices?.[0]?.message?.content ?? "";

    let generatedArticle;
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generatedArticle = JSON.parse(jsonMatch[0]);
      } else {
        generatedArticle = JSON.parse(textContent);
      }
    } catch {
      return new Response(
        JSON.stringify({ error: "La respuesta de la IA no tiene formato JSON válido", raw: textContent }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(generatedArticle),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
