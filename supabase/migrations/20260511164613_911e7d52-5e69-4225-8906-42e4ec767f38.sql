
CREATE TABLE public.shop_by_age (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_key TEXT NOT NULL,
  label TEXT NOT NULL,
  image_url TEXT,
  link_url TEXT NOT NULL DEFAULT '/',
  sort_order INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_by_age ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_by_age public read"
  ON public.shop_by_age FOR SELECT
  USING (visible = true);

CREATE POLICY "admins manage shop_by_age"
  ON public.shop_by_age FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.shop_by_age (group_key, label, link_url, sort_order) VALUES
  ('girls','0-2 Years','/girls',1),
  ('girls','2-5 Years','/girls',2),
  ('girls','6-12 Years','/girls',3),
  ('girls','Teens','/girls',4),
  ('boys','0-2 Years','/boys',1),
  ('boys','2-5 Years','/boys',2),
  ('boys','6-12 Years','/boys',3),
  ('boys','Teens','/boys',4);
