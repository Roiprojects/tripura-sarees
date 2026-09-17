
-- 1) Fix privilege escalation in has_staff_permission: edit actions must require can_edit=true
CREATE OR REPLACE FUNCTION public.has_staff_permission(_user_id uuid, _module text, _action text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        AND can_edit = true
        AND (
          (_module = 'products'   AND module IN ('products.add','products.edit','products.delete'))
          OR (_module = 'orders'    AND module = 'orders.manage')
          OR (_module = 'customers' AND module = 'customers.manage')
          OR (_module = 'categories' AND module = 'categories.manage')
          OR (_module = 'coupons'   AND module = 'coupons.manage')
          OR (_module = 'homepage'  AND module = 'homepage.manage')
          OR (_module = 'refunds'   AND module = 'refunds.manage')
          OR (module = _module)
        )
    )
  END
$function$;

-- 2) Restrict courier_details reads to admin/staff only
DROP POLICY IF EXISTS "couriers authenticated read" ON public.courier_details;
DROP POLICY IF EXISTS "couriers read" ON public.courier_details;

CREATE POLICY "couriers admin staff read"
ON public.courier_details
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_staff(auth.uid())
);
