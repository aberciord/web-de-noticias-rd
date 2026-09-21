-- Renombra la categoría 'farandula' a 'entretenimiento' en todas las tablas.
-- Las políticas RLS no dependen del valor de categoría, así que no se tocan.

DO $$
DECLARE r record;
BEGIN
  -- Quita los CHECK sobre categoria (nombres autogenerados) para poder migrar datos.
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, c.conname
    FROM pg_constraint c
    WHERE c.contype = 'c'
      AND c.conrelid IN ('public.articles'::regclass, 'public.raw_items'::regclass,
                         'public.sources'::regclass, 'public.banners'::regclass)
      AND pg_get_constraintdef(c.oid) ILIKE '%categoria%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

UPDATE public.articles  SET categoria = 'entretenimiento' WHERE categoria = 'farandula';
UPDATE public.raw_items SET categoria = 'entretenimiento' WHERE categoria = 'farandula';
UPDATE public.sources   SET categoria = 'entretenimiento' WHERE categoria = 'farandula';
UPDATE public.banners   SET categoria = 'entretenimiento' WHERE categoria = 'farandula';

ALTER TABLE public.articles  ADD CONSTRAINT articles_categoria_check
  CHECK (categoria IN ('noticias','deportes','politica','entretenimiento'));
ALTER TABLE public.raw_items ADD CONSTRAINT raw_items_categoria_check
  CHECK (categoria IN ('noticias','deportes','politica','entretenimiento'));
ALTER TABLE public.sources   ADD CONSTRAINT sources_categoria_check
  CHECK (categoria IN ('noticias','deportes','politica','entretenimiento'));
ALTER TABLE public.banners   ADD CONSTRAINT banners_categoria_check
  CHECK (categoria IN ('noticias','deportes','politica','entretenimiento') OR categoria IS NULL);
