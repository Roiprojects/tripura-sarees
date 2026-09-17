
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text;

CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique ON public.products (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique  ON public.products (sku)  WHERE sku  IS NOT NULL;

-- Seed main categories
INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('Boys Fashion','boys-fashion',1),
  ('Girls Fashion','girls-fashion',2),
  ('New Born Essentials','new-born-essentials',3),
  ('Birthday Bash','birthday-bash',4),
  ('New Arrivals','new-arrivals',5),
  ('Casual Wear','casual-wear',6),
  ('Party Wear','party-wear',7),
  ('Ethnic Wear','ethnic-wear',8),
  ('Western Wear','western-wear',9),
  ('Accessories','accessories',10),
  ('Frocks','frocks',11)
ON CONFLICT (slug) DO NOTHING;

-- Seed subcategories (parent_id resolved via slug)
WITH parents AS (
  SELECT id, slug FROM public.categories
)
INSERT INTO public.categories (name, slug, parent_id, sort_order)
SELECT s.name, s.slug, p.id, s.sort_order
FROM (VALUES
  ('Boys Ethnic Wear','boys-ethnic-wear','boys-fashion',1),
  ('Boys Casual Wear','boys-casual-wear','boys-fashion',2),
  ('Boys Party Wear','boys-party-wear','boys-fashion',3),
  ('Girls Frocks','girls-frocks','girls-fashion',1),
  ('Girls Western','girls-western','girls-fashion',2),
  ('Girls Party Wear','girls-party-wear','girls-fashion',3),
  ('Baby Clothing','baby-clothing','new-born-essentials',1),
  ('Baby Toys','baby-toys','new-born-essentials',2),
  ('Baby Accessories','baby-accessories','new-born-essentials',3)
) AS s(name, slug, parent_slug, sort_order)
JOIN parents p ON p.slug = s.parent_slug
ON CONFLICT (slug) DO NOTHING;
