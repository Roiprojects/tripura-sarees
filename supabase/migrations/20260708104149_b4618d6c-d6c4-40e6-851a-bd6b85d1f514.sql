-- Lock down privileged functions: only service_role (edge functions) may call them.
-- Some legacy webhook functions are not present in this repo's migration history,
-- so those permission changes are applied only if the functions exist.

REVOKE EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_wallet_refund(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_wallet_refund(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decrement_stock_for_order(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_stock_for_order(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_or_create_wallet(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_coupon_use(text, uuid, numeric) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'claim_webhook_events'
      AND pg_get_function_identity_arguments(p.oid) = 'integer'
  ) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.claim_webhook_events(integer) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.claim_webhook_events(integer) TO service_role';
  ELSE
    RAISE NOTICE 'Skipping permissions for absent function public.claim_webhook_events(integer)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'emit_webhook_event'
      AND pg_get_function_identity_arguments(p.oid) = 'text, uuid, jsonb, text, text'
  ) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.emit_webhook_event(text, uuid, jsonb, text, text) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.emit_webhook_event(text, uuid, jsonb, text, text) TO service_role';
  ELSE
    RAISE NOTICE 'Skipping permissions for absent function public.emit_webhook_event(text, uuid, jsonb, text, text)';
  END IF;
END $$;

-- User-invoked but require login: block anon
REVOKE EXECUTE ON FUNCTION public.cancel_order_with_refund(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_order_item_with_refund(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.debit_wallet_for_order(uuid, numeric) FROM PUBLIC, anon;

-- Role helpers: only needed by signed-in users and RLS; block anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_staff_permission(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon;

-- Ensure service_role always retains access
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_wallet_refund(uuid, text) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.reject_wallet_refund(uuid, text) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_stock_for_order(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_stock_for_order(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_or_create_wallet(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_coupon_use(text, uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_order_with_refund(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_order_item_with_refund(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.debit_wallet_for_order(uuid, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_staff_permission(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;
