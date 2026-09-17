
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS section_keys text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_trending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_on_homepage boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_products_section_keys ON public.products USING GIN(section_keys);
CREATE INDEX IF NOT EXISTS idx_products_tags ON public.products USING GIN(tags);
