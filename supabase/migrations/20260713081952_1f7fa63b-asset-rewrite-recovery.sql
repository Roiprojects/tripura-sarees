-- Recovery media rewrite: replace stale old-project / legacy asset references
-- with bundled local asset paths when an exact matching asset exists in src/assets.

UPDATE public.categories
SET banner_url = '/src/assets/banners/boys-casual-premium.jpg'
WHERE slug = 'boys-casual'
  AND banner_url = 'https://wbjoiudbsiplyyroujxv.supabase.co/storage/v1/object/public/homepage-media/category-banners/boys-casual-premium.jpg';

UPDATE public.categories
SET banner_url = '/src/assets/banners/boys-casual-premium-v2.jpg'
WHERE slug = 'boys-casual'
  AND banner_url = 'https://wbjoiudbsiplyyroujxv.supabase.co/storage/v1/object/public/homepage-media/category-banners/boys-casual-premium-v2.jpg';

UPDATE public.categories
SET banner_url = '/src/assets/banners/boys-casual-premium-v3.jpg'
WHERE slug = 'boys-casual'
  AND banner_url = 'https://wbjoiudbsiplyyroujxv.supabase.co/storage/v1/object/public/homepage-media/category-banners/boys-casual-premium-v3.jpg';

UPDATE public.categories
SET banner_url = '/src/assets/banners/boys-casual-premium-v4.jpg'
WHERE slug = 'boys-casual'
  AND banner_url = 'https://wbjoiudbsiplyyroujxv.supabase.co/storage/v1/object/public/homepage-media/category-banners/boys-casual-premium-v4.jpg';

UPDATE public.categories
SET banner_url = '/src/assets/banners/girls-ethnic-premium.jpg'
WHERE slug = 'girls-ethnic'
  AND banner_url = 'https://wbjoiudbsiplyyroujxv.supabase.co/storage/v1/object/public/homepage-media/category-banners/girls-ethnic-premium.jpg';

UPDATE public.categories
SET banner_url = '/src/assets/banners/girls-casual-premium.jpg'
WHERE slug = 'girls-casual'
  AND banner_url = 'https://wbjoiudbsiplyyroujxv.supabase.co/storage/v1/object/public/homepage-media/category-banners/girls-casual-premium.jpg';

UPDATE public.categories
SET banner_url = '/src/assets/banners/frock-party-gowns-premium.jpg'
WHERE slug = 'frock-party-gowns'
  AND banner_url = 'https://wbjoiudbsiplyyroujxv.supabase.co/storage/v1/object/public/homepage-media/category-banners/frock-party-gowns-premium.jpg';

UPDATE public.categories
SET banner_url = '/src/assets/banners/banner-infant-casual.jpg',
    image_url = '/src/assets/banners/banner-infant-casual.jpg'
WHERE image_url = '/__l5e/assets-v1/285f7787-5ee5-42ef-a06b-1d27c7780088/banner-infant-casual.jpg'
   OR image_url = '/__l5e/assets-v1/003fcc8b-2e39-4ef8-a366-a8ab1549f252/banner-infant-casual.jpg';

UPDATE public.categories
SET banner_url = '/src/assets/banners/banner-infant-ethnic.jpg',
    image_url = '/src/assets/banners/banner-infant-ethnic.jpg'
WHERE image_url = '/__l5e/assets-v1/d48d34f9-6ba6-4a08-8b68-1f9e14ea414a/banner-infant-ethnic.jpg'
   OR image_url = '/__l5e/assets-v1/7e845c47-4a8c-4730-97d5-23a378e5a2e3/banner-infant-ethnic.jpg';

UPDATE public.categories
SET banner_url = '/src/assets/banners/banner-infant-giftsets.jpg',
    image_url = '/src/assets/banners/banner-infant-giftsets.jpg'
WHERE image_url = '/__l5e/assets-v1/d7161bfa-f3b4-46d9-af77-a0baec8e9062/banner-infant-giftsets.jpg'
   OR image_url = '/__l5e/assets-v1/19eea821-9e07-4359-8804-c0016dc8ab26/banner-infant-giftsets.jpg';

UPDATE public.categories
SET banner_url = '/src/assets/banners/banner-infant-newborn.jpg',
    image_url = '/src/assets/banners/banner-infant-newborn.jpg'
WHERE image_url = '/__l5e/assets-v1/be6c3e33-3b1f-4a42-8215-1ee621a76c77/banner-infant-newborn.jpg'
   OR image_url = '/__l5e/assets-v1/fae5255f-c111-4a27-81ec-d49dd42c5c80/banner-infant-newborn.jpg';

UPDATE public.categories
SET banner_url = '/src/assets/banners/banner-infant-party.jpg',
    image_url = '/src/assets/banners/banner-infant-party.jpg'
WHERE image_url = '/__l5e/assets-v1/28bdc8a5-8299-4f9c-8a1b-3752d40e8821/banner-infant-party.jpg'
   OR image_url = '/__l5e/assets-v1/9b35c1ef-3a40-4071-b1e1-bf1408bb6448/banner-infant-party.jpg';

UPDATE public.categories
SET banner_url = '/src/assets/shop-boys.webp',
    image_url = COALESCE(image_url, '/src/assets/shop-boys.webp')
WHERE slug = 'boys-root'
  AND banner_url = '/__l5e/assets-v1/f2ecdf73-bca8-49ca-9c68-f6faf39b0bc9/shop-boys.webp';

UPDATE public.categories
SET banner_url = '/src/assets/shop-girls.webp',
    image_url = COALESCE(image_url, '/src/assets/shop-girls.webp')
WHERE slug = 'girls-root'
  AND banner_url = '/__l5e/assets-v1/1e597787-18b4-4cac-bdd4-4ca3c292eaa6/shop-girls.webp';

UPDATE public.categories
SET banner_url = '/src/assets/shop-newborn.webp',
    image_url = COALESCE(image_url, '/src/assets/shop-newborn.webp')
WHERE slug = 'infants'
  AND banner_url = '/__l5e/assets-v1/01d9123a-9030-4925-95b0-efde4ede7b5b/shop-newborn.webp';
