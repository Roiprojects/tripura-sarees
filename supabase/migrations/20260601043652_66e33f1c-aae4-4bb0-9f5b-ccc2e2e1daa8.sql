
-- 1. Coupons: restrict public read to authenticated users only
DROP POLICY IF EXISTS "coupons read active" ON public.coupons;
CREATE POLICY "coupons read active authenticated"
ON public.coupons
FOR SELECT
TO authenticated
USING (active = true);

REVOKE SELECT ON public.coupons FROM anon;

-- 2. video_consultations: tighten INSERT policy
DROP POLICY IF EXISTS "anyone can request consultation" ON public.video_consultations;
CREATE POLICY "anyone can request consultation"
ON public.video_consultations
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  )
);

-- 3. user_roles: restrictive policy preventing non-admins from inserting roles
CREATE POLICY "only admins can insert roles (restrictive)"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
