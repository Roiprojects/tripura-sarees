
-- 1. courier_details
CREATE TABLE public.courier_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_phone text,
  website text,
  tracking_url_template text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courier_details TO anon, authenticated;
GRANT ALL ON public.courier_details TO service_role;
ALTER TABLE public.courier_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "couriers public read" ON public.courier_details FOR SELECT USING (active = true);
CREATE POLICY "admins manage couriers" ON public.courier_details FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. order_tracking (one row per order)
CREATE TABLE public.order_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE,
  current_status text NOT NULL DEFAULT 'placed',
  courier_name text,
  tracking_id text,
  tracking_url text,
  delivery_partner_phone text,
  expected_delivery_date date,
  dispatch_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_tracking TO authenticated;
GRANT ALL ON public.order_tracking TO service_role;
ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own tracking" ON public.order_tracking FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_tracking.order_id AND o.user_id = auth.uid()));
CREATE POLICY "admins manage tracking" ON public.order_tracking FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. delivery_updates (timeline)
CREATE TABLE public.delivery_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  status text NOT NULL,
  note text,
  location text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_updates TO authenticated;
GRANT ALL ON public.delivery_updates TO service_role;
ALTER TABLE public.delivery_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own delivery updates" ON public.delivery_updates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = delivery_updates.order_id AND o.user_id = auth.uid()));
CREATE POLICY "admins manage delivery updates" ON public.delivery_updates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX delivery_updates_order_idx ON public.delivery_updates(order_id, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tracking_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_order_tracking_updated BEFORE UPDATE ON public.order_tracking
FOR EACH ROW EXECUTE FUNCTION public.tracking_touch_updated_at();
CREATE TRIGGER trg_courier_details_updated BEFORE UPDATE ON public.courier_details
FOR EACH ROW EXECUTE FUNCTION public.tracking_touch_updated_at();

-- Auto-create timeline entry whenever current_status changes
CREATE OR REPLACE FUNCTION public.log_tracking_status_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.current_status IS DISTINCT FROM OLD.current_status) THEN
    INSERT INTO public.delivery_updates(order_id, status, note, created_by)
    VALUES (NEW.order_id, NEW.current_status,
            CASE WHEN TG_OP='INSERT' THEN 'Tracking created' ELSE 'Status updated' END,
            auth.uid());
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_tracking_status_change AFTER INSERT OR UPDATE ON public.order_tracking
FOR EACH ROW EXECUTE FUNCTION public.log_tracking_status_change();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_updates;

-- Seed common couriers
INSERT INTO public.courier_details(name, website, tracking_url_template) VALUES
  ('Delhivery', 'https://www.delhivery.com', 'https://www.delhivery.com/track/package/{tracking_id}'),
  ('Bluedart', 'https://www.bluedart.com', 'https://www.bluedart.com/tracking?awbno={tracking_id}'),
  ('DTDC', 'https://www.dtdc.in', 'https://www.dtdc.in/tracking?awb={tracking_id}'),
  ('India Post', 'https://www.indiapost.gov.in', 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?tracking={tracking_id}'),
  ('Ekart', 'https://ekartlogistics.com', 'https://ekartlogistics.com/shipmenttrack/{tracking_id}');
