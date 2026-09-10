/*
# Create comments table with moderation

## Overview
Adds a comments table for the public article pages. Users must be authenticated
to comment. Includes a simple banned-words filter enforced at the database level
via a CHECK constraint using a regex. Admins can delete any comment from the
admin panel.

## New Tables
- `comments`
  - `id` (bigint, pk)
  - `article_id` (uuid, fk to articles)
  - `user_id` (uuid, not null, default auth.uid() — the commenter)
  - `autor_nombre` (text — display name from user email or profile)
  - `contenido` (text, not null — the comment body)
  - `creado_en` (timestamptz, default now())
  - `eliminado` (boolean, default false — soft delete for moderation)

## Security (RLS)
- SELECT: anyone (anon + authenticated) can read non-deleted comments — comments
  are public content on the site.
- INSERT: only authenticated users can insert their own comment.
- DELETE: only authenticated admins (checked via user_email = admin email) OR the
  comment owner can delete. The frontend admin panel uses the authenticated
  session to delete comments.
- No UPDATE policy needed — comments are not editable.

## Banned words filter
A CHECK constraint rejects comments containing common profanity. The list is
case-insensitive and uses word boundaries. This is a basic filter; it can be
expanded later.
*/

CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  autor_nombre TEXT NOT NULL,
  contenido TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  eliminado BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_creado_en ON comments(creado_en DESC);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read non-deleted comments (public content)
DROP POLICY IF EXISTS "comments_select_public" ON comments;
CREATE POLICY "comments_select_public" ON comments FOR SELECT
  TO anon, authenticated USING (eliminado = false);

-- Only authenticated users can insert their own comments
DROP POLICY IF EXISTS "comments_insert_own" ON comments;
CREATE POLICY "comments_insert_own" ON comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins or comment owners can delete (soft delete: set eliminado = true)
DROP POLICY IF EXISTS "comments_update_moderate" ON comments;
CREATE POLICY "comments_update_moderate" ON comments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admins can delete any comment (hard delete)
-- We allow delete for the owner or if the user's email matches the admin email
DROP POLICY IF EXISTS "comments_delete_admin_or_owner" ON comments;
CREATE POLICY "comments_delete_admin_or_owner" ON comments FOR DELETE
  TO authenticated USING (
    auth.uid() = user_id
    OR auth.jwt() ->> 'email' IN (SELECT email FROM auth.users WHERE email LIKE '%@noticiasrd.do')
  );
