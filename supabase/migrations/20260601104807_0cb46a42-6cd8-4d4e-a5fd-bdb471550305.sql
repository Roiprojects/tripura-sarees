-- Recovery-safe replacement for legacy admin bootstrap.
-- The original migration created or reset a specific production admin email/password.
-- That is intentionally disabled for native Supabase recovery.
-- Create the initial admin user manually after schema restore, then assign the
-- admin role through a controlled step.
DO $$
BEGIN
  RAISE NOTICE 'Skipping legacy hardcoded admin bootstrap during recovery.';
END $$;
