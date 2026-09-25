import { FALLBACK_SUPABASE_URL, FALLBACK_SUPABASE_ANON_KEY } from '../../src/lib/publicConfig.js';

// Se valida la forma de las variables de entorno por la misma razón que en
// src/lib/supabase.ts: algunos paneles guardan un placeholder enmascarado en
// vez del valor real, y un valor "truthy" pero falso no lo detecta un `||`.
const envUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const envKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_URL = envUrl?.startsWith('http') ? envUrl.replace(/\/+$/, '') : FALLBACK_SUPABASE_URL;
export const SUPABASE_ANON_KEY =
  envKey?.startsWith('eyJ') && envKey.includes('.') ? envKey : FALLBACK_SUPABASE_ANON_KEY;

// 7 días de vida de las cookies de sesión; se renuevan (deslizan) cada vez que
// el token se refresca.
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;
