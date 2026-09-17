
-- Phase 1: Schema foundation for search, size-wise discounts, preorder, brand size guides

-- Enable trigram for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Products: add sku_id, design_number, brand, preorder fields, size_guide_id
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku_id text,
  ADD COLUMN IF NOT EXISTS design_number text,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS preorder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preorder_status text NOT NULL DEFAULT 'in_stock'
    CHECK (preorder_status IN ('in_stock','out_of_stock','coming_soon','preorder')),
  ADD COLUMN IF NOT EXISTS preorder_available_date date,
  ADD COLUMN IF NOT EXISTS preorder_message text,
  ADD COLUMN IF NOT EXISTS preorder_stock_limit integer,
  ADD COLUMN IF NOT EXISTS size_guide_id uuid;

-- Trigram indexes for fast partial search
CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON public.products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_sku_trgm_idx ON public.products USING gin (sku_id gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_design_trgm_idx ON public.products USING gin (design_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_brand_trgm_idx ON public.products USING gin (brand gin_trgm_ops);

-- 2. Product variants: size-wise discount + availability
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) NOT NULL DEFAULT 0
    CHECK (discount_percent >= 0 AND discount_percent <= 100),
  ADD COLUMN IF NOT EXISTS available boolean NOT NULL DEFAULT true;

-- 3. Order items: mark preorders
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS is_preorder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preorder_available_date date;

CREATE INDEX IF NOT EXISTS order_items_preorder_idx
  ON public.order_items (is_preorder) WHERE is_preorder = true;

-- 4. Size guides table (brand-wise)
CREATE TABLE IF NOT EXISTS public.size_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  title text NOT NULL,
  notes text,
  image_url text,
  -- measurements: [{ size:"S", chest:32, waist:26, ... }]
  measurements jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.size_guides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.size_guides TO authenticated;
GRANT ALL ON public.size_guides TO service_role;

ALTER TABLE public.size_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view size guides"
  ON public.size_guides FOR SELECT
  USING (true);

CREATE POLICY "Admins and staff can manage size guides"
  ON public.size_guides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_staff_permission(auth.uid(), 'products', 'edit'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role)
              OR public.has_staff_permission(auth.uid(), 'products', 'edit'));

-- FK for products.size_guide_id -> size_guides.id (SET NULL on delete)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_size_guide_id_fkey'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_size_guide_id_fkey
      FOREIGN KEY (size_guide_id) REFERENCES public.size_guides(id) ON DELETE SET NULL;
  END IF;
END $$;

-- updated_at trigger for size_guides
CREATE OR REPLACE FUNCTION public.size_guides_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS size_guides_touch_updated_at ON public.size_guides;
CREATE TRIGGER size_guides_touch_updated_at
  BEFORE UPDATE ON public.size_guides
  FOR EACH ROW EXECUTE FUNCTION public.size_guides_touch_updated_at();
