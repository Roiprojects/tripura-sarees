
CREATE OR REPLACE FUNCTION public.decrement_stock_for_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_updated int;
BEGIN
  FOR r IN
    SELECT product_id, size, color, quantity
    FROM public.order_items
    WHERE order_id = p_order_id
  LOOP
    -- Try size + color combo first
    UPDATE public.product_variants
       SET stock_quantity = GREATEST(stock_quantity - r.quantity, 0)
     WHERE product_id = r.product_id
       AND size = r.size
       AND COALESCE(color_name,'') = COALESCE(r.color,'');
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    -- Fallback to size-only variant
    IF v_updated = 0 THEN
      UPDATE public.product_variants
         SET stock_quantity = GREATEST(stock_quantity - r.quantity, 0)
       WHERE product_id = r.product_id
         AND size = r.size
         AND COALESCE(color_name,'') = '';
      GET DIAGNOSTICS v_updated = ROW_COUNT;
    END IF;

    -- Fallback to base product stock
    IF v_updated = 0 THEN
      UPDATE public.products
         SET stock = GREATEST(COALESCE(stock,0) - r.quantity, 0)
       WHERE id = r.product_id;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_stock_for_order(uuid) TO authenticated, service_role;
