/*
# Banner targeting by category

## Overview
Adds an optional `categoria` column to `banners` so a header banner can be
scoped to a single category (Noticias, Política, Deportes, Farándula)
instead of always showing the same portada banner everywhere. NULL means
"general" — shown on any page that has no more specific banner for its
category.
*/

ALTER TABLE banners ADD COLUMN IF NOT EXISTS categoria TEXT
  CHECK (categoria IN ('noticias','deportes','politica','farandula') OR categoria IS NULL);

CREATE INDEX IF NOT EXISTS idx_banners_categoria ON banners(categoria);
