
CREATE OR REPLACE FUNCTION public.has_staff_permission(_user_id uuid, _module text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.has_role(_user_id, 'admin'::app_role) THEN true
    WHEN _action = 'view' THEN EXISTS (
      SELECT 1 FROM public.staff_permissions
      WHERE user_id = _user_id
        AND can_view = true
        AND (module = _module OR module LIKE _module || '.%')
    )
    ELSE EXISTS (
      SELECT 1 FROM public.staff_permissions
      WHERE user_id = _user_id
        AND can_view = true
        AND (
          (_module = 'products'   AND module IN ('products.add','products.edit','products.delete'))
          OR (_module = 'orders'    AND module = 'orders.manage')
          OR (_module = 'customers' AND module = 'customers.manage')
          OR (_module = 'categories' AND module = 'categories.manage')
          OR (_module = 'coupons'   AND module = 'coupons.manage')
          OR (_module = 'homepage'  AND module = 'homepage.manage')
          OR (_module = 'refunds'   AND module = 'refunds.manage')
          OR (module = _module AND can_edit = true)
        )
    )
  END
$$;
