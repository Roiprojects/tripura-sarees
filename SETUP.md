# Setup Guide

This guide takes Tripura Sarees from a fresh download to a live store. Plan for
about an hour the first time, most of it on the Supabase and payment setup.

| Step | What you do | Time |
|---|---|---|
| 1 | Install and run locally | 5 min |
| 2 | Store details: contact, address, photos, copy | 15 min |
| 3 | Create the Supabase backend (database, storage, functions) | 20 min |
| 4 | Create your first admin account | 5 min |
| 5 | Connect payments and SMS | 10 min |
| 6 | Deploy the website | 10 min |

---

## 1. Install and run locally

Requirements: **Node.js 20+** and **npm**.

```bash
npm install
cp .env.example .env      # fill in after step 3
npm run dev               # http://localhost:8080
```

Until `.env` has your Supabase URL and key, the site shows a **"Store setup
needed"** screen instead of the shop. That is expected.

Useful commands:

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Unit tests |
| `npm run lint` | Lint |

---

## 2. Store details

The store is already branded as **Tripura Sarees** (emerald & gold theme,
saree navigation and copy). Contact details, the shop address/area and
delivery rules are still placeholders — fill them in before launch.
Everything that identifies the business lives in three files in `src/config/`.

### `src/config/site.ts` — brand and business settings

| Section | Controls |
|---|---|
| `brand` | Store name, tagline, footer text, wallet name, name shown in the Razorpay popup |
| `seo` | Browser tab title, search/social description, favicon path |
| `contact` | Phone, WhatsApp number, email, postal address, opening hours |
| `store` | Physical shop block: name, area, hours, Google Maps search text, founding year |
| `socials` | Footer and contact-page social links (`instagram`, `youtube`, `facebook`, `twitter`, `linkedin`) |
| `shipping` | Free-shipping threshold and shipping fees (₹) |
| `delivery` | Faster "local" delivery estimate (city names, PIN range, days) vs standard days |
| `auth.phoneEmailDomain` | Internal domain for phone-login accounts. **Choose once before launch** and set the same value as `PHONE_AUTH_EMAIL_DOMAIN` in step 3 |
| `admin.panelName` | Subtitle in the admin panel header |
| `credit` | Footer "Developed by" credit, or `null` to hide it |

The page `<title>` and meta tags in `index.html` are filled from `site.seo`
automatically at build time — don't edit them in `index.html`.

### `src/config/content.ts` — page copy

Sample marketing text that you should rewrite: the top announcement bar, the
homepage marquee, the "Visit us" section, the About page story, stats,
timeline, mission and testimonial, the Press page, fallback homepage
testimonials, newsletter text and pre-filled WhatsApp messages.

### `src/config/media.ts` — logo and store photos

- **Logo:** replace `src/assets/brand/logo.svg`, or add your own file (PNG,
  WebP or SVG) to `src/assets/brand/` and change the `logoAsset` import. A wide
  logo around 480×140 works best.
- **Favicon:** replace `public/favicon.svg` (or add `public/favicon.ico` and set
  `site.seo.favicon` to `/favicon.ico`).
- **Store photos:** the store ships with illustrated placeholders
  (`src/assets/sarees/`) for the storefront, saree wall, About page and press
  clipping. Add real photos of your studio to `src/assets/brand/` and point
  the imports at them.
- **Product and banner images:** the sample sarees use illustrated artwork from
  `public/products/sarees/`. Upload real saree photographs in
  **Admin → Products** and **Admin → Homepage Images**.

### Colours

Edit the HSL colour tokens at the top of `src/index.css` (`--primary` is the
emerald brand colour, `--sky` the gold accent). `tailwind.config.ts` maps the
Tailwind palette families used across the pages onto the emerald, gold and
maroon brand scales.

### Policy and info pages

Review these pages — they contain business policies, not just branding:

| Page | File |
|---|---|
| Return & refund policy (return window, cancellation and COD fees) | `src/pages/ReturnPolicy.tsx` |
| Shipping & delivery | `src/pages/Shipping.tsx` |
| Interest-free finance | `src/pages/Finance.tsx` |
| Payment options | `src/pages/PaymentOptions.tsx` |
| Blog articles | `src/pages/Blog.tsx` |
| Contact form categories | `src/pages/Contact.tsx` |

Products, categories, homepage sections, banners, navigation, coupons, size
guides, filters and payment methods are all managed from the **admin panel**
(`/admin`) once the backend is running — no code changes needed.

---

## 3. Create the Supabase backend

1. Create a project at [supabase.com](https://supabase.com). Note the
   **project ref** (the `xxxx` in `https://xxxx.supabase.co`).
2. Put the ref in `supabase/config.toml` (`project_id = "..."`).
3. Apply the database schema, storage buckets and sample catalogue:

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR-PROJECT-REF
   npx supabase db push
   ```

   The migrations create every table, security policy, database function and
   the public storage buckets `product-images` and `homepage-media`, plus
   a sample saree catalogue (3 weave groups, 9 weaves, 21 sarees, occasion tiles
   and navigation) you can edit or delete in the admin panel. The catalogue
   migration only replaces data on a fresh store with no orders.

4. Frontend keys: in **Project Settings → API**, copy the project URL and the
   anon/publishable key into `.env`:

   ```env
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY
   VITE_SUPABASE_PROJECT_ID=YOUR-PROJECT-REF
   ```

5. Server secrets: copy `supabase/.env.example` to `supabase/.env`, fill it in
   (see the table below), then upload it:

   ```bash
   npx supabase secrets set --env-file supabase/.env
   ```

   | Secret | Needed for |
   |---|---|
   | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | All functions |
   | `STORE_NAME` | Store name in SMS messages and AI product-copy prompts |
   | `PHONE_AUTH_EMAIL_DOMAIN` | Phone login — must equal `site.auth.phoneEmailDomain` |
   | `NETTYFISH_USER`, `NETTYFISH_PASSWORD`, `NETTYFISH_SENDER_ID`, `NETTYFISH_ROUTE` | OTP login and order SMS |
   | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Online payments |
   | `NVIDIA_API_KEY` | Optional "Generate with AI" buttons in the product form |
   | `ERP_API_KEY` | Optional ERP integration endpoint |

   Never commit `supabase/.env` or `.env`; both are git-ignored.

6. Deploy the edge functions:

   ```bash
   npx supabase functions deploy send-phone-otp
   npx supabase functions deploy verify-phone-otp
   npx supabase functions deploy razorpay-create-order
   npx supabase functions deploy razorpay-verify-payment
   npx supabase functions deploy send-order-confirmation-sms
   npx supabase functions deploy send-delivery-sms
   npx supabase functions deploy admin-manage-staff
   # optional
   npx supabase functions deploy generate-product-description
   npx supabase functions deploy analyze-product-image
   npx supabase functions deploy erp-api
   ```

   `supabase/config.toml` already marks the login functions (`send-phone-otp`,
   `verify-phone-otp`) and `erp-api` as public.

7. **Authentication → URL Configuration:** set the Site URL to your live domain
   and add it (and `http://localhost:8080`) to the redirect URLs. Keep the
   **Email** provider enabled — the admin panel signs in with email and
   password.

---

## 4. Create the first admin

1. **Authentication → Users → Add user**: create a user with your admin email
   and a strong password (tick "Auto confirm").
2. Open `supabase/manual/first-admin-bootstrap.sql`, replace
   `ADMIN_EMAIL_HERE` with that email, and run it in the **SQL Editor**.
3. Sign in at `/admin/login`.

Add staff with limited permissions later from **Admin → Staff**.

---

## 5. Payments and SMS

**Razorpay (UPI, cards, net banking):** create API keys in the Razorpay
dashboard and set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (step 3.5). Use test
keys first, then switch to live keys before launch. Enable or disable Cash on
Delivery and other options in **Admin → Payment Methods**.

**SMS (Nettyfish):** customers sign in with a phone OTP, so SMS must work
before launch. Indian DLT rules require every message to match a registered
template exactly. Register these three templates with your sender ID
(`{#var#}` marks the variable parts):

```text
Your {STORE_NAME} login OTP is {#var#}. This OTP is valid for 10 minutes. Do not share this OTP with anyone.
Thank you for shopping with {STORE_NAME}. Your order {#var#} has been successfully placed. We will notify you once your order is dispatched.
Your {STORE_NAME} order {#var#} has been delivered successfully. We hope you love draping your new saree. Thank you for shopping with us.
```

Replace `{STORE_NAME}` with the exact value of your `STORE_NAME` secret. If
your provider's wording differs, edit the text in
`supabase/functions/send-phone-otp`, `send-order-confirmation-sms` and
`send-delivery-sms`.

---

## 6. Deploy the website

```bash
npm run build
```

Upload the `dist/` folder to any static host. The project includes the
"single-page app" rewrite rules most hosts need, so deep links like
`/product/123` keep working after a refresh:

| Host | File included |
|---|---|
| Vercel | `vercel.json` |
| Netlify | `public/_redirects` |
| Apache / cPanel | `public/.htaccess` |

Set the `VITE_SUPABASE_*` variables in your host's environment settings
before building there. To serve the store from a subfolder such as
`example.com/shop/`, build with `VITE_BASE_PATH=/shop/ npm run build`.

---

## Go-live checklist

- [ ] `src/config/site.ts`: name, contact details, address, socials, shipping, delivery
- [ ] `src/config/content.ts`: story, stats, press and testimonials rewritten
- [ ] Store photos replaced; logo and favicon checked
- [ ] Policy pages reviewed (returns, shipping, finance, payments)
- [ ] Sample sarees replaced with real products and photographs in the admin panel
- [ ] Homepage banners and sections set in **Admin → Homepage / Homepage Images**
- [ ] Razorpay live keys set and a test payment completed
- [ ] OTP login SMS received on a real phone
- [ ] Order confirmation SMS received after a test order
- [ ] Admin and staff logins work
- [ ] Deep links still load after a browser refresh on the live domain
