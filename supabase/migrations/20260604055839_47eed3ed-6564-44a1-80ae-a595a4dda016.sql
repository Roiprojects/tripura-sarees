
CREATE OR REPLACE FUNCTION public.cancel_order_with_refund(p_order_id uuid, p_reason text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_wallet_id uuid;
  v_new_balance numeric(12,2);
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_fee numeric(12,2) := 0;
  v_refund numeric(12,2) := 0;
  v_is_cod_unpaid boolean := false;
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

  IF v_is_cod_unpaid THEN
    RETURN jsonb_build_object(
      'order_id', p_order_id,
      'cod', true,
      'refunded', 0,
      'fee', 0,
      'gross', v_order.total,
      'message', 'Wallet refund not applicable for COD orders'
    );
  END IF;

  v_fee := round(v_order.total * 0.20, 2);
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
      || ' (after 20% cancellation fee ₹' || v_fee || ')'
      || COALESCE(' — ' || p_reason, ''),
    'completed'
  );

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'cod', false,
    'gross', v_order.total,
    'fee', v_fee,
    'refunded', v_refund,
    'new_balance', v_new_balance
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.debit_wallet_for_order(p_order_id uuid, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_new_balance numeric(12,2);
  v_uid uuid := auth.uid();
  v_fee numeric(12,2);
  v_total_debit numeric(12,2);
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.user_id <> v_uid THEN RAISE EXCEPTION 'Not your order'; END IF;

  v_fee := round(p_amount * 0.07, 2);
  v_total_debit := p_amount + v_fee;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND OR v_wallet.balance < v_total_debit THEN
    RAISE EXCEPTION 'Insufficient wallet balance (need ₹% including 7%% processing fee)', v_total_debit;
  END IF;

  UPDATE public.wallets
    SET balance = balance - v_total_debit, updated_at = now()
    WHERE id = v_wallet.id
    RETURNING balance INTO v_new_balance;

  UPDATE public.orders
    SET wallet_amount_used = COALESCE(wallet_amount_used,0) + v_total_debit
    WHERE id = p_order_id;

  INSERT INTO public.wallet_transactions(
    wallet_id, user_id, type, amount, balance_after, source, reference_id, description, status
  ) VALUES (
    v_wallet.id, v_uid, 'debit', v_total_debit, v_new_balance,
    'purchase', p_order_id,
    'Wallet used for order #' || substr(p_order_id::text,1,8)
      || ' (₹' || p_amount || ' applied + 7% processing fee ₹' || v_fee || ')',
    'completed'
  );

  RETURN jsonb_build_object(
    'debited', v_total_debit,
    'applied', p_amount,
    'fee', v_fee,
    'new_balance', v_new_balance
  );
END;
$function$;
