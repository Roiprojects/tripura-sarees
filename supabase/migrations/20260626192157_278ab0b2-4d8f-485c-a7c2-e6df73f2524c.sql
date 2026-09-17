
-- 1. Table
CREATE TABLE public.wallet_refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  gross numeric(12,2) NOT NULL DEFAULT 0,
  fee numeric(12,2) NOT NULL DEFAULT 0,
  refund_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text,
  reason text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  approved_by uuid,
  approved_at timestamptz,
  admin_note text,
  wallet_transaction_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX wallet_refund_requests_status_idx ON public.wallet_refund_requests(status, created_at DESC);
CREATE INDEX wallet_refund_requests_user_idx ON public.wallet_refund_requests(user_id, created_at DESC);

-- 2. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_refund_requests TO authenticated;
GRANT ALL ON public.wallet_refund_requests TO service_role;

-- 3. RLS
ALTER TABLE public.wallet_refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own refund requests select"
  ON public.wallet_refund_requests FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_staff_permission(auth.uid(), 'refunds', 'view')
  );

CREATE POLICY "admin refund requests write"
  ON public.wallet_refund_requests FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_staff_permission(auth.uid(), 'refunds', 'edit')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_staff_permission(auth.uid(), 'refunds', 'edit')
  );

CREATE TRIGGER wallet_refund_requests_touch_updated_at
  BEFORE UPDATE ON public.wallet_refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.tracking_touch_updated_at();

-- 4. Patch cancel_order_with_refund: prepaid → enqueue pending request instead of crediting
CREATE OR REPLACE FUNCTION public.cancel_order_with_refund(p_order_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_fee numeric(12,2) := 0;
  v_refund numeric(12,2) := 0;
  v_is_cod_unpaid boolean := false;
  v_restore_log text := '';
  v_request_id uuid;
  r record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT public.has_role(v_uid, 'admin'::app_role) INTO v_is_admin;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.user_id <> v_uid AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Not allowed to cancel this order';
  END IF;
  IF v_order.status IN ('shipped','delivered','cancelled') THEN
    RAISE EXCEPTION 'Order can no longer be cancelled (status: %)', v_order.status;
  END IF;

  v_is_cod_unpaid := lower(coalesce(v_order.payment_method,'')) = 'cod'
                     AND coalesce(v_order.payment_status,'') <> 'paid';

  UPDATE public.orders
    SET status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = COALESCE(p_reason, cancellation_reason),
        payment_status = CASE WHEN payment_status = 'paid' THEN 'refund_pending' ELSE payment_status END
    WHERE id = p_order_id;

  PERFORM public.restore_stock_for_order(p_order_id);

  FOR r IN
    SELECT oi.product_name, oi.size, oi.color, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    v_restore_log := v_restore_log
      || '• +' || r.quantity || ' × ' || COALESCE(r.product_name,'Item')
      || COALESCE(' [' || NULLIF(r.size,'') || ']','')
      || COALESCE(' (' || NULLIF(r.color,'') || ')','')
      || E'\n';
  END LOOP;

  INSERT INTO public.delivery_updates(order_id, status, note, created_by)
  VALUES (
    p_order_id, 'cancelled',
    'Stock restored on cancellation:' || E'\n' || v_restore_log
      || COALESCE('Reason: ' || p_reason, ''),
    v_uid
  );

  IF v_is_cod_unpaid THEN
    RETURN jsonb_build_object(
      'order_id', p_order_id, 'cod', true, 'refunded', 0, 'fee', 0,
      'gross', v_order.total, 'stock_restored', true, 'pending_approval', false,
      'message', 'Wallet refund not applicable for COD orders'
    );
  END IF;

  v_fee := round(v_order.total * 0.02, 2);
  v_refund := v_order.total - v_fee;

  -- Enqueue pending wallet refund request for admin approval
  INSERT INTO public.wallet_refund_requests(
    order_id, user_id, gross, fee, refund_amount, payment_method, reason, status
  ) VALUES (
    p_order_id, v_order.user_id, v_order.total, v_fee, v_refund,
    v_order.payment_method, p_reason, 'pending'
  ) RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'order_id', p_order_id, 'cod', false, 'gross', v_order.total,
    'fee', v_fee, 'refunded', 0, 'pending_approval', true,
    'request_id', v_request_id, 'stock_restored', true,
    'message', 'Refund pending admin approval'
  );
END;
$function$;

-- 5. Patch cancel_order_item_with_refund
CREATE OR REPLACE FUNCTION public.cancel_order_item_with_refund(p_item_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item public.order_items%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_updated int := 0;
  v_item_gross numeric(12,2);
  v_fee numeric(12,2) := 0;
  v_refund numeric(12,2) := 0;
  v_is_cod_unpaid boolean := false;
  v_remaining_active int;
  v_request_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT public.has_role(v_uid, 'admin'::app_role) INTO v_is_admin;

  SELECT * INTO v_item FROM public.order_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order item not found'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = v_item.order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  IF v_order.user_id <> v_uid AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Not allowed to cancel this item';
  END IF;
  IF v_order.status IN ('shipped','delivered','cancelled') THEN
    RAISE EXCEPTION 'Order can no longer be cancelled (status: %)', v_order.status;
  END IF;
  IF v_item.status = 'cancelled' THEN
    RAISE EXCEPTION 'Item is already cancelled';
  END IF;

  UPDATE public.order_items
     SET status = 'cancelled', cancelled_at = now(),
         cancellation_reason = COALESCE(p_reason, cancellation_reason)
   WHERE id = p_item_id;

  UPDATE public.product_variants
     SET stock_quantity = COALESCE(stock_quantity, 0) + v_item.quantity
   WHERE product_id = v_item.product_id
     AND size = v_item.size
     AND COALESCE(color_name,'') = COALESCE(v_item.color,'');
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    UPDATE public.product_variants
       SET stock_quantity = COALESCE(stock_quantity, 0) + v_item.quantity
     WHERE product_id = v_item.product_id
       AND size = v_item.size
       AND COALESCE(color_name,'') = '';
    GET DIAGNOSTICS v_updated = ROW_COUNT;
  END IF;

  IF v_updated = 0 THEN
    UPDATE public.products
       SET stock = COALESCE(stock, 0) + v_item.quantity
     WHERE id = v_item.product_id;
  END IF;

  v_is_cod_unpaid := lower(COALESCE(v_order.payment_method,'')) = 'cod'
                     AND COALESCE(v_order.payment_status,'') <> 'paid';

  v_item_gross := v_item.price * v_item.quantity;

  IF NOT v_is_cod_unpaid THEN
    v_fee := round(v_item_gross * 0.02, 2);
    v_refund := v_item_gross - v_fee;

    INSERT INTO public.wallet_refund_requests(
      order_id, order_item_id, user_id, gross, fee, refund_amount,
      payment_method, reason, status
    ) VALUES (
      v_order.id, p_item_id, v_order.user_id, v_item_gross, v_fee, v_refund,
      v_order.payment_method,
      COALESCE(p_reason, '') || ' (item: ' || COALESCE(v_item.product_name,'') ||
        COALESCE(' ['||NULLIF(v_item.size,'')||']','') ||
        COALESCE(' ('||NULLIF(v_item.color,'')||')','') || ' x'||v_item.quantity||')',
      'pending'
    ) RETURNING id INTO v_request_id;
  END IF;

  INSERT INTO public.delivery_updates(order_id, status, note, created_by)
  VALUES (
    v_order.id, v_order.status,
    'Item cancelled & stock restored: +' || v_item.quantity || ' × '
      || COALESCE(v_item.product_name,'Item')
      || COALESCE(' [' || NULLIF(v_item.size,'') || ']','')
      || COALESCE(' (' || NULLIF(v_item.color,'') || ')','')
      || CASE WHEN v_refund > 0 THEN ' • Refund ₹' || v_refund || ' pending admin approval' ELSE '' END
      || COALESCE(E'\nReason: ' || p_reason, ''),
    v_uid
  );

  SELECT COUNT(*) INTO v_remaining_active
    FROM public.order_items
   WHERE order_id = v_order.id AND status = 'active';

  IF v_remaining_active = 0 THEN
    UPDATE public.orders
       SET status = 'cancelled',
           cancelled_at = COALESCE(cancelled_at, now()),
           cancellation_reason = COALESCE(cancellation_reason, 'All items cancelled'),
           payment_status = CASE WHEN payment_status = 'paid' THEN 'refund_pending' ELSE payment_status END
     WHERE id = v_order.id;
  END IF;

  RETURN jsonb_build_object(
    'item_id', p_item_id, 'order_id', v_order.id,
    'gross', v_item_gross, 'fee', v_fee, 'refunded', 0,
    'cod_unpaid', v_is_cod_unpaid, 'stock_restored', true,
    'pending_approval', NOT v_is_cod_unpaid,
    'request_id', v_request_id,
    'order_fully_cancelled', v_remaining_active = 0
  );
END;
$function$;

-- 6. Admin approval RPC
CREATE OR REPLACE FUNCTION public.approve_wallet_refund(p_request_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.wallet_refund_requests%ROWTYPE;
  v_wallet_id uuid;
  v_new_balance numeric(12,2);
  v_tx_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.has_role(v_uid,'admin'::app_role)
          OR public.has_staff_permission(v_uid,'refunds','edit')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT * INTO v_req FROM public.wallet_refund_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Request already %', v_req.status; END IF;

  v_wallet_id := public.get_or_create_wallet(v_req.user_id);

  UPDATE public.wallets
    SET balance = balance + v_req.refund_amount, updated_at = now()
    WHERE id = v_wallet_id
    RETURNING balance INTO v_new_balance;

  INSERT INTO public.wallet_transactions(
    wallet_id, user_id, type, amount, balance_after, source, reference_id, description, status
  ) VALUES (
    v_wallet_id, v_req.user_id, 'credit', v_req.refund_amount, v_new_balance,
    'refund', v_req.order_id,
    'Refund approved for order #' || substr(v_req.order_id::text,1,8)
      || ' (after 2% processing fee ₹' || v_req.fee || ')'
      || COALESCE(' — ' || p_note, ''),
    'completed'
  ) RETURNING id INTO v_tx_id;

  UPDATE public.wallet_refund_requests
    SET status = 'approved', approved_by = v_uid, approved_at = now(),
        admin_note = p_note, wallet_transaction_id = v_tx_id
    WHERE id = p_request_id;

  UPDATE public.orders
    SET payment_status = 'refunded'
    WHERE id = v_req.order_id AND payment_status IN ('refund_pending','paid');

  RETURN jsonb_build_object(
    'request_id', p_request_id, 'refunded', v_req.refund_amount,
    'new_balance', v_new_balance, 'transaction_id', v_tx_id
  );
END;
$$;

-- 7. Admin reject RPC
CREATE OR REPLACE FUNCTION public.reject_wallet_refund(p_request_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.wallet_refund_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.has_role(v_uid,'admin'::app_role)
          OR public.has_staff_permission(v_uid,'refunds','edit')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT * INTO v_req FROM public.wallet_refund_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Request already %', v_req.status; END IF;

  UPDATE public.wallet_refund_requests
    SET status = 'rejected', approved_by = v_uid, approved_at = now(), admin_note = p_note
    WHERE id = p_request_id;

  RETURN jsonb_build_object('request_id', p_request_id, 'status', 'rejected');
END;
$$;
