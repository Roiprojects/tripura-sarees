
-- 1) Extend coupons table
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS coupon_type text,
  ADD COLUMN IF NOT EXISTS max_discount numeric(12,2),
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS usage_limit integer,
  ADD COLUMN IF NOT EXISTS per_user_limit integer,
  ADD COLUMN IF NOT EXISTS times_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS applicable_product_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applicable_category_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applicable_brands text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preorder_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_order_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill coupon_type from legacy discount_type
UPDATE public.coupons
   SET coupon_type = CASE
     WHEN coupon_type IS NOT NULL AND coupon_type <> '' THEN coupon_type
     WHEN lower(discount_type) IN ('percent','percentage') THEN 'percentage'
     WHEN lower(discount_type) IN ('flat','fixed','amount') THEN 'fixed'
     ELSE 'percentage'
   END
 WHERE coupon_type IS NULL OR coupon_type = '';

ALTER TABLE public.coupons
  ALTER COLUMN coupon_type SET DEFAULT 'percentage',
  ALTER COLUMN coupon_type SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.coupons
    ADD CONSTRAINT coupons_coupon_type_check
    CHECK (coupon_type IN ('percentage','fixed','free_shipping','product','category','brand','min_order','first_order','preorder'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) coupon_redemptions
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  coupon_code text NOT NULL,
  user_id uuid,
  order_id uuid,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coupon_redemptions_coupon_idx ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS coupon_redemptions_user_idx ON public.coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS coupon_redemptions_order_idx ON public.coupon_redemptions(order_id);

GRANT SELECT, INSERT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users see own redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_staff_permission(auth.uid(),'coupons','view'));

DROP POLICY IF EXISTS "Users insert own redemption" ON public.coupon_redemptions;
CREATE POLICY "Users insert own redemption" ON public.coupon_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

-- 3) validate_coupon_v2: returns full coupon definition + gating checks
CREATE OR REPLACE FUNCTION public.validate_coupon_v2(p_code text, p_subtotal numeric DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.coupons%ROWTYPE;
  v_uid uuid := auth.uid();
  v_user_used int := 0;
  v_prior_orders int := 0;
BEGIN
  IF p_code IS NULL OR length(btrim(p_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_code');
  END IF;

  SELECT * INTO v FROM public.coupons WHERE lower(code) = lower(btrim(p_code)) LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid'); END IF;
  IF NOT v.active THEN RETURN jsonb_build_object('ok', false, 'error', 'inactive'); END IF;
  IF v.starts_at IS NOT NULL AND v.starts_at > now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_started');
  END IF;
  IF v.expires_at IS NOT NULL AND v.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;
  IF v.usage_limit IS NOT NULL AND v.times_used >= v.usage_limit THEN
    RETURN jsonb_build_object('ok', false, 'error', 'usage_limit_reached');
  END IF;

  IF v_uid IS NOT NULL AND v.per_user_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_used FROM public.coupon_redemptions
     WHERE coupon_id = v.id AND user_id = v_uid;
    IF v_user_used >= v.per_user_limit THEN
      RETURN jsonb_build_object('ok', false, 'error', 'per_user_limit_reached');
    END IF;
  END IF;

  IF (v.coupon_type = 'first_order' OR v.first_order_only) AND v_uid IS NOT NULL THEN
    SELECT COUNT(*) INTO v_prior_orders FROM public.orders
      WHERE user_id = v_uid AND COALESCE(status,'') <> 'cancelled';
    IF v_prior_orders > 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'not_first_order');
    END IF;
  END IF;

  IF COALESCE(p_subtotal, 0) < COALESCE(v.min_order, 0) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'min_order', 'min_order', v.min_order);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v.id,
    'code', v.code,
    'coupon_type', v.coupon_type,
    'discount_type', v.discount_type,
    'discount_value', v.discount_value,
    'max_discount', v.max_discount,
    'min_order', v.min_order,
    'applicable_product_ids', to_jsonb(v.applicable_product_ids),
    'applicable_category_ids', to_jsonb(v.applicable_category_ids),
    'applicable_brands', to_jsonb(v.applicable_brands),
    'preorder_only', v.preorder_only,
    'first_order_only', v.first_order_only
  );
END;
$$;

-- 4) Increment usage counter helper (called after successful order)
CREATE OR REPLACE FUNCTION public.record_coupon_use(p_code text, p_order_id uuid, p_discount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.coupons%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  IF p_code IS NULL OR length(btrim(p_code)) = 0 THEN RETURN; END IF;
  SELECT * INTO v FROM public.coupons WHERE lower(code) = lower(btrim(p_code)) LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO public.coupon_redemptions(coupon_id, coupon_code, user_id, order_id, discount_amount)
  VALUES (v.id, v.code, v_uid, p_order_id, COALESCE(p_discount,0));

  UPDATE public.coupons SET times_used = COALESCE(times_used,0) + 1, updated_at = now()
   WHERE id = v.id;
END;
$$;

-- 5) updated_at trigger for coupons
CREATE OR REPLACE FUNCTION public.coupons_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS coupons_touch_updated_at ON public.coupons;
CREATE TRIGGER coupons_touch_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.coupons_touch_updated_at();
