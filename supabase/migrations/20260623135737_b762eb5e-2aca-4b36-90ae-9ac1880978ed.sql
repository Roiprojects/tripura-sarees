DROP TRIGGER IF EXISTS cart_items_enforce_stock ON public.cart_items;
CREATE TRIGGER cart_items_enforce_stock
BEFORE INSERT OR UPDATE OF quantity, size, color, product_id
ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.enforce_cart_stock();