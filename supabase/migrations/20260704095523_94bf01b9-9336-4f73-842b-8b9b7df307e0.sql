ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS specifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS care_instructions text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS country_of_origin text;