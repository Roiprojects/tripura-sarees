
ALTER TABLE public.filter_options DROP CONSTRAINT IF EXISTS filter_options_field_check;
ALTER TABLE public.filter_options
  ADD CONSTRAINT filter_options_field_check
  CHECK (field = ANY (ARRAY['collection','gender','brand','size','color','occasion']));
