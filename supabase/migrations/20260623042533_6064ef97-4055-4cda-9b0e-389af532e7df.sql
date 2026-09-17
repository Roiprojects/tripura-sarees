DROP POLICY IF EXISTS "staff_activity self insert" ON public.staff_activity_log;

DROP POLICY IF EXISTS "anyone can request consultation" ON public.video_consultations;
CREATE POLICY "authenticated users can request consultation"
  ON public.video_consultations
  FOR INSERT
  TO authenticated
  WITH CHECK (status = 'pending' AND user_id = auth.uid());