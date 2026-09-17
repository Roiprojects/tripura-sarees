
CREATE POLICY "product-images staff write" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.has_staff_permission(auth.uid(), 'products', 'edit'));

CREATE POLICY "product-images staff update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND public.has_staff_permission(auth.uid(), 'products', 'edit'));

CREATE POLICY "product-images staff delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND public.has_staff_permission(auth.uid(), 'products', 'edit'));
