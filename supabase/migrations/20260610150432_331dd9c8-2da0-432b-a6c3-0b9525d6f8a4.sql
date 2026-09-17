ALTER TABLE public.products ALTER COLUMN price TYPE numeric(14,2);
ALTER TABLE public.products ALTER COLUMN compare_at_price TYPE numeric(14,2);
ALTER TABLE public.product_variants ALTER COLUMN variant_price TYPE numeric(14,2);