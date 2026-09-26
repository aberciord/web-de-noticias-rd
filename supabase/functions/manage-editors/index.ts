import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://elpoderdelpueblord.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface CreateEditorRequest {
  action?: "create";
  email: string;
  password: string;
  question_1: string;
  answer_1: string;
  question_2: string;
  answer_2: string;
}

interface SetOwnQuestionsRequest {
  action: "set_own_questions";
  question_1: string;
  answer_1: string;
  question_2: string;
  answer_2: string;
  new_password?: string;
  // Obligatoria cuando se manda new_password: confirma que quien tiene la
  // sesion abierta sigue siendo dueno de la cuenta antes de cambiar la
  // contrasena (una sesion olvidada abierta en una compu compartida no
  // deberia bastar para eso).
  current_password?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Solo un editor ya autenticado puede crear editores nuevos —
    // no existe (ni existirá) un registro público.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "No autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: editorRow } = await callerClient
      .from("editors")
      .select("id")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (!editorRow) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateEditorRequest | SetOwnQuestionsRequest = await req.json();

    if (body.action === "set_own_questions") {
      if (!body.question_1?.trim() || !body.answer_1?.trim() || !body.question_2?.trim() || !body.answer_2?.trim()) {
        return new Response(
          JSON.stringify({ error: "Faltan las 2 preguntas o respuestas de seguridad" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (body.new_password && body.new_password.length < 6) {
        return new Response(
          JSON.stringify({ error: "La contraseña nueva necesita al menos 6 caracteres" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (body.new_password) {
        if (!body.current_password) {
          return new Response(
            JSON.stringify({ error: "Escribe tu contraseña actual para poder cambiarla" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Verifica la contraseña actual iniciando sesion con ella en un
        // cliente aparte (no toca la sesion del caller). Un error aqui
        // significa que no coincide.
        const verifyClient = createClient(SUPABASE_URL, ANON_KEY);
        const { error: verifyError } = await verifyClient.auth.signInWithPassword({
          email: userData.user.email!,
          password: body.current_password,
        });
        if (verifyError) {
          return new Response(
            JSON.stringify({ error: "La contraseña actual no es correcta" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const { error: ownQuestionsError } = await adminClient.rpc("set_editor_security_questions", {
        p_editor_id: userData.user.id,
        p_question_1: body.question_1.trim(),
        p_answer_1: body.answer_1,
        p_question_2: body.question_2.trim(),
        p_answer_2: body.answer_2,
      });

      if (ownQuestionsError) {
        return new Response(
          JSON.stringify({ error: ownQuestionsError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (body.new_password) {
        const { error: passwordError } = await adminClient.auth.admin.updateUserById(userData.user.id, {
          password: body.new_password,
        });
        if (passwordError) {
          return new Response(
            JSON.stringify({ error: passwordError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.email || !body.password || body.password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Correo o contraseña inválidos (la contraseña necesita al menos 6 caracteres)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!body.question_1?.trim() || !body.answer_1?.trim() || !body.question_2?.trim() || !body.answer_2?.trim()) {
      return new Response(
        JSON.stringify({ error: "Faltan las 2 preguntas o respuestas de seguridad" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });

    if (createError || !newUser.user) {
      return new Response(
        JSON.stringify({ error: createError?.message ?? "No se pudo crear el usuario" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: editorInsertError } = await adminClient
      .from("editors")
      .insert({ id: newUser.user.id, email: body.email });

    if (editorInsertError) {
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: editorInsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: questionsError } = await adminClient.rpc("set_editor_security_questions", {
      p_editor_id: newUser.user.id,
      p_question_1: body.question_1.trim(),
      p_answer_1: body.answer_1,
      p_question_2: body.question_2.trim(),
      p_answer_2: body.answer_2,
    });

    if (questionsError) {
      return new Response(
        JSON.stringify({ error: questionsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
