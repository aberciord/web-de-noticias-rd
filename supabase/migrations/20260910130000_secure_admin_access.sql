/*
# Secure admin access with a real editors allowlist

## Problem
All "authenticated" RLS policies (sources, raw_items, articles, banners)
granted full CRUD to ANY authenticated user, and the admin login screen let
anyone self-register via `supabase.auth.signUp`. In practice this meant any
visitor could create an account and get full editorial access.

## Fix
- New `editors` table: an explicit allowlist of user ids allowed to manage
  content. No INSERT/UPDATE/DELETE policy is granted to anon/authenticated —
  rows can only be added with the service role key (Supabase SQL editor or
  dashboard), never from the app.
- `is_editor()` helper function: checks whether the current auth.uid() has a
  row in `editors`.
- All admin-only RLS policies on sources, raw_items, articles, banners now
  require `is_editor()` instead of just `authenticated`.
- Public read policies (published articles, active banners) are untouched.
*/

-- ============================================================
-- EDITORS ALLOWLIST
-- ============================================================
CREATE TABLE IF NOT EXISTS editors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE editors ENABLE ROW LEVEL SECURITY;

-- A user may only see their own editor row (used by is_editor()).
-- No insert/update/delete policy exists: rows are managed only via the
-- service role key, never from the anon/authenticated client.
DROP POLICY IF EXISTS "editors_select_self" ON editors;
CREATE POLICY "editors_select_self" ON editors FOR SELECT
  TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION is_editor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM editors WHERE id = auth.uid());
$$;

-- ============================================================
-- SOURCES: replace authenticated-only policies with is_editor()
-- ============================================================
DROP POLICY IF EXISTS "sources_select_authenticated" ON sources;
CREATE POLICY "sources_select_authenticated" ON sources FOR SELECT
  TO authenticated USING (is_editor());

DROP POLICY IF EXISTS "sources_insert_authenticated" ON sources;
CREATE POLICY "sources_insert_authenticated" ON sources FOR INSERT
  TO authenticated WITH CHECK (is_editor());

DROP POLICY IF EXISTS "sources_update_authenticated" ON sources;
CREATE POLICY "sources_update_authenticated" ON sources FOR UPDATE
  TO authenticated USING (is_editor()) WITH CHECK (is_editor());

DROP POLICY IF EXISTS "sources_delete_authenticated" ON sources;
CREATE POLICY "sources_delete_authenticated" ON sources FOR DELETE
  TO authenticated USING (is_editor());

-- ============================================================
-- RAW ITEMS
-- ============================================================
DROP POLICY IF EXISTS "raw_items_select_authenticated" ON raw_items;
CREATE POLICY "raw_items_select_authenticated" ON raw_items FOR SELECT
  TO authenticated USING (is_editor());

DROP POLICY IF EXISTS "raw_items_insert_authenticated" ON raw_items;
CREATE POLICY "raw_items_insert_authenticated" ON raw_items FOR INSERT
  TO authenticated WITH CHECK (is_editor());

DROP POLICY IF EXISTS "raw_items_update_authenticated" ON raw_items;
CREATE POLICY "raw_items_update_authenticated" ON raw_items FOR UPDATE
  TO authenticated USING (is_editor()) WITH CHECK (is_editor());

DROP POLICY IF EXISTS "raw_items_delete_authenticated" ON raw_items;
CREATE POLICY "raw_items_delete_authenticated" ON raw_items FOR DELETE
  TO authenticated USING (is_editor());

-- ============================================================
-- ARTICLES (public "published" select policy is untouched)
-- ============================================================
DROP POLICY IF EXISTS "articles_select_authenticated" ON articles;
CREATE POLICY "articles_select_authenticated" ON articles FOR SELECT
  TO authenticated USING (is_editor());

DROP POLICY IF EXISTS "articles_insert_authenticated" ON articles;
CREATE POLICY "articles_insert_authenticated" ON articles FOR INSERT
  TO authenticated WITH CHECK (is_editor());

DROP POLICY IF EXISTS "articles_update_authenticated" ON articles;
CREATE POLICY "articles_update_authenticated" ON articles FOR UPDATE
  TO authenticated USING (is_editor()) WITH CHECK (is_editor());

DROP POLICY IF EXISTS "articles_delete_authenticated" ON articles;
CREATE POLICY "articles_delete_authenticated" ON articles FOR DELETE
  TO authenticated USING (is_editor());

-- ============================================================
-- BANNERS (public "active" select policy is untouched)
-- ============================================================
DROP POLICY IF EXISTS "banners_select_authenticated" ON banners;
CREATE POLICY "banners_select_authenticated" ON banners FOR SELECT
  TO authenticated USING (is_editor());

DROP POLICY IF EXISTS "banners_insert_authenticated" ON banners;
CREATE POLICY "banners_insert_authenticated" ON banners FOR INSERT
  TO authenticated WITH CHECK (is_editor());

DROP POLICY IF EXISTS "banners_update_authenticated" ON banners;
CREATE POLICY "banners_update_authenticated" ON banners FOR UPDATE
  TO authenticated USING (is_editor()) WITH CHECK (is_editor());

DROP POLICY IF EXISTS "banners_delete_authenticated" ON banners;
CREATE POLICY "banners_delete_authenticated" ON banners FOR DELETE
  TO authenticated USING (is_editor());
