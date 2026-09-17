
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_subtotal numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.coupons%ROWTYPE;
BEGIN
  IF p_code IS NULL OR length(btrim(p_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_code');
  END IF;

  SELECT * INTO v
  FROM public.coupons
  WHERE lower(code) = lower(btrim(p_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;
  IF NOT v.active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'inactive');
  END IF;
  IF v.expires_at IS NOT NULL AND v.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;
  IF coalesce(p_subtotal, 0) < coalesce(v.min_order, 0) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'min_order', 'min_order', v.min_order);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'code', v.code,
    'discount_type', v.discount_type,
    'discount_value', v.discount_value,
    'min_order', v.min_order
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(text, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO anon, authenticated;
