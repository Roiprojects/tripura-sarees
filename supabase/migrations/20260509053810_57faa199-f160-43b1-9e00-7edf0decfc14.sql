
-- Extend homepage_sections
ALTER TABLE public.homepage_sections
  ADD COLUMN IF NOT EXISTS device text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS layout text NOT NULL DEFAULT 'carousel',
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS cta_url text,
  ADD COLUMN IF NOT EXISTS bg_color text;

-- homepage_banners
CREATE TABLE IF NOT EXISTS public.homepage_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  title text,
  subtitle text,
  image_desktop text,
  image_mobile text,
  cta_label text,
  cta_url text,
  sort_order integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.homepage_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banners public read" ON public.homepage_banners
  FOR SELECT USING (visible = true);
CREATE POLICY "admins manage homepage_banners" ON public.homepage_banners
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

-- section_products
CREATE TABLE IF NOT EXISTS public.section_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_id, product_id)
);
ALTER TABLE public.section_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "section_products public read" ON public.section_products
  FOR SELECT USING (true);
CREATE POLICY "admins manage section_products" ON public.section_products
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

-- section_categories
CREATE TABLE IF NOT EXISTS public.section_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_id, category_id)
);
ALTER TABLE public.section_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "section_categories public read" ON public.section_categories
  FOR SELECT USING (true);
CREATE POLICY "admins manage section_categories" ON public.section_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

-- homepage_settings (singleton)
CREATE TABLE IF NOT EXISTS public.homepage_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_title text,
  hero_autoplay_ms integer NOT NULL DEFAULT 5000,
  mobile_breakpoint integer NOT NULL DEFAULT 768,
  default_cta_color text,
  maintenance_mode boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.homepage_settings
  FOR SELECT USING (true);
CREATE POLICY "admins manage homepage_settings" ON public.homepage_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));
INSERT INTO public.homepage_settings (site_title) VALUES ('Your Store')
  ON CONFLICT DO NOTHING;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('homepage-media','homepage-media',true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "homepage-media public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'homepage-media');
CREATE POLICY "admins upload homepage-media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'homepage-media' AND has_role(auth.uid(),'admin'));
CREATE POLICY "admins update homepage-media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'homepage-media' AND has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete homepage-media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'homepage-media' AND has_role(auth.uid(),'admin'));
