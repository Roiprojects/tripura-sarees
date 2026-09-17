
CREATE TABLE public.nav_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nav_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nav_links TO authenticated;
GRANT ALL ON public.nav_links TO service_role;

ALTER TABLE public.nav_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view visible nav links"
  ON public.nav_links FOR SELECT
  USING (visible = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert nav links"
  ON public.nav_links FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update nav links"
  ON public.nav_links FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete nav links"
  ON public.nav_links FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.nav_links_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER nav_links_updated_at
  BEFORE UPDATE ON public.nav_links
  FOR EACH ROW EXECUTE FUNCTION public.nav_links_touch_updated_at();

-- Seed with the current hardcoded links so the bar matches today's frontend
INSERT INTO public.nav_links(label, url, sort_order, visible) VALUES
  ('HOME', '/', 0, true),
  ('BOYS', '/boys', 10, true),
  ('GIRLS', '/girls', 20, true),
  ('INFANTS', '/baby', 30, true),
  ('NEW ARRIVALS', '/new', 40, true),
  ('SHOP BY OCCASION', '/shop-by-occasion', 50, true),
  ('SHOP BY AGE', '/shop-by-age', 60, true);
