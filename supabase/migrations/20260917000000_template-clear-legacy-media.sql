-- Template cleanup: earlier migrations point some category banners at a storage
-- project that no longer exists. Clear those URLs so the store pages fall back
-- to the bundled banner artwork until new images are uploaded in
-- Admin → Category Banners.
UPDATE public.categories
SET banner_url = NULL
WHERE banner_url LIKE 'https://wbjoiudbsiplyyroujxv.supabase.co/%';

UPDATE public.categories
SET image_url = NULL
WHERE image_url LIKE 'https://wbjoiudbsiplyyroujxv.supabase.co/%';
