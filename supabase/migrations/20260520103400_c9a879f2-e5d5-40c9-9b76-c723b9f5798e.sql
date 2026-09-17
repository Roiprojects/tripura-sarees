ALTER TABLE public.homepage_banners ADD COLUMN IF NOT EXISTS group_key text;
CREATE INDEX IF NOT EXISTS idx_homepage_banners_group_key ON public.homepage_banners(group_key);