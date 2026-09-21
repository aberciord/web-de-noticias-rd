-- Bucket público para imágenes propias subidas desde el panel.
-- Lectura pública; solo editores pueden subir/modificar/borrar.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('article-images', 'article-images', true, 5242880,
        ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

DROP POLICY IF EXISTS "article_images_read" ON storage.objects;
CREATE POLICY "article_images_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'article-images');

DROP POLICY IF EXISTS "article_images_insert" ON storage.objects;
CREATE POLICY "article_images_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'article-images' AND is_editor());

DROP POLICY IF EXISTS "article_images_update" ON storage.objects;
CREATE POLICY "article_images_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'article-images' AND is_editor());

DROP POLICY IF EXISTS "article_images_delete" ON storage.objects;
CREATE POLICY "article_images_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'article-images' AND is_editor());
