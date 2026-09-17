-- First admin bootstrap for the native Supabase project.
--
-- Step 1:
--   Create the admin auth user in Supabase Auth first (Dashboard -> Authentication -> Users)
--   or via an approved admin API path.
--
-- Step 2:
--   Replace ADMIN_EMAIL_HERE below with that user's email and run this script.
--
-- Step 3:
--   Verify the row exists in public.user_roles and the admin can sign in at /admin/login.

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'ADMIN_EMAIL_HERE'
ON CONFLICT (user_id, role) DO NOTHING;

SELECT u.email, r.role
FROM public.user_roles r
JOIN auth.users u ON u.id = r.user_id
WHERE u.email = 'ADMIN_EMAIL_HERE';
