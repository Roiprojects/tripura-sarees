
-- ============ filter_options ============
CREATE TABLE public.filter_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field text NOT NULL CHECK (field IN ('collection','gender','brand')),
  value text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX filter_options_field_value_uniq
  ON public.filter_options (field, lower(value));

GRANT SELECT ON public.filter_options TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.filter_options TO authenticated;
GRANT ALL ON public.filter_options TO service_role;

ALTER TABLE public.filter_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "filter_options readable"
  ON public.filter_options FOR SELECT
  USING (active OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "filter_options admin insert"
  ON public.filter_options FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "filter_options admin update"
  ON public.filter_options FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "filter_options admin delete"
  ON public.filter_options FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.filter_options_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER filter_options_touch_updated_at
BEFORE UPDATE ON public.filter_options
FOR EACH ROW EXECUTE FUNCTION public.filter_options_touch_updated_at();

-- ============ payment_methods ============
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'Wallet',
  enabled boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_methods TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods readable"
  ON public.payment_methods FOR SELECT
  USING (enabled OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "payment_methods admin insert"
  ON public.payment_methods FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "payment_methods admin update"
  ON public.payment_methods FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "payment_methods admin delete"
  ON public.payment_methods FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.payment_methods_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER payment_methods_touch_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW EXECUTE FUNCTION public.payment_methods_touch_updated_at();

INSERT INTO public.payment_methods (code, label, description, icon, enabled, sort_order) VALUES
  ('upi',  'UPI',                  'GPay · PhonePe · Paytm',       'Smartphone', true, 1),
  ('card', 'Credit / Debit Card',  'Visa · Mastercard · Rupay',    'CreditCard', true, 2),
  ('cod',  'Cash on Delivery',     'Pay when your hugs arrive 💝', 'Banknote',   true, 3)
ON CONFLICT (code) DO NOTHING;
