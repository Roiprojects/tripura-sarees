-- Function to restore stock for a cancelled order (inverse of decrement_stock_for_order)
CREATE OR REPLACE FUNCTION public.restore_stock_for_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  v_updated int;
BEGIN
  FOR r IN
    SELECT product_id, size, color, quantity
    FROM public.order_items
    WHERE order_id = p_order_id
  LOOP
    -- Try exact size + color variant
    UPDATE public.product_variants
       SET stock_quantity = COALESCE(stock_quantity, 0) + r.quantity
     WHERE product_id = r.product_id
       AND size = r.size
       AND COALESCE(color_name,'') = COALESCE(r.color,'');
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    -- Fallback to size-only variant
    IF v_updated = 0 THEN
      UPDATE public.product_variants
         SET stock_quantity = COALESCE(stock_quantity, 0) + r.quantity
       WHERE product_id = r.product_id
         AND size = r.size
         AND COALESCE(color_name,'') = '';
      GET DIAGNOSTICS v_updated = ROW_COUNT;
    END IF;

    -- Fallback to base product stock
    IF v_updated = 0 THEN
      UPDATE public.products
         SET stock = COALESCE(stock, 0) + r.quantity
       WHERE id = r.product_id;
    END IF;
  END LOOP;
END;
$$;

-- Update cancel_order_with_refund to:
-- 1) Restore stock on cancellation
-- 2) Log restored quantities into delivery_updates for admin order history
CREATE OR REPLACE FUNCTION public.cancel_order_with_refund(p_order_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_wallet_id uuid;
  v_new_balance numeric(12,2);
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_fee numeric(12,2) := 0;
  v_refund numeric(12,2) := 0;
  v_is_cod_unpaid boolean := false;
  v_restore_log text := '';
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
        payment_status = CASE WHEN payment_status = 'paid' THEN 'refunded' ELSE payment_status END
    WHERE id = p_order_id;

  -- Restore stock for each item
  PERFORM public.restore_stock_for_order(p_order_id);

  -- Build a human-readable restoration log
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

  -- Log restoration into delivery_updates for admin order history
  INSERT INTO public.delivery_updates(order_id, status, note, created_by)
  VALUES (
    p_order_id,
    'cancelled',
    'Stock restored on cancellation:' || E'\n' || v_restore_log
      || COALESCE('Reason: ' || p_reason, ''),
    v_uid
  );

  IF v_is_cod_unpaid THEN
    RETURN jsonb_build_object(
      'order_id', p_order_id,
      'cod', true,
      'refunded', 0,
      'fee', 0,
      'gross', v_order.total,
      'stock_restored', true,
      'message', 'Wallet refund not applicable for COD orders'
    );
  END IF;

  v_fee := round(v_order.total * 0.02, 2);
  v_refund := v_order.total - v_fee;

  v_wallet_id := public.get_or_create_wallet(v_order.user_id);

  UPDATE public.wallets
    SET balance = balance + v_refund, updated_at = now()
    WHERE id = v_wallet_id
    RETURNING balance INTO v_new_balance;

  INSERT INTO public.wallet_transactions(
    wallet_id, user_id, type, amount, balance_after, source, reference_id, description, status
  ) VALUES (
    v_wallet_id, v_order.user_id, 'credit', v_refund, v_new_balance,
    'refund', p_order_id,
    'Refund for cancelled order #' || substr(p_order_id::text,1,8)
      || ' (after 2% processing fee ₹' || v_fee || ')'
      || COALESCE(' — ' || p_reason, ''),
    'completed'
  );

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'cod', false,
    'gross', v_order.total,
    'fee', v_fee,
    'refunded', v_refund,
    'new_balance', v_new_balance,
    'stock_restored', true
  );
END;
$function$;