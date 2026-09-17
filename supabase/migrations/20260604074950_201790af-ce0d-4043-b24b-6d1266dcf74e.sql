CREATE TABLE public.product_color_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_name text NOT NULL,
  hex_code text,
  images text[] NOT NULL DEFAULT '{}',
  stock_quantity integer NOT NULL DEFAULT 0,
  sku_code text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, color_name)
);

CREATE INDEX product_color_variants_product_idx ON public.product_color_variants(product_id);

GRANT SELECT ON public.product_color_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_color_variants TO authenticated;
GRANT ALL ON public.product_color_variants TO service_role;

ALTER TABLE public.product_color_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "color variants public read" ON public.product_color_variants FOR SELECT TO public USING (true);
CREATE POLICY "admins manage color variants" ON public.product_color_variants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_product_color_variants_updated_at
BEFORE UPDATE ON public.product_color_variants
FOR EACH ROW EXECUTE FUNCTION public.product_variants_touch_updated_at();