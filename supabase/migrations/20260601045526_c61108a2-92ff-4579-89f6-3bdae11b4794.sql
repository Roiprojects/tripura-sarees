
-- =========================================
-- WALLETS
-- =========================================
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own wallet"
  ON public.wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admins read all wallets"
  ON public.wallets FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins manage wallets"
  ON public.wallets FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =========================================
-- WALLET TRANSACTIONS
-- =========================================
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('credit','debit')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  balance_after numeric(12,2) NOT NULL,
  source text NOT NULL CHECK (source IN ('refund','purchase','admin_adjustment','signup_bonus','other')),
  reference_id uuid,
  description text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','pending','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_tx_user ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_tx_ref ON public.wallet_transactions(reference_id);

GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own wallet txs"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admins read all wallet txs"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins manage wallet txs"
  ON public.wallet_transactions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =========================================
-- ORDERS: extend
-- =========================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS wallet_amount_used numeric(12,2) NOT NULL DEFAULT 0;

-- =========================================
-- FUNCTIONS
-- =========================================

-- Helper: get or create a wallet row, returning the wallet id
CREATE OR REPLACE FUNCTION public.get_or_create_wallet(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.wallets WHERE user_id = p_user_id;
  IF v_id IS NULL THEN
    INSERT INTO public.wallets(user_id, balance) VALUES (p_user_id, 0)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_wallet(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_or_create_wallet(uuid) TO authenticated;

-- Cancel an order and refund its total to wallet (atomic)
CREATE OR REPLACE FUNCTION public.cancel_order_with_refund(
  p_order_id uuid,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_wallet_id uuid;
  v_new_balance numeric(12,2);
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT public.has_role(v_uid, 'admin'::app_role) INTO v_is_admin;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  IF v_order.user_id <> v_uid AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Not allowed to cancel this order';
  END IF;

  IF v_order.status IN ('shipped','delivered','cancelled') THEN
    RAISE EXCEPTION 'Order can no longer be cancelled (status: %)', v_order.status;
  END IF;

  -- Mark cancelled
  UPDATE public.orders
    SET status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = COALESCE(p_reason, cancellation_reason),
        payment_status = CASE WHEN payment_status = 'paid' THEN 'refunded' ELSE payment_status END
    WHERE id = p_order_id;

  -- Refund full order total to wallet
  v_wallet_id := public.get_or_create_wallet(v_order.user_id);

  UPDATE public.wallets
    SET balance = balance + v_order.total,
        updated_at = now()
    WHERE id = v_wallet_id
    RETURNING balance INTO v_new_balance;

  INSERT INTO public.wallet_transactions(
    wallet_id, user_id, type, amount, balance_after, source, reference_id, description, status
  ) VALUES (
    v_wallet_id, v_order.user_id, 'credit', v_order.total, v_new_balance,
    'refund', p_order_id,
    'Refund for cancelled order #' || substr(p_order_id::text, 1, 8)
      || COALESCE(' — ' || p_reason, ''),
    'completed'
  );

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'refunded', v_order.total,
    'new_balance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order_with_refund(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_order_with_refund(uuid, text) TO authenticated;

-- Debit wallet for an order (called right after order insert during checkout)
CREATE OR REPLACE FUNCTION public.debit_wallet_for_order(
  p_order_id uuid,
  p_amount numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_new_balance numeric(12,2);
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.user_id <> v_uid THEN RAISE EXCEPTION 'Not your order'; END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND OR v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  UPDATE public.wallets
    SET balance = balance - p_amount, updated_at = now()
    WHERE id = v_wallet.id
    RETURNING balance INTO v_new_balance;

  UPDATE public.orders
    SET wallet_amount_used = COALESCE(wallet_amount_used,0) + p_amount
    WHERE id = p_order_id;

  INSERT INTO public.wallet_transactions(
    wallet_id, user_id, type, amount, balance_after, source, reference_id, description, status
  ) VALUES (
    v_wallet.id, v_uid, 'debit', p_amount, v_new_balance,
    'purchase', p_order_id,
    'Wallet used for order #' || substr(p_order_id::text, 1, 8),
    'completed'
  );

  RETURN jsonb_build_object('debited', p_amount, 'new_balance', v_new_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.debit_wallet_for_order(uuid, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.debit_wallet_for_order(uuid, numeric) TO authenticated;

-- Admin: manually credit / debit any user's wallet
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_type text,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
  v_new_balance numeric(12,2);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF p_type NOT IN ('credit','debit') THEN RAISE EXCEPTION 'Invalid type'; END IF;

  v_wallet_id := public.get_or_create_wallet(p_user_id);

  IF p_type = 'credit' THEN
    UPDATE public.wallets SET balance = balance + p_amount, updated_at = now()
      WHERE id = v_wallet_id RETURNING balance INTO v_new_balance;
  ELSE
    UPDATE public.wallets SET balance = balance - p_amount, updated_at = now()
      WHERE id = v_wallet_id AND balance >= p_amount
      RETURNING balance INTO v_new_balance;
    IF v_new_balance IS NULL THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  END IF;

  INSERT INTO public.wallet_transactions(
    wallet_id, user_id, type, amount, balance_after, source, description, status
  ) VALUES (
    v_wallet_id, p_user_id, p_type, p_amount, v_new_balance,
    'admin_adjustment', COALESCE(p_note, 'Admin adjustment'), 'completed'
  );

  RETURN jsonb_build_object('new_balance', v_new_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text, text) TO authenticated;
