ALTER TABLE public.products ADD COLUMN IF NOT EXISTS age_groups text[] NOT NULL DEFAULT '{}'::text[];
CREATE INDEX IF NOT EXISTS idx_products_age_groups ON public.products USING gin (age_groups);