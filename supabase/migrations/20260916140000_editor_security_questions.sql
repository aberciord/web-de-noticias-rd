/*
# Preguntas de seguridad para editores + invitaciones internas

## Overview
Reemplaza la recuperación de contraseña por correo con un flujo de
2 preguntas de seguridad, y prepara la tabla para que nuevos editores
solo puedan crearse desde dentro del panel (por un editor ya autenticado),
nunca por registro público.

## New Tables
- `editor_security_questions`: guarda 2 preguntas y las respuestas
  hasheadas (pgcrypto) por editor. Sin políticas públicas — solo se
  accede desde Edge Functions con la service role key.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS editor_security_questions (
  editor_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  question_1 TEXT NOT NULL,
  answer_1_hash TEXT NOT NULL,
  question_2 TEXT NOT NULL,
  answer_2_hash TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE editor_security_questions ENABLE ROW LEVEL SECURITY;
-- Intencionalmente sin políticas: ni anon ni authenticated pueden leer o
-- escribir esta tabla directamente. Solo las Edge Functions (service role)
-- la tocan, para que las respuestas nunca sean legibles desde el cliente.

-- Guarda (o reemplaza) las 2 preguntas/respuestas de un editor. Las
-- respuestas se guardan hasheadas con pgcrypto (bcrypt), nunca en texto
-- plano. Solo la service role puede ejecutar esto en la práctica.
CREATE OR REPLACE FUNCTION set_editor_security_questions(
  p_editor_id UUID,
  p_question_1 TEXT,
  p_answer_1 TEXT,
  p_question_2 TEXT,
  p_answer_2 TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO editor_security_questions (editor_id, question_1, answer_1_hash, question_2, answer_2_hash)
  VALUES (
    p_editor_id,
    p_question_1,
    crypt(lower(trim(p_answer_1)), gen_salt('bf')),
    p_question_2,
    crypt(lower(trim(p_answer_2)), gen_salt('bf'))
  )
  ON CONFLICT (editor_id) DO UPDATE SET
    question_1 = EXCLUDED.question_1,
    answer_1_hash = EXCLUDED.answer_1_hash,
    question_2 = EXCLUDED.question_2,
    answer_2_hash = EXCLUDED.answer_2_hash;
END;
$$;

-- Compara las respuestas dadas contra los hashes guardados. Devuelve
-- false (en vez de error) si el editor no tiene preguntas configuradas.
CREATE OR REPLACE FUNCTION verify_editor_security_answers(
  p_editor_id UUID,
  p_answer_1 TEXT,
  p_answer_2 TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash_1 TEXT;
  v_hash_2 TEXT;
BEGIN
  SELECT answer_1_hash, answer_2_hash INTO v_hash_1, v_hash_2
  FROM editor_security_questions WHERE editor_id = p_editor_id;

  IF v_hash_1 IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_hash_1 = crypt(lower(trim(p_answer_1)), v_hash_1)
     AND v_hash_2 = crypt(lower(trim(p_answer_2)), v_hash_2);
END;
$$;
