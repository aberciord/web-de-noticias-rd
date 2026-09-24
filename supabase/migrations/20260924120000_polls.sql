/*
# Encuestas de la home (polls + poll_votes)

## Overview
Una encuesta a la vez visible en la home, con 3 opciones fijas (de acuerdo /
no de acuerdo / indeciso). Solo pueden votar suscriptores del newsletter, un
voto por suscriptor por encuesta.

## Seguridad
- `polls`: lectura pública SOLO de la encuesta activa y dentro de su rango de
  fechas; los editores (is_editor()) leen todas y son los únicos que pueden
  crear/editar/borrar.
- `poll_votes`: sin políticas públicas. Nadie del cliente inserta ni lee
  votos directamente: la validación (¿es suscriptor?, ¿encuesta abierta?,
  ¿ya votó?) vive en la Edge Function `poll-actions`, que usa service role.
  Los editores pueden leer los votos (para ver resultados en el panel).
- `poll_action_attempts` + `check_and_log_poll_attempt`: rate limiting por IP
  para la Edge Function (mismo patrón que la recuperación de contraseña, pero
  con su propia tabla y contadores por tipo de acción).
- Borrar una encuesta borra sus votos (ON DELETE CASCADE).
*/

-- ============================================================
-- POLLS
-- ============================================================
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 500),
  option_a_label TEXT NOT NULL DEFAULT 'Estoy de acuerdo' CHECK (option_a_label = 'Estoy de acuerdo'),
  option_b_label TEXT NOT NULL DEFAULT 'No estoy de acuerdo' CHECK (option_b_label = 'No estoy de acuerdo'),
  option_c_label TEXT NOT NULL DEFAULT 'Estoy indeciso' CHECK (option_c_label = 'Estoy indeciso'),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES editors(id) ON DELETE SET NULL DEFAULT auth.uid(),
  CONSTRAINT polls_dates_valid CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_polls_active_window ON polls (active, starts_at, ends_at);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "polls_select_public_active" ON polls;
CREATE POLICY "polls_select_public_active" ON polls FOR SELECT
  TO anon, authenticated
  USING (active = true AND now() BETWEEN starts_at AND ends_at);

DROP POLICY IF EXISTS "polls_select_editor" ON polls;
CREATE POLICY "polls_select_editor" ON polls FOR SELECT
  TO authenticated USING (is_editor());

DROP POLICY IF EXISTS "polls_insert_editor" ON polls;
CREATE POLICY "polls_insert_editor" ON polls FOR INSERT
  TO authenticated WITH CHECK (is_editor());

DROP POLICY IF EXISTS "polls_update_editor" ON polls;
CREATE POLICY "polls_update_editor" ON polls FOR UPDATE
  TO authenticated USING (is_editor()) WITH CHECK (is_editor());

DROP POLICY IF EXISTS "polls_delete_editor" ON polls;
CREATE POLICY "polls_delete_editor" ON polls FOR DELETE
  TO authenticated USING (is_editor());

-- ============================================================
-- POLL VOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  subscriber_email TEXT NOT NULL CHECK (subscriber_email = lower(btrim(subscriber_email))),
  option TEXT NOT NULL CHECK (option IN ('a', 'b', 'c')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT poll_votes_one_per_subscriber UNIQUE (poll_id, subscriber_email)
);

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Sin INSERT/UPDATE/DELETE para nadie del cliente: solo la Edge Function
-- (service role) escribe votos. Los editores pueden leer (resultados).
DROP POLICY IF EXISTS "poll_votes_select_editor" ON poll_votes;
CREATE POLICY "poll_votes_select_editor" ON poll_votes FOR SELECT
  TO authenticated USING (is_editor());

-- Conteo agregado por opción, sin exponer emails. Solo service role.
CREATE OR REPLACE FUNCTION poll_vote_counts(p_poll_id UUID)
RETURNS TABLE (option TEXT, votes BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.option, count(*) FROM poll_votes v WHERE v.poll_id = p_poll_id GROUP BY v.option;
$$;

REVOKE ALL ON FUNCTION poll_vote_counts(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION poll_vote_counts(UUID) TO service_role;

-- ============================================================
-- RATE LIMITING de poll-actions (por IP y por tipo de acción)
-- ============================================================
CREATE TABLE IF NOT EXISTS poll_action_attempts (
  id BIGSERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_poll_action_attempts_ip_action_time
  ON poll_action_attempts (ip, action, created_at);

ALTER TABLE poll_action_attempts ENABLE ROW LEVEL SECURITY;
-- Intencionalmente sin políticas: solo la Edge Function (service role).

-- Devuelve false (sin registrar) si la IP ya alcanzó el máximo de intentos de
-- ese tipo de acción dentro de la ventana; si hay cupo, registra y devuelve true.
CREATE OR REPLACE FUNCTION check_and_log_poll_attempt(
  p_ip TEXT,
  p_action TEXT,
  p_max_attempts INT,
  p_window_minutes INT DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Limpieza oportunista para que la tabla no crezca sin límite.
  DELETE FROM poll_action_attempts WHERE created_at < now() - interval '1 day';

  SELECT count(*) INTO v_count
  FROM poll_action_attempts
  WHERE ip = p_ip
    AND action = p_action
    AND created_at > now() - (p_window_minutes || ' minutes')::interval;

  IF v_count >= p_max_attempts THEN
    RETURN false;
  END IF;

  INSERT INTO poll_action_attempts (ip, action) VALUES (p_ip, p_action);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION check_and_log_poll_attempt(TEXT, TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION check_and_log_poll_attempt(TEXT, TEXT, INT, INT) TO service_role;
