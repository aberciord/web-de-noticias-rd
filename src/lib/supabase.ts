import { createClient } from '@supabase/supabase-js';

// Fallback values are the public Supabase project URL and anon key — safe to
// embed client-side (protection comes from RLS, not secrecy). This keeps the
// app working even if a hosting provider's env var UI fails to persist them.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xhfqkhzyoonihxxkwrki.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoZnFraHp5b29uaWh4eGt3cmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MDkxNzAsImV4cCI6MjEwNDQ4NTE3MH0.DVcL8Ro4y1PNZpDWH1lwY5FaEwrTOZZ4TfV0q0J-qNM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
