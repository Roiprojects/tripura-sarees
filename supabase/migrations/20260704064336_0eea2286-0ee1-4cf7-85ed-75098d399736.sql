
CREATE TABLE IF NOT EXISTS public.video_consultation_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.video_consultation_slots TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.video_consultation_slots TO authenticated;
GRANT ALL ON public.video_consultation_slots TO service_role;

ALTER TABLE public.video_consultation_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can view active slots"
  ON public.video_consultation_slots FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins manage slots"
  ON public.video_consultation_slots FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER video_consultation_slots_touch_updated_at
  BEFORE UPDATE ON public.video_consultation_slots
  FOR EACH ROW EXECUTE FUNCTION public.tracking_touch_updated_at();

INSERT INTO public.video_consultation_slots (label, sort_order) VALUES
  ('10:00 AM - 10:30 AM', 10),
  ('11:00 AM - 11:30 AM', 20),
  ('12:00 PM - 12:30 PM', 30),
  ('01:00 PM - 01:30 PM', 40),
  ('03:00 PM - 03:30 PM', 50),
  ('04:00 PM - 04:30 PM', 60),
  ('05:00 PM - 05:30 PM', 70),
  ('06:00 PM - 06:30 PM', 80),
  ('07:00 PM - 07:30 PM', 90)
ON CONFLICT (label) DO NOTHING;

-- Allow anyone (including anonymous) to insert consultation requests
DROP POLICY IF EXISTS "authenticated users can request consultation" ON public.video_consultations;
CREATE POLICY "anyone can request consultation"
  ON public.video_consultations FOR INSERT
  WITH CHECK (status = 'pending');

GRANT INSERT ON public.video_consultations TO anon;
