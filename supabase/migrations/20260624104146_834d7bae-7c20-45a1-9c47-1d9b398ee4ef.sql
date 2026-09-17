
DROP POLICY IF EXISTS "orders all own" ON public.orders;

CREATE POLICY "orders select own"
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "orders insert own"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders update own pending"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'pending'
    AND COALESCE(payment_status,'') <> 'paid'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND COALESCE(payment_status,'') <> 'paid'
  );

CREATE POLICY "orders delete own pending"
  ON public.orders FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'pending'
    AND COALESCE(payment_status,'') <> 'paid'
  );
