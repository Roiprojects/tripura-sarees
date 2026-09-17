// Registry of all editable image groups on the homepage.
// The admin "Homepage Images" page uses this list to render one editor per group.
// Components on the storefront read from the same group_key via useImageGroup().

export type ImageGroupDef = {
  key: string;
  label: string;
  description: string;
  fields: {
    title?: boolean;       // show title input
    subtitle?: boolean;    // show subtitle/tagline input
    href?: boolean;        // show CTA URL input
    ctaLabel?: boolean;    // show button text input
    mobileImage?: boolean; // show separate mobile image upload
  };
  recommended?: number; // recommended item count (hint only)
};

export const IMAGE_GROUPS: ImageGroupDef[] = [
  {
    key: "hero-main",
    label: "Hero Carousel — Main Banners",
    description: "The big sliding banners at the top of the homepage.",
    fields: { title: true, href: true, ctaLabel: true, mobileImage: true },
    recommended: 4,
  },
  {
    key: "hero-sidecards",
    label: "Hero — Side Cards",
    description: "The 4 small cards next to the hero carousel (Bridal Silks, Handloom, etc.).",
    fields: { title: true, subtitle: true, href: true },
    recommended: 4,
  },
  {
    key: "sale-banner",
    label: "Sale / Promo Banner",
    description: "Optional background image for the sale promo banner section.",
    fields: { title: true, subtitle: true, href: true, ctaLabel: true },
    recommended: 1,
  },
  {
    key: "testimonials",
    label: "Testimonials — Customer Reviews",
    description: "Happy customer quotes. Title = customer name, subtitle = the review text, button text = role/location.",
    fields: { title: true, subtitle: true, ctaLabel: true },
    recommended: 6,
  },
  {
    key: "blog",
    label: "Blog / Style Stories",
    description: "Editorial articles featured on the homepage. Title = post title, subtitle = excerpt, link = post URL, button text = optional category label.",
    fields: { title: true, subtitle: true, href: true, ctaLabel: true },
    recommended: 3,
  },
  {
    key: "footer-banners",
    label: "Footer Banners",
    description: "Promo strip shown just above the footer (e.g. handloom story, bridal trousseau, gift card).",
    fields: { title: true, subtitle: true, href: true, ctaLabel: true, mobileImage: true },
    recommended: 2,
  },
];
