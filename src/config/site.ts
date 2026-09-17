// ─────────────────────────────────────────────────────────────────────────────
// STORE SETTINGS — the single place to rebrand this storefront.
//
// Brand name, contact details, social links, SEO tags, shipping rules and
// delivery estimates all come from here. Long-form page copy lives in
// `content.ts`, and brand/store photos + the logo in `media.ts`.
//
// Contact details, the store address/area and delivery rules are still
// placeholders: replace them with the real business details before going live.
// Keep this file free of imports: vite.config.ts reads it at build time to
// fill the <title>/<meta> tags in index.html.
// ─────────────────────────────────────────────────────────────────────────────

export const site = {
  brand: {
    /** Shown in the header alt text, footer, emails, SMS, admin panel, etc. */
    name: "Tripura Sarees",
    /** Short line used next to the logo in alt text. */
    tagline: "Handwoven Sarees",
    /** Footer blurb (mobile) */
    shortBlurb: "Handwoven sarees, chosen with care.",
    /** Footer blurb (desktop) */
    longBlurb: "Silk, cotton and handloom sarees from India's weaving traditions — hand-picked for weddings, festivals, work and every day in between.",
    /** Name customers see for store credit (refunds, wallet payments). */
    walletName: "Tripura Sarees Wallet",
    /** Shown as the payee name inside the Razorpay checkout popup. */
    paymentDisplayName: "Tripura Sarees",
  },

  seo: {
    title: "Tripura Sarees — Silk, Cotton & Handloom Sarees Online",
    description: "Shop Banarasi, Kanjeevaram, Tripura handloom, cotton, linen and designer sarees for weddings, festivals, office and everyday wear.",
    author: "Tripura Sarees",
    /** Path inside /public */
    favicon: "/favicon.svg",
  },

  contact: {
    /** As displayed on the site */
    phoneDisplay: "+91 90000 00000",
    /** Used for tel: links (E.164, no spaces) */
    phoneE164: "+919000000000",
    /** WhatsApp number: country code + number, digits only */
    whatsapp: "919000000000",
    email: "hello@tripurasarees.com",
    /** Full postal address on one line (footer) */
    addressOneLine: "Shop No. 1, Main Road, Your Area, Your City - 000000",
    /** Same address split into lines (contact page) */
    addressLines: ["Shop No. 1, Main Road,", "Your Area, Your City - 000000"],
    /** Opening hours shown on the contact page */
    hours: ["Mon – Sat · 10:00 AM – 8:00 PM", "Sunday · 11:00 AM – 6:00 PM"],
  },

  /** Physical store block (homepage "Visit us" section and About page) */
  store: {
    /** Small label above the store name */
    label: "Tripura Sarees",
    name: "Saree Studio",
    /** Neighbourhood / area used in headings, e.g. "…Store in <area>" */
    area: "Your City",
    /** Short location line (About page photo card) */
    areaCity: "Your Area, Your City",
    /** Address line in the "Visit us" card */
    regionLine: "Your Area, Your City, Your State — India",
    hours: "Mon–Sun · 10:00 AM – 9:00 PM",
    /** Google Maps search text for the embedded map (store name + area works best) */
    mapQuery: "Tripura Sarees, Your City",
    foundedYear: 2020,
  },

  /** Icons available: instagram, youtube, facebook, twitter, linkedin */
  socials: [
    { platform: "instagram", label: "Instagram", url: "https://instagram.com/tripurasarees" },
    { platform: "youtube", label: "YouTube", url: "https://youtube.com/@tripurasarees" },
  ],

  shipping: {
    /** Orders at or above this subtotal ship free (₹) */
    freeShippingThreshold: 5000,
    /** Shipping fee for a single-item order (₹) */
    singleItemFee: 99,
    /** Shipping fee for orders with two or more items (₹) */
    multiItemFee: 149,
  },

  /** Delivery estimate rules used at checkout, order tracking and in admin. */
  delivery: {
    local: {
      /** Name shown for fast local delivery, e.g. "Your City 2–3d" */
      label: "Your City",
      shortLabel: "LOCAL",
      /** Words that mark an address as local (matched in city/state/address) */
      matchTerms: ["your city"],
      /** Inclusive PIN code range treated as local, e.g. [560000, 562999]; null to disable */
      pincodeRange: null as [number, number] | null,
      minDays: 2,
      maxDays: 3,
    },
    /** Days for every other address */
    standardDays: 5,
  },

  auth: {
    /**
     * Phone-OTP logins get a synthetic email `phone_<digits>@<domain>`.
     * Must match PHONE_AUTH_EMAIL_DOMAIN in the verify-phone-otp edge function.
     * Pick it once, before launch — changing it later splits existing accounts.
     */
    phoneEmailDomain: "phone.tripurasarees.app",
  },

  admin: {
    /** Subtitle under the logo in the admin panel header */
    panelName: "Saree Store Management",
  },

  /** Footer "Developed by" credit. Set to null to hide it. */
  credit: { label: "ROI Infotech", url: "https://wa.me/919945379333" } as { label: string; url: string } | null,
};

export type SiteConfig = typeof site;
