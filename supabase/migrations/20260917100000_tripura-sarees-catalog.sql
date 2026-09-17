-- Tripura Sarees: replace the sample kids-clothing catalogue from the earlier
-- template migrations with a sample saree catalogue, navigation, occasion
-- tiles and filter settings.
--
-- Safety: the catalogue swap only runs on a fresh store (no orders yet), so it
-- never deletes products that real orders point at. On a store that already
-- has orders it does nothing except rename the site title.

UPDATE public.homepage_settings SET site_title = 'Tripura Sarees' WHERE site_title = 'Your Store';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.orders) THEN
    RAISE NOTICE 'Tripura Sarees catalogue skipped: orders already exist.';
    RETURN;
  END IF;

  -- ── Remove the kids sample data ──────────────────────────────────────────
  DELETE FROM public.products;
  DELETE FROM public.categories;
  DELETE FROM public.shop_by_age;
  DELETE FROM public.nav_links;
  DELETE FROM public.occasion_tiles;
  DELETE FROM public.homepage_banners
   WHERE group_key IN ('what-looking-for', 'shop-by-categories', 'shop-by-style', 'party-wear',
                       'casual-store', 'birthday-bash', 'special-collections');
  DELETE FROM public.homepage_sections
   WHERE key IN ('what-looking-for', 'shop-by-categories', 'scroll-category-showcase', 'trending',
                 'shop-by-style', 'party-wear', 'casual-store', 'birthday-bash', 'featured-wardrobe',
                 'special-collections', 'shop-by-age');
  DELETE FROM public.filter_options WHERE field IN ('gender', 'size', 'collection', 'occasion');

  -- ── Categories: three weave groups, three weaves each ────────────────────
  INSERT INTO public.categories (name, slug, description, sort_order, visible) VALUES
    ('Silk Sarees', 'silk-sarees', 'Rich, lustrous silks with real zari for weddings and celebrations.', 1, true),
    ('Cotton & Handloom', 'handloom-sarees', 'Breathable handwoven cottons and linens for every day.', 2, true),
    ('Designer Sarees', 'designer-sarees', 'Lightweight statement drapes for parties and receptions.', 3, true);

  INSERT INTO public.categories (name, slug, description, sort_order, visible, parent_id)
  SELECT v.name, v.slug, v.description, v.sort_order, true, p.id
  FROM (VALUES
    ('Banarasi Silk', 'banarasi-silk', 'Brocade weaves from Varanasi with intricate zari butas.', 1, 'silk-sarees'),
    ('Kanjeevaram Silk', 'kanjeevaram-silk', 'Heavy mulberry silk with temple borders from Kanchipuram.', 2, 'silk-sarees'),
    ('Tussar Silk', 'tussar-silk', 'Textured wild silk with an earthy golden sheen.', 3, 'silk-sarees'),
    ('Tripura Handloom', 'tripura-handloom', 'Hand-woven cotton sarees with traditional striped borders.', 1, 'handloom-sarees'),
    ('Cotton Sarees', 'cotton-sarees', 'Soft tant, mul and handblock cottons for daily comfort.', 2, 'handloom-sarees'),
    ('Linen Sarees', 'linen-sarees', 'Crisp, cool linen drapes that work beautifully for office.', 3, 'handloom-sarees'),
    ('Georgette & Chiffon', 'georgette-chiffon', 'Flowing, featherlight sarees in prints and embellishment.', 1, 'designer-sarees'),
    ('Organza Sarees', 'organza-sarees', 'Sheer organza with embroidery, pearls and delicate borders.', 2, 'designer-sarees'),
    ('Party Wear Sarees', 'party-wear-sarees', 'Sequins, tissue and shimmer for evening occasions.', 3, 'designer-sarees')
  ) AS v(name, slug, description, sort_order, parent_slug)
  JOIN public.categories p ON p.slug = v.parent_slug;

  -- ── Sample sarees (images are illustrated placeholders in public/products/sarees) ──
  INSERT INTO public.products
    (name, slug, description, price, compare_at_price, category_id, collection, gender, sizes, colors, images,
     stock, rating, review_count, is_featured, is_new, is_trending, section_keys, tags,
     specifications, care_instructions, country_of_origin, status)
  SELECT
    v.name, v.slug, v.description, v.price, v.mrp, c.id, v.occasion, 'women', ARRAY['Free Size'], ARRAY[v.color],
    ARRAY['/products/sarees/' || v.art || '-1.svg', '/products/sarees/' || v.art || '-2.svg'],
    v.stock, v.rating, v.reviews, v.featured, v.is_new, v.trending, v.section_keys, v.tags,
    jsonb_build_array(
      jsonb_build_object('label', 'Fabric', 'value', v.fabric),
      jsonb_build_object('label', 'Weave', 'value', v.weave),
      jsonb_build_object('label', 'Saree Length', 'value', '5.5 m'),
      jsonb_build_object('label', 'Blouse Piece', 'value', '0.8 m (unstitched)'),
      jsonb_build_object('label', 'Occasion', 'value', v.occasion)
    ),
    CASE WHEN v.fabric ILIKE '%silk%' OR v.fabric ILIKE '%tissue%'
      THEN ARRAY['Dry clean only', 'Store folded in a muslin cloth, away from direct sunlight', 'Refold every few months to protect the zari']
      ELSE ARRAY['Gentle hand wash separately in cold water', 'Dry in shade', 'Iron on medium heat on the reverse side']
    END,
    'India', 'active'
  FROM (VALUES
    ('Crimson Banarasi Katan Silk Saree with Gold Zari Buta', 'crimson-banarasi-katan-silk-saree',
     'Pure katan silk in deep crimson with gold zari butas, an emerald border and a richly woven pallu — a timeless bridal classic.',
     12499, 14999, 'banarasi-silk', 'Wedding', 'Red', 'crimson-banarasi', 8, 4.9, 64, true, false, false,
     ARRAY['best-selling'], ARRAY['zari', 'bridal', 'pure silk'], 'Pure Katan Silk', 'Banarasi Handloom'),
    ('Emerald Banarasi Silk Saree with Kadwa Jaal', 'emerald-banarasi-silk-saree-kadwa-jaal',
     'Emerald green silk with an all-over zari jaal, a contrast maroon border and a lotus-motif pallu.',
     10999, 12999, 'banarasi-silk', 'Wedding', 'Green', 'emerald-banarasi', 6, 4.8, 41, true, true, false,
     ARRAY['new-arrivals', 'best-selling'], ARRAY['zari', 'jaal', 'pure silk'], 'Pure Silk', 'Kadwa Banarasi'),
    ('Royal Blue Banarasi Tanchoi Silk Saree', 'royal-blue-banarasi-tanchoi-silk-saree',
     'Royal blue tanchoi silk with delicate self-woven butis and a magenta lotus border.',
     8999, 10499, 'banarasi-silk', 'Festive', 'Blue', 'royal-blue-banarasi', 10, 4.7, 28, false, false, true,
     ARRAY['selling-fast'], ARRAY['tanchoi', 'festive'], 'Silk', 'Tanchoi Banarasi'),
    ('Mustard Kanjeevaram Silk Saree with Temple Border', 'mustard-kanjeevaram-silk-saree-temple-border',
     'Mustard yellow Kanjeevaram silk with a maroon temple border and a peacock-motif contrast pallu.',
     15999, 18499, 'kanjeevaram-silk', 'Wedding', 'Yellow', 'mustard-kanjeevaram', 5, 4.9, 37, true, false, false,
     ARRAY['best-selling'], ARRAY['temple border', 'zari', 'pure silk'], 'Pure Mulberry Silk', 'Kanjeevaram'),
    ('Peacock Green Kanjeevaram Silk Saree with Contrast Pallu', 'peacock-green-kanjeevaram-silk-saree',
     'Peacock green silk with a rani pink temple border and pallu, woven with fine gold zari.',
     17499, 19999, 'kanjeevaram-silk', 'Wedding', 'Green', 'peacock-kanjeevaram', 4, 4.8, 22, true, true, false,
     ARRAY['new-arrivals'], ARRAY['temple border', 'bridal'], 'Pure Mulberry Silk', 'Kanjeevaram'),
    ('Magenta Kanjeevaram Silk Saree with Zari Checks', 'magenta-kanjeevaram-silk-saree-zari-checks',
     'Magenta silk with gold zari checks, a purple temple border and a lotus pallu.',
     13999, 15999, 'kanjeevaram-silk', 'Festive', 'Pink', 'magenta-kanjeevaram', 7, 4.7, 19, false, false, true,
     ARRAY['selling-fast'], ARRAY['checks', 'zari'], 'Silk', 'Kanjeevaram'),
    ('Natural Tussar Silk Saree with Lotus Pallu', 'natural-tussar-silk-saree-lotus-pallu',
     'Textured natural tussar with a rust border and a hand-woven lotus pallu.',
     6499, 7499, 'tussar-silk', 'Festive', 'Beige', 'natural-tussar', 12, 4.6, 33, false, true, false,
     ARRAY['new-arrivals'], ARRAY['tussar', 'handwoven'], 'Tussar Silk', 'Handloom'),
    ('Rust Tussar Silk Saree with Woven Butis', 'rust-tussar-silk-saree-woven-butis',
     'Earthy rust tussar with gold butis and a dark contrast border — polished enough for the office.',
     5799, 6799, 'tussar-silk', 'Office Wear', 'Orange', 'rust-tussar', 14, 4.5, 18, false, false, false,
     ARRAY[]::text[], ARRAY['tussar', 'workwear'], 'Tussar Silk', 'Handloom'),
    ('Tripura Handloom Cotton Saree with Indigo Border', 'tripura-handloom-cotton-saree-indigo-border',
     'Off-white handloom cotton with fine stripes and a deep indigo border and pallu, woven in Tripura.',
     2299, 2699, 'tripura-handloom', 'Daily Wear', 'White', 'indigo-tripura-handloom', 25, 4.8, 57, true, false, true,
     ARRAY['best-selling', 'selling-fast'], ARRAY['handloom', 'tripura', 'cotton'], 'Handloom Cotton', 'Tripura Handloom'),
    ('Tripura Handloom Saree in Leaf Green', 'tripura-handloom-saree-leaf-green',
     'Leaf green handloom cotton with woven stripes and a deep green border — light, breathable and festive.',
     2799, 3199, 'tripura-handloom', 'Festive', 'Green', 'leaf-green-tripura-handloom', 18, 4.7, 26, false, true, false,
     ARRAY['new-arrivals'], ARRAY['handloom', 'tripura'], 'Handloom Cotton', 'Tripura Handloom'),
    ('Tripura Handloom Cotton Saree in Maroon Checks', 'tripura-handloom-cotton-saree-maroon-checks',
     'Maroon handloom cotton with gold checks and a charcoal border for everyday elegance.',
     2499, 2899, 'tripura-handloom', 'Daily Wear', 'Maroon', 'maroon-tripura-handloom', 20, 4.6, 21, false, false, false,
     ARRAY[]::text[], ARRAY['handloom', 'checks'], 'Handloom Cotton', 'Tripura Handloom'),
    ('Bengal Tant Cotton Saree with Red Paisley Border', 'bengal-tant-cotton-saree-red-border',
     'Crisp white tant cotton with a classic red paisley border — a festive favourite.',
     1899, 2199, 'cotton-sarees', 'Festive', 'White', 'bengal-tant-cotton', 30, 4.7, 48, false, false, true,
     ARRAY['selling-fast'], ARRAY['tant', 'cotton'], 'Cotton', 'Tant Handloom'),
    ('Ivory Mul Cotton Saree with Floral Print', 'ivory-mul-cotton-saree-floral-print',
     'Featherlight ivory mul cotton with soft floral prints and a teal border.',
     1499, 1799, 'cotton-sarees', 'Daily Wear', 'Ivory', 'ivory-mul-cotton', 35, 4.5, 30, false, true, false,
     ARRAY['new-arrivals'], ARRAY['mul cotton', 'printed'], 'Mul Cotton', 'Printed'),
    ('Sage Linen Saree with Silver Zari Border', 'sage-linen-saree-silver-zari-border',
     'Sage green pure linen with a subtle silver zari border — crisp, cool and office ready.',
     3299, 3799, 'linen-sarees', 'Office Wear', 'Green', 'sage-linen', 16, 4.6, 24, false, false, false,
     ARRAY[]::text[], ARRAY['linen', 'workwear'], 'Pure Linen', 'Handloom'),
    ('Powder Blue Linen Saree with Striped Pallu', 'powder-blue-linen-saree-striped-pallu',
     'Powder blue linen with woven stripes and a tasselled pallu.',
     3499, 3999, 'linen-sarees', 'Office Wear', 'Blue', 'powder-blue-linen', 15, 4.5, 16, false, true, false,
     ARRAY['new-arrivals'], ARRAY['linen'], 'Pure Linen', 'Handloom'),
    ('Blush Pink Georgette Saree with Sequin Border', 'blush-pink-georgette-saree-sequin-border',
     'Flowing blush pink georgette with a delicate sequin border for receptions and evenings.',
     4299, 4999, 'georgette-chiffon', 'Party', 'Pink', 'blush-georgette', 12, 4.6, 29, false, false, true,
     ARRAY['selling-fast'], ARRAY['georgette', 'sequin'], 'Georgette', 'Embellished'),
    ('Wine Chiffon Saree with Floral Print', 'wine-chiffon-saree-floral-print',
     'Deep wine chiffon with a soft floral print that drapes beautifully.',
     2999, 3499, 'georgette-chiffon', 'Party', 'Wine', 'wine-chiffon', 14, 4.5, 20, false, false, false,
     ARRAY[]::text[], ARRAY['chiffon', 'printed'], 'Chiffon', 'Printed'),
    ('Mint Organza Saree with Embroidered Florals', 'mint-organza-saree-embroidered-florals',
     'Sheer mint organza with embroidered florals and a scalloped border.',
     4999, 5799, 'organza-sarees', 'Party', 'Green', 'mint-organza', 10, 4.7, 23, true, true, false,
     ARRAY['new-arrivals'], ARRAY['organza', 'embroidered'], 'Organza', 'Embroidered'),
    ('Lavender Organza Saree with Pearl Border', 'lavender-organza-saree-pearl-border',
     'Lavender organza with woven butis and a pearl-finish border for festive evenings.',
     5499, 6299, 'organza-sarees', 'Festive', 'Lavender', 'lavender-organza', 9, 4.6, 14, false, false, false,
     ARRAY[]::text[], ARRAY['organza'], 'Organza', 'Embellished'),
    ('Black Party Wear Saree with Gold Sequin Pallu', 'black-party-wear-saree-gold-sequin-pallu',
     'Classic black satin-georgette with a shimmering gold sequin pallu.',
     6299, 7299, 'party-wear-sarees', 'Party', 'Black', 'black-party-wear', 11, 4.8, 35, true, false, true,
     ARRAY['best-selling', 'selling-fast'], ARRAY['sequin', 'party'], 'Satin Georgette', 'Embellished'),
    ('Gold Tissue Saree with Maroon Border', 'gold-tissue-saree-maroon-border',
     'Luminous gold tissue with a zari jaal and a rich maroon paisley border.',
     7499, 8499, 'party-wear-sarees', 'Wedding', 'Gold', 'gold-tissue', 8, 4.7, 17, false, true, false,
     ARRAY['new-arrivals'], ARRAY['tissue', 'zari'], 'Tissue Silk', 'Zari Jaal')
  ) AS v(name, slug, description, price, mrp, cat, occasion, color, art, stock, rating, reviews,
         featured, is_new, trending, section_keys, tags, fabric, weave)
  JOIN public.categories c ON c.slug = v.cat;

  -- ── Navigation bar ────────────────────────────────────────────────────────
  INSERT INTO public.nav_links (label, url, sort_order, visible) VALUES
    ('HOME', '/', 1, true),
    ('SILK SAREES', '/category/silk-sarees', 2, true),
    ('COTTON & HANDLOOM', '/category/handloom-sarees', 3, true),
    ('DESIGNER SAREES', '/category/designer-sarees', 4, true),
    ('SHOP BY OCCASION', '/shop-by-occasion', 5, true),
    ('NEW ARRIVALS', '/new', 6, true);

  -- ── Occasion tiles (Admin → Shop by Occasion) ─────────────────────────────
  INSERT INTO public.occasion_tiles (label, description, link, icon, gradient, sort_order, active) VALUES
    ('Wedding', 'Bridal silks and heirloom zari', '/occasion/wedding', 'Crown', 'from-emerald-100 via-amber-50 to-amber-100', 1, true),
    ('Festive', 'Colour and shine for every festival', '/occasion/festive', 'Sparkles', 'from-amber-100 via-yellow-50 to-emerald-100', 2, true),
    ('Party', 'Statement drapes for the evening', '/occasion/party', 'Star', 'from-rose-100 via-amber-50 to-amber-100', 3, true),
    ('Office Wear', 'Crisp linens and easy cottons', '/occasion/office-wear', 'Briefcase', 'from-emerald-200 via-emerald-50 to-amber-100', 4, true),
    ('Daily Wear', 'Light handlooms for every day', '/occasion/daily-wear', 'Sun', 'from-amber-200 via-amber-50 to-rose-100', 5, true);

  -- ── Filters ───────────────────────────────────────────────────────────────
  INSERT INTO public.filter_options (field, value, sort_order, active) VALUES
    ('collection', 'Wedding', 1, true),
    ('collection', 'Festive', 2, true),
    ('collection', 'Party', 3, true),
    ('collection', 'Office Wear', 4, true),
    ('collection', 'Daily Wear', 5, true)
  ON CONFLICT DO NOTHING;
END $$;

-- Shop sidebar: no gender/age filters for sarees; show weave, price, occasion,
-- colour and (blouse) size. Runs on every store — it only changes filter visibility.
INSERT INTO public.shop_filter_visibility (section_key, label, visible, sort_order) VALUES
  ('category',     'Weave',        true,  1),
  ('price',        'Price',        true,  2),
  ('occasion',     'Occasion',     true,  3),
  ('color',        'Colour',       true,  4),
  ('size',         'Blouse Size',  true,  5),
  ('availability', 'Availability', false, 6),
  ('gender',       'Gender',       false, 7),
  ('age',          'Age',          false, 8)
ON CONFLICT (section_key) DO UPDATE
  SET label = EXCLUDED.label, visible = EXCLUDED.visible, sort_order = EXCLUDED.sort_order;
