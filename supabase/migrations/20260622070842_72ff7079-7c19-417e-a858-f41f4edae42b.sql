-- 1. Item-level cancellation state
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- 2. Cancel a single order item: restore that variant's stock + wallet refund (prorated, less 2% fee)
CREATE OR REPLACE FUNCTION public.cancel_order_item_with_refund(p_item_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item public.order_items%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_updated int := 0;
  v_item_gross numeric(12,2);
  v_fee numeric(12,2) := 0;
  v_refund numeric(12,2) := 0;
  v_wallet_id uuid;
  v_new_balance numeric(12,2);
  v_is_cod_unpaid boolean := false;
  v_remaining_active int;
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

  -- Mark the item cancelled
  UPDATE public.order_items
     SET status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = COALESCE(p_reason, cancellation_reason)
   WHERE id = p_item_id;

  -- Restore stock: exact size + color → size-only → base product
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

  -- Wallet refund: 2% processing fee, skipped for unpaid COD
  v_is_cod_unpaid := lower(COALESCE(v_order.payment_method,'')) = 'cod'
                     AND COALESCE(v_order.payment_status,'') <> 'paid';

  v_item_gross := v_item.price * v_item.quantity;

  IF NOT v_is_cod_unpaid THEN
    v_fee := round(v_item_gross * 0.02, 2);
    v_refund := v_item_gross - v_fee;

    v_wallet_id := public.get_or_create_wallet(v_order.user_id);
    UPDATE public.wallets
       SET balance = balance + v_refund, updated_at = now()
     WHERE id = v_wallet_id
     RETURNING balance INTO v_new_balance;

    INSERT INTO public.wallet_transactions(
      wallet_id, user_id, type, amount, balance_after, source, reference_id, description, status
    ) VALUES (
      v_wallet_id, v_order.user_id, 'credit', v_refund, v_new_balance,
      'refund', v_order.id,
      'Refund for cancelled item: ' || COALESCE(v_item.product_name,'item')
        || ' [' || COALESCE(v_item.size,'') || COALESCE(' / '||NULLIF(v_item.color,''),'') || ']'
        || ' x ' || v_item.quantity
        || ' (after 2% processing fee ₹' || v_fee || ')'
        || COALESCE(' — ' || p_reason, ''),
      'completed'
    );
  END IF;

  -- Log in delivery history
  INSERT INTO public.delivery_updates(order_id, status, note, created_by)
  VALUES (
    v_order.id,
    v_order.status,
    'Item cancelled & stock restored: +' || v_item.quantity || ' × '
      || COALESCE(v_item.product_name,'Item')
      || COALESCE(' [' || NULLIF(v_item.size,'') || ']','')
      || COALESCE(' (' || NULLIF(v_item.color,'') || ')','')
      || CASE WHEN v_refund > 0 THEN ' • Refund ₹' || v_refund || ' (fee ₹' || v_fee || ')' ELSE '' END
      || COALESCE(E'\nReason: ' || p_reason, ''),
    v_uid
  );

  -- If no active items remain, mark the order as cancelled
  SELECT COUNT(*) INTO v_remaining_active
    FROM public.order_items
   WHERE order_id = v_order.id AND status = 'active';

  IF v_remaining_active = 0 THEN
    UPDATE public.orders
       SET status = 'cancelled',
           cancelled_at = COALESCE(cancelled_at, now()),
           cancellation_reason = COALESCE(cancellation_reason, 'All items cancelled'),
           payment_status = CASE WHEN payment_status = 'paid' THEN 'refunded' ELSE payment_status END
     WHERE id = v_order.id;
  END IF;

  RETURN jsonb_build_object(
    'item_id', p_item_id,
    'order_id', v_order.id,
    'gross', v_item_gross,
    'fee', v_fee,
    'refunded', v_refund,
    'cod_unpaid', v_is_cod_unpaid,
    'stock_restored', true,
    'order_fully_cancelled', v_remaining_active = 0,
    'new_balance', v_new_balance
  );
END;
$$;