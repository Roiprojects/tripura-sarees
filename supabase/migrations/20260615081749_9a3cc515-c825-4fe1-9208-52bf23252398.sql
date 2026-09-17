
-- staff_profiles
CREATE TABLE public.staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  mobile text,
  email text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_profiles TO authenticated;
GRANT ALL ON public.staff_profiles TO service_role;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_profiles admin all" ON public.staff_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "staff_profiles self read" ON public.staff_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- staff_permissions
CREATE TABLE public.staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_permissions TO authenticated;
GRANT ALL ON public.staff_permissions TO service_role;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_permissions admin all" ON public.staff_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "staff_permissions self read" ON public.staff_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- staff_activity_log
CREATE TABLE public.staff_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  module text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.staff_activity_log TO authenticated;
GRANT ALL ON public.staff_activity_log TO service_role;
ALTER TABLE public.staff_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_activity admin read" ON public.staff_activity_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "staff_activity self read" ON public.staff_activity_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "staff_activity self insert" ON public.staff_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_staff_activity_user_created ON public.staff_activity_log(user_id, created_at DESC);

-- orders.assigned_to
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON public.orders(assigned_to);

-- helpers
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff_profiles WHERE user_id = _user_id AND active = true)
$$;

CREATE OR REPLACE FUNCTION public.has_staff_permission(_user_id uuid, _module text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.has_role(_user_id, 'admin'::app_role) THEN true
    WHEN _action = 'edit' THEN EXISTS (SELECT 1 FROM public.staff_permissions WHERE user_id = _user_id AND module = _module AND can_edit = true)
    ELSE EXISTS (SELECT 1 FROM public.staff_permissions WHERE user_id = _user_id AND module = _module AND (can_view = true OR can_edit = true))
  END
$$;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.staff_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER staff_profiles_touch BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.staff_touch_updated_at();
CREATE TRIGGER staff_permissions_touch BEFORE UPDATE ON public.staff_permissions
  FOR EACH ROW EXECUTE FUNCTION public.staff_touch_updated_at();

-- Allow staff with orders.view permission to read all orders (admins already covered elsewhere)
CREATE POLICY "orders staff read" ON public.orders
  FOR SELECT TO authenticated
  USING (public.has_staff_permission(auth.uid(), 'orders', 'view'));

CREATE POLICY "orders staff update" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_staff_permission(auth.uid(), 'orders', 'edit'))
  WITH CHECK (public.has_staff_permission(auth.uid(), 'orders', 'edit'));

-- Allow staff with customers.view to read profiles
CREATE POLICY "profiles staff read" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_staff_permission(auth.uid(), 'customers', 'view'));

-- Allow staff with products.view/edit on products
CREATE POLICY "products staff read" ON public.products
  FOR SELECT TO authenticated
  USING (public.has_staff_permission(auth.uid(), 'products', 'view'));

CREATE POLICY "products staff write" ON public.products
  FOR ALL TO authenticated
  USING (public.has_staff_permission(auth.uid(), 'products', 'edit'))
  WITH CHECK (public.has_staff_permission(auth.uid(), 'products', 'edit'));
