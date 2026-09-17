-- Recovery-safe replacement for legacy admin password reset.
-- The original migration reset a specific hardcoded admin password.
-- That behavior is intentionally disabled for native Supabase recovery.
DO $$
BEGIN
  RAISE NOTICE 'Skipping legacy hardcoded admin password reset during recovery.';
END $$;
