const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY");

interface PexelsPhoto {
  id: number;
  photographer: string;
  alt: string;
  src: {
    large: string;
    medium: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Falta el parámetro query" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!PEXELS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "PEXELS_API_KEY no configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pexelsResponse = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );

    if (!pexelsResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Error de la API de Pexels: ${pexelsResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await pexelsResponse.json();
    const results = (data.photos as PexelsPhoto[] ?? []).map((photo) => ({
      id: photo.id,
      thumb_url: photo.src.medium,
      full_url: photo.src.large,
      photographer: photo.photographer,
      alt: photo.alt || query,
    }));

    return new Response(
      JSON.stringify({ results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
