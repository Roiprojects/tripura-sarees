# Tripura Sarees

Online saree store for silk, handloom, cotton and designer sarees, built with
React, Vite, Tailwind CSS and Supabase. Deep emerald and antique gold theme
with Playfair Display headings.

**Start here → [SETUP.md](SETUP.md)** for installation, store details,
backend setup and deployment.

## What's included

**Storefront**
- Homepage with hero banners, "Shop by Weave" categories, new arrivals, shop by
  occasion, best sellers, the handloom story, reels, testimonials and a store
  location map — sections are reordered and edited from the admin panel
- Category pages (Silk, Cotton & Handloom, Designer and each weave), occasion
  pages (Wedding, Festive, Party, Office Wear, Daily Wear) and a full shop page
  with weave, price, occasion, colour and blouse-size filters
- Product pages with colour variants, stock checks, blouse size guide, saree
  specifications and care, and a "Buy Now" flow
- Cart, checkout with saved addresses, coupons, wallet store credit, Razorpay
  (UPI/cards) and Cash on Delivery
- Phone OTP login, account area with orders, tracking, cancellations and
  wallet history
- WhatsApp chat and video-consultation booking

**Admin panel (`/admin`)**
- Dashboard with sales analytics and PDF/Excel export
- Products (with AI-assisted saree descriptions), variants, categories and
  category banners
- Orders, refunds, wallet confirmations, coupons
- Homepage sections, images, reels, navigation bar, filters, payment methods,
  size guides, shop by occasion
- Staff accounts with per-module permissions, subscribers, video consultations

## Where to customise

| What | Where |
|---|---|
| Store name, contact details, socials, SEO, shipping and delivery rules | `src/config/site.ts` |
| About story, press, announcements, testimonials and other page copy | `src/config/content.ts` |
| Logo and store photos | `src/config/media.ts`, `src/assets/brand/` |
| Built-in weave/occasion structure used before the database is filled | `src/lib/sareeCatalog.ts` |
| Colours | `src/index.css` (tokens) and `tailwind.config.ts` (brand palettes) |
| Products, categories, banners, homepage layout, coupons | Admin panel |

The store ships with illustrated placeholder artwork (`src/assets/sarees/`,
`public/products/sarees/`). Replace it with real photographs of your sarees
from the admin panel before launch.

## Project structure

```text
src/
  config/        store settings, page copy and brand images (start here)
  pages/         storefront pages; pages/admin for the admin panel
  components/    shared UI; components/ui holds shadcn/ui primitives
  providers/     auth, cart and wishlist state
  lib/           pricing, shipping, delivery, image, catalogue and payment helpers
  assets/sarees/ placeholder saree artwork (banners, categories, occasions)
supabase/
  migrations/    database schema, security policies and the sample saree catalogue
  functions/     edge functions: OTP login, Razorpay, SMS, staff admin, AI, ERP
  manual/        one-off SQL (first admin account)
public/          static files, favicon, placeholder product art and hosting rewrite rules
```

## Commands

```bash
npm install      # install dependencies
npm run dev      # start locally on http://localhost:8080
npm run build    # production build into dist/
npm test         # unit tests
```
