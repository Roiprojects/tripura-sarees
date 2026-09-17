CREATE OR REPLACE FUNCTION public.enforce_cart_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requested integer;
  v_available integer;
  v_has_color_specific boolean;
BEGIN
  v_requested := COALESCE(NEW.quantity, 0);
  IF v_requested <= 0 THEN
    RAISE EXCEPTION 'Cart quantity must be greater than zero';
  END IF;

  SELECT pv.stock_quantity
    INTO v_available
    FROM public.product_variants pv
   WHERE pv.product_id = NEW.product_id
     AND pv.size = NEW.size
     AND COALESCE(pv.color_name, '') = COALESCE(NEW.color, '')
   LIMIT 1;

  IF v_available IS NOT NULL THEN
    IF v_requested > COALESCE(v_available, 0) THEN
      RAISE EXCEPTION 'Requested quantity % exceeds available stock % for product %, size %, color %',
        v_requested, COALESCE(v_available, 0), NEW.product_id, NEW.size, COALESCE(NEW.color, '');
    END IF;
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.product_variants pv
     WHERE pv.product_id = NEW.product_id
       AND pv.size = NEW.size
       AND COALESCE(pv.color_name, '') <> ''
  )
    INTO v_has_color_specific;

  IF COALESCE(NEW.color, '') <> '' AND v_has_color_specific THEN
    RAISE EXCEPTION 'No stock available for product %, size %, color %', NEW.product_id, NEW.size, NEW.color;
  END IF;

  SELECT pv.stock_quantity
    INTO v_available
    FROM public.product_variants pv
   WHERE pv.product_id = NEW.product_id
     AND pv.size = NEW.size
     AND COALESCE(pv.color_name, '') = ''
   LIMIT 1;

  IF v_available IS NOT NULL THEN
    IF v_requested > COALESCE(v_available, 0) THEN
      RAISE EXCEPTION 'Requested quantity % exceeds available stock % for product %, size %',
        v_requested, COALESCE(v_available, 0), NEW.product_id, NEW.size;
    END IF;
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.stock, 0)
    INTO v_available
    FROM public.products p
   WHERE p.id = NEW.product_id
   LIMIT 1;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'Product % not found while validating cart stock', NEW.product_id;
  END IF;

  IF v_requested > COALESCE(v_available, 0) THEN
    RAISE EXCEPTION 'Requested quantity % exceeds available stock % for product %',
      v_requested, COALESCE(v_available, 0), NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$;
