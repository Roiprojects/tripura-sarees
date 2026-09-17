-- Snapshot variant + product details on order_items so cancelled order history
-- always shows the exact selections the customer made, even if the product
-- is later edited or removed.
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS product_image text;

-- Backfill snapshots from current products / variants for existing rows
UPDATE public.order_items oi
SET product_name = p.name,
    product_image = COALESCE(p.images[1], NULL)
FROM public.products p
WHERE oi.product_id = p.id
  AND oi.product_name IS NULL;

UPDATE public.order_items oi
SET sku = COALESCE(
  (SELECT pv.sku_code FROM public.product_variants pv
    WHERE pv.product_id = oi.product_id
      AND pv.size = oi.size
      AND COALESCE(pv.color_name,'') = COALESCE(oi.color,'')
    LIMIT 1),
  (SELECT pv.sku_code FROM public.product_variants pv
    WHERE pv.product_id = oi.product_id
      AND pv.size = oi.size
    LIMIT 1),
  (SELECT p.sku FROM public.products p WHERE p.id = oi.product_id)
)
WHERE oi.sku IS NULL;