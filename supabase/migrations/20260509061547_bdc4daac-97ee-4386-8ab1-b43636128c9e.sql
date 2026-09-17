
-- Extend categories with gender, banner image, visibility & homepage section binding
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS section_key text;

CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_gender ON public.categories(gender);
CREATE INDEX IF NOT EXISTS idx_categories_visible ON public.categories(visible);

-- Backfill gender on existing root + descendant nodes based on root slug prefix
UPDATE public.categories c
SET gender = CASE
  WHEN c.slug LIKE 'boys%'  OR EXISTS (SELECT 1 FROM public.categories r WHERE r.id = c.parent_id AND r.slug LIKE 'boys%')  THEN 'boys'
  WHEN c.slug LIKE 'girls%' OR EXISTS (SELECT 1 FROM public.categories r WHERE r.id = c.parent_id AND r.slug LIKE 'girls%') THEN 'girls'
  WHEN c.slug LIKE 'baby%'  OR c.slug LIKE 'infant%'
       OR EXISTS (SELECT 1 FROM public.categories r WHERE r.id = c.parent_id AND (r.slug LIKE 'baby%' OR r.slug LIKE 'infant%')) THEN 'baby'
  ELSE c.gender
END
WHERE c.gender IS NULL;
