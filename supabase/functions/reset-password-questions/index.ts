import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface GetQuestionsRequest {
  action: "get_questions";
  email: string;
}

interface VerifyAndResetRequest {
  action: "verify_and_reset";
  email: string;
  answer_1: string;
  answer_2: string;
  new_password: string;
}

const GENERIC_NOT_FOUND = "No encontramos una cuenta con preguntas de seguridad configuradas para ese correo.";
const RATE_LIMIT_MESSAGE = "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.";

// IP real del visitante: Supabase/Deno Deploy la entrega en x-forwarded-for
// (la primera de la lista, si hay varias detrás de proxies).
function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? "unknown";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: GetQuestionsRequest | VerifyAndResetRequest = await req.json();

    if (!body.email) {
      return new Response(
        JSON.stringify({ error: "Falta el correo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Máximo 5 intentos (get_questions o verify_and_reset) cada 15 minutos,
    // por email o por ip — lo que se alcance primero.
    const clientIp = getClientIp(req);
    const { data: allowed, error: rateLimitError } = await adminClient.rpc(
      "check_and_log_password_reset_attempt",
      { p_email: body.email, p_ip: clientIp }
    );

    if (rateLimitError) {
      return new Response(
        JSON.stringify({ error: rateLimitError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: RATE_LIMIT_MESSAGE }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: editorRow } = await adminClient
      .from("editors")
      .select("id")
      .eq("email", body.email.trim().toLowerCase())
      .maybeSingle();

    if (!editorRow) {
      return new Response(
        JSON.stringify({ error: GENERIC_NOT_FOUND }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.action === "get_questions") {
      const { data: questions } = await adminClient
        .from("editor_security_questions")
        .select("question_1, question_2")
        .eq("editor_id", editorRow.id)
        .maybeSingle();

      if (!questions) {
        return new Response(
          JSON.stringify({ error: GENERIC_NOT_FOUND }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ question_1: questions.question_1, question_2: questions.question_2 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.action === "verify_and_reset") {
      if (!body.answer_1?.trim() || !body.answer_2?.trim() || !body.new_password || body.new_password.length < 6) {
        return new Response(
          JSON.stringify({ error: "Faltan respuestas o la contraseña nueva es muy corta (mínimo 6 caracteres)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: isValid, error: verifyError } = await adminClient.rpc("verify_editor_security_answers", {
        p_editor_id: editorRow.id,
        p_answer_1: body.answer_1,
        p_answer_2: body.answer_2,
      });

      if (verifyError) {
        return new Response(
          JSON.stringify({ error: verifyError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!isValid) {
        return new Response(
          JSON.stringify({ error: "Las respuestas no coinciden." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(editorRow.id, {
        password: body.new_password,
      });

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Acción no reconocida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
