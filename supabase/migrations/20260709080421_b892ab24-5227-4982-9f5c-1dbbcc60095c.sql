
CREATE TABLE public.occasion_tiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  link TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Sparkles',
  gradient TEXT NOT NULL DEFAULT 'from-sky-100 via-cyan-100 to-emerald-100',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.occasion_tiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.occasion_tiles TO authenticated;
GRANT ALL ON public.occasion_tiles TO service_role;

ALTER TABLE public.occasion_tiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active occasion tiles"
  ON public.occasion_tiles FOR SELECT
  USING (active = true OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_staff_permission(auth.uid(),'homepage','view'));

CREATE POLICY "Admins can insert occasion tiles"
  ON public.occasion_tiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_staff_permission(auth.uid(),'homepage','edit'));

CREATE POLICY "Admins can update occasion tiles"
  ON public.occasion_tiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_staff_permission(auth.uid(),'homepage','edit'))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_staff_permission(auth.uid(),'homepage','edit'));

CREATE POLICY "Admins can delete occasion tiles"
  ON public.occasion_tiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_staff_permission(auth.uid(),'homepage','edit'));

CREATE TRIGGER occasion_tiles_touch_updated_at
  BEFORE UPDATE ON public.occasion_tiles
  FOR EACH ROW EXECUTE FUNCTION public.filter_options_touch_updated_at();

INSERT INTO public.occasion_tiles (label, description, link, icon, gradient, sort_order) VALUES
  ('Ethnic & Festive','Traditional outfits for celebrations','/ethnic-store','Gift','from-rose-100 via-pink-100 to-amber-100',1),
  ('Party Wear','Show-stopping looks for every party','/party-store','Sparkles','from-violet-100 via-fuchsia-100 to-pink-100',2),
  ('Birthday Bash','Make their big day unforgettable','/birthday-bash','Cake','from-amber-100 via-yellow-100 to-rose-100',3),
  ('Casual & Daily','Comfy everyday essentials','/casual-store','Shirt','from-sky-100 via-cyan-100 to-emerald-100',4),
  ('Frocks & Dresses','Twirl-worthy frocks for little stars','/frock-store','Flower2','from-pink-100 via-rose-100 to-fuchsia-100',5),
  ('New Arrivals','Fresh picks just for the season','/new','Star','from-emerald-100 via-teal-100 to-sky-100',6);
