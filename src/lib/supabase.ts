import { createClient } from '@supabase/supabase-js';

// Fallback values are the public Supabase project URL and anon key — safe to
// embed client-side (protection comes from RLS, not secrecy). This keeps the
// app working even if a hosting provider's env var UI corrupts them (seen in
// practice: some dashboards saved the masked "••••" placeholder instead of
// the real value). A plain `||` fallback wouldn't catch that, since a bogus
// non-empty string is still truthy — so validate the shape instead.
const FALLBACK_URL = 'https://xhfqkhzyoonihxxkwrki.supabase.co';
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoZnFraHp5b29uaWh4eGt3cmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MDkxNzAsImV4cCI6MjEwNDQ4NTE3MH0.DVcL8Ro4y1PNZpDWH1lwY5FaEwrTOZZ4TfV0q0J-qNM';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = envUrl?.startsWith('https://') ? envUrl : FALLBACK_URL;
const supabaseAnonKey = envAnonKey?.startsWith('eyJ') && envAnonKey.includes('.') ? envAnonKey : FALLBACK_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
