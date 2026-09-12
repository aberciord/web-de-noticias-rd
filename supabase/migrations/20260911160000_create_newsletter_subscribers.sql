/*
# Newsletter subscribers

## Overview
Stores emails collected from the public "subscribe" field. Anyone can add
their own email (no auth required — it's a public sign-up form); only
editors can read the list.
*/

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  creado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_insert_public" ON newsletter_subscribers;
CREATE POLICY "newsletter_insert_public" ON newsletter_subscribers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "newsletter_select_editor" ON newsletter_subscribers;
CREATE POLICY "newsletter_select_editor" ON newsletter_subscribers FOR SELECT
  TO authenticated USING (is_editor());
