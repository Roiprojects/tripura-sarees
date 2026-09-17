// Built-in default images shown on the homepage when an admin hasn't
// uploaded custom replacements. The admin "Homepage Images" page reads this
// to show admins exactly which images are currently live, so they can
// replace each one with a custom upload.

export type DefaultImage = {
  image: string;       // bundled asset path (resolved via resolveImage)
  title?: string;
  subtitle?: string;
  href?: string;
  ctaLabel?: string;
};

export const DEFAULT_GROUP_IMAGES: Record<string, DefaultImage[]> = {
  "hero-main": [
    { image: "/src/assets/sarees/hero-wedding.svg", title: "The Wedding Edit — Banarasi & Kanjeevaram silks", href: "/occasion/wedding" },
    { image: "/src/assets/sarees/hero-handloom.svg", title: "Handloom cotton sarees woven in Tripura", href: "/category/handloom-sarees" },
    { image: "/src/assets/sarees/hero-festive.svg", title: "Festive season sarees", href: "/occasion/festive" },
    { image: "/src/assets/sarees/hero-designer.svg", title: "New arrivals — designer party drapes", href: "/new" },
  ],
  "hero-sidecards": [
    { image: "/src/assets/sarees/side-bridal.svg", subtitle: "BRIDAL SILKS", href: "/occasion/wedding" },
    { image: "/src/assets/sarees/side-silk.svg", subtitle: "KANJEEVARAM", href: "/category/kanjeevaram-silk" },
    { image: "/src/assets/sarees/side-handloom.svg", subtitle: "HANDLOOM", href: "/category/handloom-sarees" },
    { image: "/src/assets/sarees/side-designer.svg", subtitle: "DESIGNER", href: "/category/designer-sarees" },
  ],
  "footer-banners": [
    { image: "/src/assets/sarees/footer-handloom.svg", title: "Support Handloom", subtitle: "Every purchase keeps a weaver's loom running.", href: "/category/handloom-sarees", ctaLabel: "Shop Handloom" },
    { image: "/src/assets/sarees/footer-bridal.svg", title: "The Bridal Trousseau", subtitle: "Silks and zari for every wedding ritual.", href: "/occasion/wedding", ctaLabel: "Explore" },
  ],
  "sale-banner": [],
  "testimonials": [],
  "blog": [],
};
