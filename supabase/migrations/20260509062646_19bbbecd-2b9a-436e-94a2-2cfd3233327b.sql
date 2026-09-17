
-- ════════════════════════════════════════════════════════════════════
-- Consolidate categories into ONE canonical hierarchy per spec
-- ════════════════════════════════════════════════════════════════════

-- 1) Rename canonical roots
UPDATE public.categories SET name='Boys Fashion'    WHERE slug='boys-root';
UPDATE public.categories SET name='Girls Fashion'   WHERE slug='girls-root';
UPDATE public.categories SET name='Baby Essentials' WHERE slug='baby-root';

-- 2) Add Birthday Bash leaves
INSERT INTO public.categories (slug, name, parent_id, gender, sort_order, visible)
SELECT 'birthday-bash-boys',  'Boys Birthday',  id, 'boys',  1, true FROM public.categories WHERE slug='birthday-bash'
ON CONFLICT DO NOTHING;
INSERT INTO public.categories (slug, name, parent_id, gender, sort_order, visible)
SELECT 'birthday-bash-girls', 'Girls Birthday', id, 'girls', 2, true FROM public.categories WHERE slug='birthday-bash'
ON CONFLICT DO NOTHING;
INSERT INTO public.categories (slug, name, parent_id, gender, sort_order, visible)
SELECT 'birthday-bash-baby',  'Baby Birthday',  id, 'baby',  3, true FROM public.categories WHERE slug='birthday-bash'
ON CONFLICT DO NOTHING;

-- 3) Reassign products from orphan/duplicate categories to canonical leaves
-- Boys mappings
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='boys-ethnic-kurtha')
  WHERE name IN ('Royal Sherwani Set','Diwali Festive etnic Kurta','Festive Kurta Pajama','kurtha etnic wear','Cream Kurta Pajama Set');
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='boys-ethnic-indowestern')
  WHERE name IN ('Nehru Jacket Set');
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='boys-casual-denim')
  WHERE name IN ('Stepout Denim Jacket','Denim Jacket Set');
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='boys-casual-coord')
  WHERE name IN ('Cargo Joggers Set');
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='boys-casual-tshirts')
  WHERE name IN ('Casual Tee & Shorts','Bear Hug Sweater','Graphic Print T-Shirt');
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='boys-party-suits')
  WHERE name IN ('Boys Birthday Tuxedo','Navy Blazer Suit');
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='boys-party-blazers')
  WHERE name IN ('Boys Party Blazer Set');

-- Girls mappings
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='girls-casual-frocks')
  WHERE name IN ('Birthday Party Frock','Summer Sundress','Birthday Rainbow Frock','Polka Dot Frock','Floral Dress + Denim');
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='girls-party-skirtsets')
  WHERE name IN ('Floral Skirt Set','Pastel Jumpsuit');
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='girls-ethnic-lehenga')
  WHERE name IN ('Toddler Magenta Ghagra','Pink Embroidered Lehenga','Red Wedding Lehenga','Pink Lehenga Choli');
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='girls-ethnic-anarkali')
  WHERE name IN ('Pink Anarkali Suit','Sky Salwar Kameez');
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='girls-party-gowns')
  WHERE name IN ('Girls Party Gown','Pink Tulle Gown');

-- Baby mappings
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='baby-newborn-rompers')
  WHERE name IN ('Newborn Knit Romper','Infant Party Romper','Yellow Knit Romper');
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='baby-party-suits')
  WHERE name IN ('Infant Festive Anarkali','Yellow Baby Kurta Set','Baby Dhoti Kurta');
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='baby-casual-cotton')
  WHERE name IN ('Mint Cotton Onesie');
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='baby-party-birthday')
  WHERE name IN ('Infant Birthday Tutu');
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='baby-newborn-giftsets')
  WHERE name IN ('Knit Cap & Booties Set','Soft Knit Set');

-- 4) Delete duplicate / orphan categories (children first)
DELETE FROM public.categories WHERE slug IN (
  -- duplicate boys-fashion subtree leaves
  'boys-blazers','boys-suits','boys-waist-coat-sets','boys-indowestern','boys-kurtha-sets',
  'boys-casual-wear','boys-ethnic-wear','boys-party-wear',
  -- duplicate girls-fashion subtree
  'girls-frocks','girls-party-wear','girls-western',
  -- duplicate baby children under new-born-essentials
  'baby-accessories','baby-clothing','baby-toys'
);
DELETE FROM public.categories WHERE slug IN (
  'boys-fashion','girls-fashion',
  -- standalone orphan roots not used in canonical tree
  'boys','girls','infants','ethnic-wear','casual-wear','party-wear','frocks','western-wear',
  'new-arrivals','accessories','new-born-essentials'
);

-- 5) Ensure visible=true on all canonical entries
UPDATE public.categories SET visible=true WHERE visible IS NULL OR visible=false;
