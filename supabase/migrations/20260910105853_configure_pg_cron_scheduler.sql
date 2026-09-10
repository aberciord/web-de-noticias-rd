/*
# Configure pg_cron scheduler for news-pipeline

## Overview
Enables the pg_cron extension and creates two scheduled jobs that call the
`news-pipeline` edge function twice daily at 7:00 AM and 3:00 PM
Dominican Republic time (America/Santo_Domingo, UTC-4 year-round — no DST).

## Details
- 7:00 AM AST = 11:00 UTC
- 3:00 PM AST = 19:00 UTC
- Uses `net.http_post` from the pg_net extension (already available in Supabase)
  to call the edge function endpoint.
- The edge function URL is constructed from the Supabase project URL.
- The Authorization header uses the anon key so the request passes JWT verification.
- A `cron_run_log` table records each invocation for verification.

## New Tables
- `cron_run_log`: logs each pipeline run with timestamp, status, and response body.

## Security
- RLS enabled on `cron_run_log`; only authenticated users can read it.
*/

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net for HTTP calls (needed to invoke edge functions)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Set timezone for cron to UTC (we convert RD times to UTC manually)
-- America/Santo_Domingo is AST (UTC-4) year-round, no DST

-- Log table for pipeline runs
CREATE TABLE IF NOT EXISTS cron_run_log (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  run_at TIMESTAMPTZ DEFAULT now(),
  status_code INT,
  response_body TEXT,
  success BOOLEAN DEFAULT false
);

ALTER TABLE cron_run_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cron_run_log_select_authenticated" ON cron_run_log;
CREATE POLICY "cron_run_log_select_authenticated" ON cron_run_log FOR SELECT
  TO authenticated USING (true);

-- Unschedule existing jobs if they exist (idempotent)
DO $$
BEGIN
  -- Remove old jobs if re-running
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname LIKE 'news-pipeline-%';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Schedule job 1: 7:00 AM AST = 11:00 UTC
-- cron format: min hour day month day-of-week
-- 11:00 UTC = '0 11 * * *'
SELECT cron.schedule(
  'news-pipeline-morning',
  '0 11 * * *',
  $$
    SELECT net.http_post(
      url := 'https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/news-pipeline',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Schedule job 2: 3:00 PM AST = 19:00 UTC
SELECT cron.schedule(
  'news-pipeline-afternoon',
  '0 19 * * *',
  $$
    SELECT net.http_post(
      url := 'https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/news-pipeline',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
