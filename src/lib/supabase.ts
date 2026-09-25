import { createClient } from '@supabase/supabase-js';
import { FALLBACK_SUPABASE_URL, FALLBACK_SUPABASE_ANON_KEY } from '@/lib/publicConfig';

// Cliente PÚBLICO (solo anon key): lee artículos, banners, encuestas, etc.
// Nunca guarda una sesión. La sesión del panel admin vive en cookies httpOnly
// que solo ven las funciones de servidor (api/); el navegador habla con el
// panel a través de src/lib/adminSupabase.ts.
//
// Los valores de respaldo son la URL y la anon key públicas (seguras en el
// cliente: la protección viene de RLS). Mantienen la app funcionando aunque el
// panel del hosting guarde un placeholder enmascarado en vez del valor real; un
// `||` simple no lo detecta (un string falso sigue siendo truthy), por eso se
// valida la forma.
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = envUrl?.startsWith('https://') ? envUrl : FALLBACK_SUPABASE_URL;
const supabaseAnonKey =
  envAnonKey?.startsWith('eyJ') && envAnonKey.includes('.') ? envAnonKey : FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export const SUPABASE_PUBLIC_URL = supabaseUrl;
export const SUPABASE_PUBLIC_ANON_KEY = supabaseAnonKey;

// Sesiones que dejó la versión anterior (token de acceso y de refresco en
// localStorage): se borran para que no queden tokens vivos a mano de un XSS.
try {
  for (const key of Object.keys(localStorage)) {
    if (/^sb-.*-auth-token/.test(key) || key === 'supabase.auth.token') localStorage.removeItem(key);
  }
} catch {
  /* sin localStorage: nada que limpiar */
}
