/*
# News Portal RD - Core Schema

## Overview
Creates the complete schema for a Dominican Republic news portal with:
- Sources: RSS feed sources for automated news collection
- Raw items: Items collected from RSS feeds (not shown publicly)
- Articles: News articles in Spanish + English (with review workflow)
- Banners: Advertising/promotional banners displayed on the site

## Tables

### sources
- Configurable RSS feed sources grouped by category
- Fields: name, feed_url, category, language, active, created_at
- Admin-only write; admin-only read (contains pipeline config)

### raw_items
- Items harvested from RSS feeds - used internally by AI pipeline only
- Never exposed on public frontend
- Fields: source_id, category, titulo_original, resumen_original, url_original, fecha_publicacion, procesado, seleccionado

### articles
- The core content table - both AI-generated and manually created articles
- Bilingual (Spanish + English) with SEO summary
- Workflow states: pendiente_revision -> aprobado/rechazado -> publicado
- raw_item_id nullable (NULL = manual upload)
- autor field: 'IA' for AI-generated, editor name for manual
- imagen_url: licensed stock image URL

### banners
- Advertising/promotional banners independent of editorial content
- Positions: header, sidebar, entre_articulos, footer
- Fields: posicion, imagen_url, link, titulo, activo

## Security (RLS)
- articles: public SELECT for published articles (estado = 'publicado'); full CRUD for authenticated editors
- banners: public SELECT for active banners; full CRUD for authenticated editors
- sources: full CRUD for authenticated editors only
- raw_items: full CRUD for authenticated editors only (internal pipeline data)

## Notes
- Categories: noticias, deportes, politica, farandula
- Article states: pendiente_revision, aprobado, rechazado, publicado
- All public reads use TO anon, authenticated so the anon-key frontend works
- Admin writes use TO authenticated with ownership via auth.uid()
*/

-- ============================================================
-- SOURCES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  feed_url TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('noticias','deportes','politica','farandula')),
  idioma TEXT DEFAULT 'es',
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sources_select_authenticated" ON sources;
CREATE POLICY "sources_select_authenticated" ON sources FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "sources_insert_authenticated" ON sources;
CREATE POLICY "sources_insert_authenticated" ON sources FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "sources_update_authenticated" ON sources;
CREATE POLICY "sources_update_authenticated" ON sources FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sources_delete_authenticated" ON sources;
CREATE POLICY "sources_delete_authenticated" ON sources FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- RAW ITEMS TABLE (internal pipeline, not public)
-- ============================================================
CREATE TABLE IF NOT EXISTS raw_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL CHECK (categoria IN ('noticias','deportes','politica','farandula')),
  titulo_original TEXT NOT NULL,
  resumen_original TEXT,
  url_original TEXT NOT NULL,
  fecha_publicacion TIMESTAMPTZ,
  fecha_recoleccion TIMESTAMPTZ DEFAULT now(),
  procesado BOOLEAN DEFAULT false,
  seleccionado BOOLEAN DEFAULT false
);

ALTER TABLE raw_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "raw_items_select_authenticated" ON raw_items;
CREATE POLICY "raw_items_select_authenticated" ON raw_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "raw_items_insert_authenticated" ON raw_items;
CREATE POLICY "raw_items_insert_authenticated" ON raw_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "raw_items_update_authenticated" ON raw_items;
CREATE POLICY "raw_items_update_authenticated" ON raw_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "raw_items_delete_authenticated" ON raw_items;
CREATE POLICY "raw_items_delete_authenticated" ON raw_items FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- ARTICLES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_item_id UUID REFERENCES raw_items(id) ON DELETE SET NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('noticias','deportes','politica','farandula')),
  titulo_es TEXT NOT NULL,
  cuerpo_es TEXT NOT NULL,
  titulo_en TEXT NOT NULL,
  cuerpo_en TEXT NOT NULL,
  resumen_seo TEXT,
  fuente_nombre TEXT,
  fuente_url TEXT,
  imagen_url TEXT,
  autor TEXT DEFAULT 'IA',
  estado TEXT NOT NULL DEFAULT 'pendiente_revision'
    CHECK (estado IN ('pendiente_revision','aprobado','rechazado','publicado')),
  creado_en TIMESTAMPTZ DEFAULT now(),
  publicado_en TIMESTAMPTZ
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Public can read only published articles
DROP POLICY IF EXISTS "articles_select_public" ON articles;
CREATE POLICY "articles_select_public" ON articles FOR SELECT
  TO anon, authenticated
  USING (estado = 'publicado');

-- Authenticated editors can see all articles (for review queue)
DROP POLICY IF EXISTS "articles_select_authenticated" ON articles;
CREATE POLICY "articles_select_authenticated" ON articles FOR SELECT
  TO authenticated USING (true);

-- Authenticated editors can insert
DROP POLICY IF EXISTS "articles_insert_authenticated" ON articles;
CREATE POLICY "articles_insert_authenticated" ON articles FOR INSERT
  TO authenticated WITH CHECK (true);

-- Authenticated editors can update
DROP POLICY IF EXISTS "articles_update_authenticated" ON articles;
CREATE POLICY "articles_update_authenticated" ON articles FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Authenticated editors can delete
DROP POLICY IF EXISTS "articles_delete_authenticated" ON articles;
CREATE POLICY "articles_delete_authenticated" ON articles FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- BANNERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posicion TEXT NOT NULL CHECK (posicion IN ('header','sidebar','entre_articulos','footer')),
  titulo TEXT,
  imagen_url TEXT NOT NULL,
  link TEXT,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Public can read active banners
DROP POLICY IF EXISTS "banners_select_public" ON banners;
CREATE POLICY "banners_select_public" ON banners FOR SELECT
  TO anon, authenticated
  USING (activo = true);

-- Authenticated editors can see all banners
DROP POLICY IF EXISTS "banners_select_authenticated" ON banners;
CREATE POLICY "banners_select_authenticated" ON banners FOR SELECT
  TO authenticated USING (true);

-- Authenticated editors can insert
DROP POLICY IF EXISTS "banners_insert_authenticated" ON banners;
CREATE POLICY "banners_insert_authenticated" ON banners FOR INSERT
  TO authenticated WITH CHECK (true);

-- Authenticated editors can update
DROP POLICY IF EXISTS "banners_update_authenticated" ON banners;
CREATE POLICY "banners_update_authenticated" ON banners FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Authenticated editors can delete
DROP POLICY IF EXISTS "banners_delete_authenticated" ON banners;
CREATE POLICY "banners_delete_authenticated" ON banners FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_articles_estado ON articles(estado);
CREATE INDEX IF NOT EXISTS idx_articles_categoria ON articles(categoria);
CREATE INDEX IF NOT EXISTS idx_articles_publicado_en ON articles(publicado_en DESC);
CREATE INDEX IF NOT EXISTS idx_raw_items_procesado ON raw_items(procesado);
CREATE INDEX IF NOT EXISTS idx_raw_items_seleccionado ON raw_items(seleccionado);
CREATE INDEX IF NOT EXISTS idx_sources_activo ON sources(activo);
CREATE INDEX IF NOT EXISTS idx_banners_posicion_activo ON banners(posicion, activo);
