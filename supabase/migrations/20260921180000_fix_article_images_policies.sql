-- Políticas del bucket sin depender del search_path: tabla calificada (public.editors).
DROP POLICY IF EXISTS "article_images_insert" ON storage.objects;
CREATE POLICY "article_images_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'article-images'
    AND EXISTS (SELECT 1 FROM public.editors WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "article_images_update" ON storage.objects;
CREATE POLICY "article_images_update" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'article-images'
    AND EXISTS (SELECT 1 FROM public.editors WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "article_images_delete" ON storage.objects;
CREATE POLICY "article_images_delete" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'article-images'
    AND EXISTS (SELECT 1 FROM public.editors WHERE id = auth.uid())
  );
