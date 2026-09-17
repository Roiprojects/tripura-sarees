
CREATE TABLE public.shop_filter_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  label text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shop_filter_visibility TO anon, authenticated;
GRANT ALL ON public.shop_filter_visibility TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.shop_filter_visibility TO authenticated;

ALTER TABLE public.shop_filter_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_filter_visibility public read"
  ON public.shop_filter_visibility FOR SELECT USING (true);

CREATE POLICY "shop_filter_visibility admin insert"
  ON public.shop_filter_visibility FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "shop_filter_visibility admin update"
  ON public.shop_filter_visibility FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "shop_filter_visibility admin delete"
  ON public.shop_filter_visibility FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_shop_filter_visibility_updated
  BEFORE UPDATE ON public.shop_filter_visibility
  FOR EACH ROW EXECUTE FUNCTION public.filter_options_touch_updated_at();

INSERT INTO public.shop_filter_visibility (section_key, label, visible, sort_order) VALUES
  ('gender',       'Gender',       true,  1),
  ('age',          'Age',          true,  2),
  ('price',        'Price',        true,  3),
  ('category',     'Category',     true,  4),
  ('occasion',     'Occasion',     false, 5),
  ('color',        'Color',        false, 6),
  ('size',         'Size',         false, 7),
  ('availability', 'Availability', false, 8);
