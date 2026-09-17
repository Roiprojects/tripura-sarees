-- Add gender scoping to filter_options so admin can manage
-- Boys / Girls / All size lists separately.
ALTER TABLE public.filter_options
  ADD COLUMN IF NOT EXISTS gender text;

-- Normalize: NULL or 'all' = shown for everyone; 'boys' / 'girls' = scoped.
UPDATE public.filter_options SET gender = NULL WHERE gender = 'all';

CREATE INDEX IF NOT EXISTS filter_options_field_gender_idx
  ON public.filter_options (field, gender);

-- Drop the old unique constraint on (field, value) if present, since
-- the same size value can now legitimately exist under different genders.
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c
  FROM pg_constraint
  WHERE conrelid = 'public.filter_options'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 2;
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.filter_options DROP CONSTRAINT %I', c);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS filter_options_field_gender_value_uniq
  ON public.filter_options (field, COALESCE(gender, ''), lower(value));
