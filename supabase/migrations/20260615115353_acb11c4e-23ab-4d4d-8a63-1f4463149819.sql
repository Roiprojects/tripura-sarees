
-- 1) courier_details: restrict public read to authenticated users
DROP POLICY IF EXISTS "couriers public read" ON public.courier_details;
CREATE POLICY "couriers authenticated read"
  ON public.courier_details
  FOR SELECT
  TO authenticated
  USING (active = true);
REVOKE SELECT ON public.courier_details FROM anon;

-- 2) reviews: require authenticated insert
DROP POLICY IF EXISTS "reviews insert auth" ON public.reviews;
CREATE POLICY "reviews insert auth"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 3) orders: prevent staff (non-admin) from changing sensitive columns
CREATE OR REPLACE FUNCTION public.prevent_staff_sensitive_order_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR public.has_role(v_uid, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.total IS DISTINCT FROM OLD.total
     OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.razorpay_payment_id IS DISTINCT FROM OLD.razorpay_payment_id
     OR NEW.razorpay_order_id IS DISTINCT FROM OLD.razorpay_order_id
     OR NEW.wallet_amount_used IS DISTINCT FROM OLD.wallet_amount_used
     OR NEW.coupon_code IS DISTINCT FROM OLD.coupon_code
     OR NEW.shipping_address IS DISTINCT FROM OLD.shipping_address
  THEN
    RAISE EXCEPTION 'Staff cannot modify ownership, payment, totals, address or coupon fields on orders';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_staff_field_guard ON public.orders;
CREATE TRIGGER orders_staff_field_guard
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_staff_sensitive_order_updates();
