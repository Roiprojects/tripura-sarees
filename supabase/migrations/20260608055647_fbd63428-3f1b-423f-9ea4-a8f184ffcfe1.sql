-- Restrict coupons reads to admins only (prevent enumeration of promo codes)
DROP POLICY IF EXISTS "coupons read active authenticated" ON public.coupons;

-- Remove order_tracking and delivery_updates from realtime publication
-- to prevent broadcasting other customers' tracking data to all subscribers.
ALTER PUBLICATION supabase_realtime DROP TABLE public.order_tracking;
ALTER PUBLICATION supabase_realtime DROP TABLE public.delivery_updates;