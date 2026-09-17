
-- 1. Restrict order_items insert to pending orders only
DROP POLICY IF EXISTS "order_items insert own" ON public.order_items;
CREATE POLICY "order_items insert own"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.user_id = auth.uid()
      AND o.status = 'pending'
      AND COALESCE(o.payment_status, 'pending') NOT IN ('paid','refunded')
  )
);

-- 2. Remove orders and profiles from realtime publication to prevent PII broadcast
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.orders';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles';
    END IF;
  END IF;
END $$;

-- 3. Restrict staff_activity_log inserts to staff/admin only
DROP POLICY IF EXISTS "staff_activity_self insert" ON public.staff_activity_log;
CREATE POLICY "staff_activity_self insert"
ON public.staff_activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_staff(auth.uid()))
);
