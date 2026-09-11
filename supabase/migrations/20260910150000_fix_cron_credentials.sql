/*
# Fix cron job pointing to the wrong project + remove hardcoded credentials

## Problem
The pg_cron jobs created in 20260910105853_configure_pg_cron_scheduler.sql
call a hardcoded URL/anon-key pair for project `0ec90b57d6e95fcbda19832f`,
which is NOT this project (`xhfqkhzyoonihxxkwrki`). The cron has therefore
never successfully invoked news-pipeline — cron_run_log stayed empty. The
credentials were also stored in plain text in a versioned migration file,
so a key rotation would require editing and re-running SQL by hand.

## Fix
- Store the edge function URL and anon key in Supabase Vault (encrypted,
  managed via dashboard/SQL editor — never committed to git).
- Replace the two cron jobs with one that calls a small function that reads
  those secrets from Vault at run time and invokes news-pipeline.
- No secret material appears in this file.

## Manual step required after running this migration
Populate the two Vault secrets once (run in the SQL Editor, NOT saved to
the repo):

  select vault.create_secret(
    'https://xhfqkhzyoonihxxkwrki.supabase.co/functions/v1/news-pipeline',
    'news_pipeline_url'
  );
  select vault.create_secret(
    '<the real anon key>',
    'news_pipeline_anon_key'
  );

If the key is ever rotated, update it with vault.update_secret() — no code
change needed.
*/

CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Remove the broken jobs pointing at the wrong project
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname LIKE 'news-pipeline-%';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE OR REPLACE FUNCTION invoke_news_pipeline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_url TEXT;
  v_anon_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'news_pipeline_url';
  SELECT decrypted_secret INTO v_anon_key FROM vault.decrypted_secrets WHERE name = 'news_pipeline_anon_key';

  IF v_url IS NULL OR v_anon_key IS NULL THEN
    RAISE NOTICE 'news_pipeline_url / news_pipeline_anon_key not set in Vault yet — skipping run';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := '{}'::jsonb
  );
END;
$$;

SELECT cron.schedule(
  'news-pipeline-morning',
  '0 11 * * *',
  $$SELECT invoke_news_pipeline();$$
);

SELECT cron.schedule(
  'news-pipeline-afternoon',
  '0 19 * * *',
  $$SELECT invoke_news_pipeline();$$
);
