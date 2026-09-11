/*
# Enforce comment moderation at the database level

## Problem
The banned-words filter only ran in the browser (`CommentSection.tsx`), so it
was trivially bypassed by calling the Supabase REST/JS API directly with the
anon key. The comment-delete policy also checked for admin rights via a
hardcoded email domain (`@noticiasrd.do`) instead of the real editors
allowlist introduced in `20260910130000_secure_admin_access.sql`.

## Fix
- CHECK constraint on `comments.contenido` rejecting the same banned-word list
  the frontend uses, enforced server-side with a case-insensitive regex.
- Delete policy now uses `is_editor()` instead of the hardcoded email domain.
*/

ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_no_banned_words;
ALTER TABLE comments ADD CONSTRAINT comments_no_banned_words
  CHECK (
    contenido !~* '\y(puta|puto|cabron|cabrón|imbecil|imbécil|idiota|pendejo|mamabicho|come ?mierda|coño|mierda|carajo|pinga|charro|asshole|bitch|fuck|shit|damn)\y'
  );

DROP POLICY IF EXISTS "comments_delete_admin_or_owner" ON comments;
CREATE POLICY "comments_delete_admin_or_owner" ON comments FOR DELETE
  TO authenticated USING (
    auth.uid() = user_id
    OR is_editor()
  );
