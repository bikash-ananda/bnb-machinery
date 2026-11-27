-- Dedicated Neon public catalog database ONLY. Never apply to the private VPS database.
CREATE TABLE IF NOT EXISTS public_products (
 source_id uuid PRIMARY KEY, slug text NOT NULL UNIQUE, name_en text NOT NULL, name_ne text,
 description_en text, description_ne text, model text, part_number text,
 applications jsonb NOT NULL DEFAULT '[]'::jsonb, brand_name text, brand_slug text,
 category_name_en text, category_name_ne text, category_slug text,
 price_paisa bigint, mrp_paisa bigint,
 price_mode text NOT NULL CHECK (price_mode IN ('FIXED', 'PRICE_ON_REQUEST')),
 availability_label text NOT NULL CHECK (availability_label IN ('AVAILABLE', 'OUT_OF_STOCK', 'ON_REQUEST')),
 specs jsonb NOT NULL DEFAULT '[]'::jsonb, media jsonb NOT NULL DEFAULT '[]'::jsonb,
 search_document text NOT NULL DEFAULT '', is_published boolean NOT NULL DEFAULT false,
 source_version bigint NOT NULL, source_updated_at timestamptz NOT NULL, synced_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT public_products_price_mode_guard CHECK ((price_mode = 'PRICE_ON_REQUEST' AND price_paisa IS NULL AND mrp_paisa IS NULL) OR price_mode = 'FIXED')
);
CREATE INDEX IF NOT EXISTS public_products_published_name_idx ON public_products (name_en) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS public_products_category_idx ON public_products (category_slug) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS public_products_brand_idx ON public_products (brand_slug) WHERE is_published = true;
