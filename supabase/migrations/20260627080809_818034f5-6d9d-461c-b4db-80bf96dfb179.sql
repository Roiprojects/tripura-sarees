
CREATE POLICY "product_variants staff write" ON public.product_variants FOR ALL TO authenticated
  USING (has_staff_permission(auth.uid(), 'products', 'edit'))
  WITH CHECK (has_staff_permission(auth.uid(), 'products', 'edit'));
CREATE POLICY "product_color_variants staff write" ON public.product_color_variants FOR ALL TO authenticated
  USING (has_staff_permission(auth.uid(), 'products', 'edit'))
  WITH CHECK (has_staff_permission(auth.uid(), 'products', 'edit'));
