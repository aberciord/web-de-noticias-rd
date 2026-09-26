import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://elpoderdelpueblord.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OPTIONS = ["a", "b", "c"] as const;
type Option = (typeof OPTIONS)[number];

// Cupos por IP cada 10 minutos, según qué tan sensible/abusable es la acción.
// "write" = crea datos (suscribir, votar); "lookup" = consulta sobre un email
// (¿es suscriptor?, ¿ya votó?), que se podría usar para enumerar suscriptores.
const RATE_LIMITS: Record<string, { bucket: string; max: number }> = {
  subscribe: { bucket: "write", max: 10 },
  vote: { bucket: "write", max: 10 },
  check_subscribed: { bucket: "lookup", max: 30 },
  has_voted: { bucket: "lookup", max: 30 },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (code: string, status: number) => json({ error: code }, status);

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? "unknown";
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

function parsePollId(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

async function isSubscribed(email: string): Promise<boolean> {
  const { data } = await adminClient
    .from("newsletter_subscribers")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  return !!data;
}

async function getResults(pollId: string) {
  const { data, error } = await adminClient.rpc("poll_vote_counts", { p_poll_id: pollId });
  if (error) throw error;

  const votes: Record<Option, number> = { a: 0, b: 0, c: 0 };
  for (const row of (data ?? []) as { option: string; votes: number | string }[]) {
    if (row.option in votes) votes[row.option as Option] = Number(row.votes);
  }
  const total = votes.a + votes.b + votes.c;

  // Porcentajes enteros que siempre suman 100 (método del mayor residuo).
  const percent: Record<Option, number> = { a: 0, b: 0, c: 0 };
  if (total > 0) {
    const raw = OPTIONS.map((o) => ({ o, exact: (votes[o] * 100) / total }));
    for (const r of raw) percent[r.o] = Math.floor(r.exact);
    let left = 100 - OPTIONS.reduce((s, o) => s + percent[o], 0);
    raw.sort((x, y) => (y.exact - Math.floor(y.exact)) - (x.exact - Math.floor(x.exact)));
    for (const r of raw) {
      if (left <= 0) break;
      percent[r.o] += 1;
      left -= 1;
    }
  }

  return {
    total,
    a: { votes: votes.a, percent: percent.a },
    b: { votes: votes.b, percent: percent.b },
    c: { votes: votes.c, percent: percent.c },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") return fail("method_not_allowed", 405);

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return fail("invalid_body", 400);
    }

    const action = typeof body.action === "string" ? body.action : "";

    // Rate limiting (mismo patrón que reset-password-questions).
    const limit = RATE_LIMITS[action];
    if (limit) {
      const { data: allowed, error: rateError } = await adminClient.rpc("check_and_log_poll_attempt", {
        p_ip: getClientIp(req),
        p_action: limit.bucket,
        p_max_attempts: limit.max,
        p_window_minutes: 10,
      });
      if (rateError) return fail("internal_error", 500);
      if (!allowed) return fail("rate_limited", 429);
    }

    switch (action) {
      case "subscribe": {
        const email = normalizeEmail(body.email);
        if (!email) return fail("invalid_email", 400);
        const { error } = await adminClient
          .from("newsletter_subscribers")
          .upsert({ email }, { onConflict: "email", ignoreDuplicates: true });
        if (error) return fail("internal_error", 500);
        return json({ subscribed: true });
      }

      case "check_subscribed": {
        const email = normalizeEmail(body.email);
        if (!email) return fail("invalid_email", 400);
        return json({ subscribed: await isSubscribed(email) });
      }

      case "has_voted": {
        const email = normalizeEmail(body.email);
        const pollId = parsePollId(body.poll_id);
        if (!email || !pollId) return fail("invalid_request", 400);
        const { data } = await adminClient
          .from("poll_votes")
          .select("id")
          .eq("poll_id", pollId)
          .eq("subscriber_email", email)
          .maybeSingle();
        return json({ voted: !!data });
      }

      case "vote": {
        const email = normalizeEmail(body.email);
        const pollId = parsePollId(body.poll_id);
        const option = body.option;
        if (!email || !pollId || typeof option !== "string" || !OPTIONS.includes(option as Option)) {
          return fail("invalid_request", 400);
        }

        const { data: poll } = await adminClient
          .from("polls")
          .select("id, active, starts_at, ends_at")
          .eq("id", pollId)
          .maybeSingle();
        const now = Date.now();
        if (
          !poll || !poll.active ||
          now < new Date(poll.starts_at).getTime() ||
          now > new Date(poll.ends_at).getTime()
        ) {
          return fail("poll_closed", 409);
        }

        if (!(await isSubscribed(email))) return fail("not_subscribed", 403);

        const { error: insertError } = await adminClient
          .from("poll_votes")
          .insert({ poll_id: pollId, subscriber_email: email, option });
        if (insertError) {
          // UNIQUE(poll_id, subscriber_email): ya votó (también cubre carreras).
          if (insertError.code === "23505") return fail("already_voted", 409);
          return fail("internal_error", 500);
        }
        return json({ voted: true, results: await getResults(pollId) });
      }

      case "results": {
        const pollId = parsePollId(body.poll_id);
        if (!pollId) return fail("invalid_request", 400);
        return json(await getResults(pollId));
      }

      default:
        return fail("unknown_action", 400);
    }
  } catch {
    return fail("internal_error", 500);
  }
});
