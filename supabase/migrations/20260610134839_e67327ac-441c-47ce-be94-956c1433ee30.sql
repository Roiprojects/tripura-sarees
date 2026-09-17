
-- Extend product_variants to support per (color × size) SKUs with their own stock & price.
-- color_name is empty string for legacy "size-only" rows so existing data keeps working.

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS color_name text NOT NULL DEFAULT '';

-- Replace the old (product_id, size) unique with (product_id, size, color_name)
ALTER TABLE public.product_variants
  DROP CONSTRAINT IF EXISTS product_variants_product_id_size_key;

ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_product_size_color_key
  UNIQUE (product_id, size, color_name);

CREATE INDEX IF NOT EXISTS product_variants_product_color_idx
  ON public.product_variants (product_id, color_name);
