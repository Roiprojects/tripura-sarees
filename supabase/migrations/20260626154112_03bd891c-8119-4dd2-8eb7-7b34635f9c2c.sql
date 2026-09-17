
-- Remove public INSERT policy that allowed anyone to write to the subscribers table directly.
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;

-- Lock down direct table grants for anon (admin SELECT/DELETE policies remain for authenticated admins).
REVOKE INSERT ON public.newsletter_subscribers FROM anon;
REVOKE INSERT ON public.newsletter_subscribers FROM authenticated;

-- Provide a safe RPC for newsletter signup that never returns existing rows
-- (prevents email enumeration / exposure of the subscriber list).
CREATE OR REPLACE FUNCTION public.subscribe_newsletter(p_email text, p_source text DEFAULT 'homepage')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
BEGIN
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  INSERT INTO public.newsletter_subscribers(email, source)
  VALUES (v_email, coalesce(nullif(btrim(p_source), ''), 'homepage'))
  ON CONFLICT (email) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.subscribe_newsletter(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscribe_newsletter(text, text) TO anon, authenticated;
