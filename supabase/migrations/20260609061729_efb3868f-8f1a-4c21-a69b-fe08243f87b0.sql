
CREATE TABLE public.reels_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url text NOT NULL,
  title text,
  status text NOT NULL DEFAULT 'active',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reels_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reels_videos TO authenticated;
GRANT ALL ON public.reels_videos TO service_role;

ALTER TABLE public.reels_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active reels"
  ON public.reels_videos FOR SELECT
  USING (status = 'active' OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage reels"
  ON public.reels_videos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER reels_videos_touch_updated_at
  BEFORE UPDATE ON public.reels_videos
  FOR EACH ROW EXECUTE FUNCTION public.tracking_touch_updated_at();

-- Allow admins to upload videos to homepage-media bucket (public read is already on by bucket)
CREATE POLICY "Admins upload to homepage-media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'homepage-media' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update homepage-media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'homepage-media' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete homepage-media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'homepage-media' AND public.has_role(auth.uid(), 'admin'::app_role));
