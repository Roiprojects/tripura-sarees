CREATE TABLE public.video_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  customer_name text NOT NULL,
  phone text NOT NULL,
  category text,
  preferred_date date NOT NULL,
  preferred_time text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_consultations ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. guests) can request a consultation
CREATE POLICY "anyone can request consultation"
  ON public.video_consultations
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Users can read their own
CREATE POLICY "users read own consultations"
  ON public.video_consultations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all
CREATE POLICY "admins read all consultations"
  ON public.video_consultations
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update / delete
CREATE POLICY "admins manage consultations"
  ON public.video_consultations
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_video_consultations_created_at ON public.video_consultations(created_at DESC);
CREATE INDEX idx_video_consultations_user ON public.video_consultations(user_id);