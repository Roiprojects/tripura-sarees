
-- 1) newsletter_subscribers: add a scoped public INSERT policy (email-only via trigger validation)
DROP POLICY IF EXISTS "Public can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Public can subscribe to newsletter"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 3 AND 320
    AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

GRANT INSERT (email, source) ON public.newsletter_subscribers TO anon, authenticated;

-- 2) storage.objects: restrict listing on public buckets to admins/staff only
--    (public object URLs continue to work; only bucket listing is scoped)
DROP POLICY IF EXISTS "Authenticated can list product-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can list homepage-media" ON storage.objects;

CREATE POLICY "Admins/staff can list product-images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_staff_permission(auth.uid(), 'products', 'view')
    )
  );

CREATE POLICY "Admins can list homepage-media"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'homepage-media'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 3) video_consultations: tighten INSERT policy to bind user_id to auth.uid() when authenticated
DROP POLICY IF EXISTS "anyone can request consultation" ON public.video_consultations;

CREATE POLICY "Public can request consultation"
  ON public.video_consultations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND (
      -- Anonymous submitters must not claim a user_id
      (auth.uid() IS NULL AND user_id IS NULL)
      -- Authenticated submitters must bind to their own uid
      OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    )
    AND customer_name IS NOT NULL AND length(customer_name) BETWEEN 1 AND 120
    AND phone IS NOT NULL AND length(phone) BETWEEN 6 AND 20
  );
