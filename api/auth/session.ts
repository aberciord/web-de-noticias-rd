import { createSessionClient } from '../_lib/session.js';
import { buildStatus } from '../_lib/status.js';
import { json } from '../_lib/http.js';

// Lee la sesión de las cookies, la valida y la refresca si expiró (las
// cookies nuevas viajan en esta misma respuesta). El panel lo llama al
// abrir, al volver a la pestaña y cada pocos minutos.
export async function GET(request: Request): Promise<Response> {
  const { supabase, applyTo } = createSessionClient(request);
  const status = await buildStatus(supabase);
  return applyTo(json(status ? status : { user: null }));
}
