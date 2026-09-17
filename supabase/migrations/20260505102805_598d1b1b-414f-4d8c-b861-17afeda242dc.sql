-- Schema
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, email text, phone text, address text,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text not null unique,
  image_url text, description text
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null, description text not null,
  price numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2),
  category_id uuid references public.categories(id) on delete set null,
  collection text, gender text,
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  images text[] not null default '{}',
  stock int not null default 0,
  rating numeric(2,1) not null default 5.0,
  review_count int not null default 0,
  is_featured boolean not null default false,
  is_new boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  size text not null, color text not null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id, size, color)
);

create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  total numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  coupon_code text,
  shipping_address jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  quantity int not null, size text not null, color text not null,
  price numeric(10,2) not null
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  title text, body text,
  created_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, description text,
  discount_type text not null check (discount_type in ('percent','flat')),
  discount_value numeric(10,2) not null,
  min_order numeric(10,2) not null default 0,
  active boolean not null default true,
  expires_at timestamptz
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null, subtitle text, body text,
  cta_label text, cta_url text, image_url text,
  position text not null default 'hero',
  sort_order int not null default 0,
  active boolean not null default true
);

-- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlist enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.coupons enable row level security;
alter table public.banners enable row level security;

create policy "categories read" on public.categories for select using (true);
create policy "products read" on public.products for select using (true);
create policy "reviews read" on public.reviews for select using (true);
create policy "reviews insert auth" on public.reviews for insert with check (auth.uid() = user_id);
create policy "coupons read active" on public.coupons for select using (active = true);
create policy "banners read active" on public.banners for select using (active = true);
create policy "profiles select own" on public.profiles for select using (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "cart all own" on public.cart_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wishlist all own" on public.wishlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "orders all own" on public.orders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "order_items select own" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "order_items insert own" on public.order_items for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- Auto-profile trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Seed
insert into public.categories (name, slug, description) values
  ('Boys','boys','2-12 years'),
  ('Girls','girls','2-12 years'),
  ('Infants','infants','0-2 years')
on conflict (slug) do nothing;

with c as (select slug, id from public.categories)
insert into public.products
  (name, description, price, compare_at_price, category_id, collection, gender, sizes, colors, images, stock, rating, review_count, is_featured, is_new)
values
  -- BOYS
  ('Royal Sherwani Set','Premium gold-embroidered cream sherwani for your little prince.',2499,3499,(select id from c where slug='boys'),'wedding','boys',array['2Y','3Y','4Y','5Y','6Y','7Y','8Y'],array['Cream','Gold'],array['/src/assets/products/boy-sherwani.jpg'],30,4.9,142,true,true),
  ('Festive Kurta Pajama','Cream silk kurta with subtle embroidery and matching dhoti.',1299,1799,(select id from c where slug='boys'),'festival','boys',array['2Y','3Y','4Y','5Y','6Y'],array['Cream','Maroon'],array['/src/assets/products/boy-kurta.jpg'],45,4.8,96,true,false),
  ('Nehru Jacket Set','Off-white cotton kurta with cream Nehru jacket.',1599,2199,(select id from c where slug='boys'),'wedding','boys',array['3Y','4Y','5Y','6Y','7Y'],array['Cream','White'],array['/src/assets/products/boy-nehru.jpg'],28,4.7,64,false,true),
  ('Diwali Festive Kurta','Orange brocade kurta with paisley print.',1199,1599,(select id from c where slug='boys'),'festival','boys',array['2Y','3Y','4Y','5Y','6Y','7Y'],array['Orange','Maroon'],array['/src/assets/cards/festival.jpg'],50,4.9,88,true,false),
  ('Stepout Denim Jacket','Trendy denim jacket and jeans set.',1799,2299,(select id from c where slug='boys'),'stepout','boys',array['4Y','5Y','6Y','7Y','8Y','10Y'],array['Blue'],array['/src/assets/products/boy-denim.jpg'],40,4.6,71,false,true),
  ('Cargo Joggers Set','Olive cargo joggers with graphic tee.',999,1399,(select id from c where slug='boys'),'stepout','boys',array['4Y','5Y','6Y','7Y','8Y'],array['Olive','Khaki'],array['/src/assets/products/boy-cargo.jpg'],55,4.5,53,false,true),
  ('Casual Tee & Shorts','Easy-breezy cotton tee and shorts set.',699,999,(select id from c where slug='boys'),'summer','boys',array['2Y','3Y','4Y','5Y','6Y'],array['White','Blue','Red'],array['/src/assets/products/boy-casual.jpg'],70,4.6,110,false,false),
  ('Bear Hug Sweater','Cozy knit sweater with adorable bear print.',1299,1699,(select id from c where slug='boys'),'stepout','boys',array['3Y','4Y','5Y','6Y','7Y'],array['Cream','Grey'],array['/src/assets/products/boy-sweater.jpg'],35,4.8,67,true,false),
  ('Boys Birthday Tuxedo','Sharp navy tuxedo with bow tie for birthday parties.',2199,2899,(select id from c where slug='boys'),'birthday','boys',array['3Y','4Y','5Y','6Y','7Y','8Y'],array['Blue','Black'],array['/src/assets/cards/birthday-boys.webp'],25,4.9,82,true,true),
  ('Boys Party Blazer Set','Velvet blazer with crisp shirt for party occasions.',1899,2499,(select id from c where slug='boys'),'party','boys',array['4Y','5Y','6Y','7Y','8Y'],array['Maroon','Black'],array['/src/assets/products/boy-sherwani.jpg'],32,4.7,58,false,true),

  -- GIRLS
  ('Pink Embroidered Lehenga','Stunning pink lehenga choli with gold embroidery.',2299,2999,(select id from c where slug='girls'),'wedding','girls',array['2Y','3Y','4Y','5Y','6Y','7Y','8Y'],array['Pink','Gold'],array['/src/assets/products/girl-lehenga.jpg'],32,4.9,156,true,true),
  ('Pink Anarkali Suit','Soft pink anarkali with delicate embroidery.',1699,2299,(select id from c where slug='girls'),'festival','girls',array['2Y','3Y','4Y','5Y','6Y','7Y'],array['Pink','Cream'],array['/src/assets/products/girl-anarkali.jpg'],38,4.8,92,true,false),
  ('Sky Salwar Kameez','Pastel blue salwar kameez with golden border and dupatta.',1499,1999,(select id from c where slug='girls'),'festival','girls',array['3Y','4Y','5Y','6Y','7Y','8Y'],array['Blue','Gold'],array['/src/assets/products/girl-salwar.jpg'],42,4.7,76,false,false),
  ('Red Wedding Lehenga','Royal red and gold lehenga for the tiniest princess.',3299,4499,(select id from c where slug='girls'),'wedding','girls',array['3Y','4Y','5Y','6Y','7Y','8Y'],array['Red','Gold'],array['/src/assets/cards/wedding.jpg'],20,5.0,198,true,false),
  ('Birthday Party Frock','Magical pink party frock with tulle layers.',1399,1899,(select id from c where slug='girls'),'birthday','girls',array['2Y','3Y','4Y','5Y','6Y','7Y'],array['Pink','Purple'],array['/src/assets/products/girl-party.jpg'],36,4.9,121,true,true),
  ('Floral Skirt Set','Bright floral skirt with crop top.',999,1299,(select id from c where slug='girls'),'stepout','girls',array['3Y','4Y','5Y','6Y','7Y'],array['Yellow','Pink','White'],array['/src/assets/products/girl-skirt.jpg'],50,4.6,68,false,true),
  ('Summer Sundress','Cotton sundress with cherry print.',849,1199,(select id from c where slug='girls'),'summer','girls',array['2Y','3Y','4Y','5Y','6Y'],array['Pink','White'],array['/src/assets/products/girl-summer.jpg'],60,4.7,94,false,false),
  ('Toddler Magenta Ghagra','Magenta and gold ghagra for tiny dancers.',1299,1699,(select id from c where slug='girls'),'festival','girls',array['1Y','2Y','3Y','4Y'],array['Pink','Gold'],array['/src/assets/products/toddler-ghagra.jpg'],28,4.9,55,true,true),
  ('Birthday Rainbow Frock','Rainbow tulle frock for birthday parties.',1399,1899,(select id from c where slug='girls'),'birthday','girls',array['2Y','3Y','4Y','5Y','6Y'],array['Multi'],array['/src/assets/cards/birthday-girls.webp'],30,4.9,73,false,true),
  ('Girls Party Gown','Sequined evening gown for special parties.',1999,2599,(select id from c where slug='girls'),'party','girls',array['3Y','4Y','5Y','6Y','7Y','8Y'],array['Pink','Purple'],array['/src/assets/products/girl-party.jpg'],26,4.8,88,true,false),

  -- INFANTS
  ('Yellow Baby Kurta Set','Soft cotton yellow kurta with matching pajama.',899,1199,(select id from c where slug='infants'),'festival','infants',array['0-3M','3-6M','6-9M','9-12M','12-18M'],array['Yellow','Cream'],array['/src/assets/products/baby-romper.jpg'],55,4.9,132,true,true),
  ('Mint Cotton Onesie','Adorable mint-green onesie in pure organic cotton.',699,899,(select id from c where slug='infants'),'summer','infants',array['0-3M','3-6M','6-9M','9-12M'],array['Mint'],array['/src/assets/products/baby-onesie.jpg'],80,4.8,210,true,false),
  ('Baby Dhoti Kurta','Cream silk dhoti and kurta for baby boy.',1099,1499,(select id from c where slug='infants'),'wedding','infants',array['3-6M','6-9M','9-12M','12-18M'],array['Cream','Gold'],array['/src/assets/products/baby-dhoti.jpg'],40,4.9,76,true,false),
  ('Infant Birthday Tutu','Soft pink tutu set with crown for first birthday.',1199,1599,(select id from c where slug='infants'),'birthday','infants',array['6-9M','9-12M','12-18M'],array['Pink'],array['/src/assets/cards/birthday-infants.webp'],45,4.9,98,true,true),
  ('Newborn Knit Romper','Cozy organic knit romper.',849,1099,(select id from c where slug='infants'),'stepout','infants',array['0-3M','3-6M','6-9M'],array['Cream','Yellow'],array['/src/assets/products/baby-romper.jpg'],70,4.7,64,false,true),
  ('Infant Festive Anarkali','Tiny anarkali with delicate embroidery for festivals.',999,1399,(select id from c where slug='infants'),'festival','infants',array['6-9M','9-12M','12-18M'],array['Pink','Gold'],array['/src/assets/products/girl-anarkali.jpg'],35,4.8,52,false,false),
  ('Infant Party Romper','Sparkly party romper with bow.',999,1299,(select id from c where slug='infants'),'party','infants',array['3-6M','6-9M','9-12M','12-18M'],array['Pink','Cream'],array['/src/assets/cards/birthday-infants.webp'],38,4.7,44,false,true);
