/*
# Rate limiting para recuperación de contraseña por preguntas de seguridad

## Overview
Evita fuerza bruta contra `reset-password-questions` (adivinar respuestas o
enumerar correos). Sin políticas públicas — solo la Edge Function
(service role) la toca, vía la función `check_and_log_password_reset_attempt`.

## New Tables
- `password_reset_attempts`: un registro por intento (get_questions o
  verify_and_reset), con email, ip y momento. Solo se usa para contar
  intentos recientes; no se limpia automáticamente todavía.

## Rate limit
- Máximo 5 intentos cada 15 minutos, contados por email O por ip — lo que
  se alcance primero. Así se frena tanto un ataque a un único correo desde
  varias IPs como una IP probando muchos correos.
*/

CREATE TABLE IF NOT EXISTS password_reset_attempts (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  ip TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_email_time
  ON password_reset_attempts (email, created_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_ip_time
  ON password_reset_attempts (ip, created_at);

ALTER TABLE password_reset_attempts ENABLE ROW LEVEL SECURITY;
-- Intencionalmente sin políticas: ni anon ni authenticated pueden leer o
-- escribir esta tabla directamente. Solo la Edge Function (service role)
-- la toca, a través de la función de abajo.

-- Cuenta los intentos recientes (por email o por ip) dentro de la ventana.
-- Si ya se alcanzó el máximo, NO registra un intento nuevo (evita que el
-- spam del bloqueo infle la tabla) y devuelve false. Si hay cupo, registra
-- el intento y devuelve true.
CREATE OR REPLACE FUNCTION check_and_log_password_reset_attempt(
  p_email TEXT,
  p_ip TEXT,
  p_max_attempts INT DEFAULT 5,
  p_window_minutes INT DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count
  FROM password_reset_attempts
  WHERE (lower(email) = lower(trim(p_email)) OR ip = p_ip)
    AND created_at > now() - (p_window_minutes || ' minutes')::interval;

  IF v_count >= p_max_attempts THEN
    RETURN false;
  END IF;

  INSERT INTO password_reset_attempts (email, ip) VALUES (lower(trim(p_email)), p_ip);
  RETURN true;
END;
$$;
