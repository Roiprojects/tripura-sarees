// Built-in saree catalogue structure used by the storefront whenever the
// database has no categories / occasion tiles yet (fresh install, offline
// preview). Admin-managed rows always take priority.
import { resolveImage } from "@/lib/resolveImage";

import silkArt from "@/assets/sarees/category-silk-sarees.svg";
import handloomArt from "@/assets/sarees/category-handloom-sarees.svg";
import designerArt from "@/assets/sarees/category-designer-sarees.svg";
import banarasiArt from "@/assets/sarees/category-banarasi-silk.svg";
import kanjeevaramArt from "@/assets/sarees/category-kanjeevaram-silk.svg";
import tussarArt from "@/assets/sarees/category-tussar-silk.svg";
import tripuraArt from "@/assets/sarees/category-tripura-handloom.svg";
import cottonArt from "@/assets/sarees/category-cotton-sarees.svg";
import linenArt from "@/assets/sarees/category-linen-sarees.svg";
import georgetteArt from "@/assets/sarees/category-georgette-chiffon.svg";
import organzaArt from "@/assets/sarees/category-organza-sarees.svg";
import partyArt from "@/assets/sarees/category-party-wear-sarees.svg";

import weddingArt from "@/assets/sarees/occasion-wedding.svg";
import festiveArt from "@/assets/sarees/occasion-festive.svg";
import partyOccasionArt from "@/assets/sarees/occasion-party.svg";
import officeArt from "@/assets/sarees/occasion-office-wear.svg";
import dailyArt from "@/assets/sarees/occasion-daily-wear.svg";

export type SareeCategory = {
  slug: string;
  name: string;
  description: string;
  image: string;
  children?: SareeCategory[];
};

export const SAREE_CATEGORIES: SareeCategory[] = [
  {
    slug: "silk-sarees",
    name: "Silk Sarees",
    description: "Rich, lustrous silks with real zari for weddings and celebrations.",
    image: silkArt,
    children: [
      { slug: "banarasi-silk", name: "Banarasi Silk", description: "Brocade weaves from Varanasi with intricate zari butas.", image: banarasiArt },
      { slug: "kanjeevaram-silk", name: "Kanjeevaram Silk", description: "Heavy mulberry silk with temple borders from Kanchipuram.", image: kanjeevaramArt },
      { slug: "tussar-silk", name: "Tussar Silk", description: "Textured wild silk with an earthy golden sheen.", image: tussarArt },
    ],
  },
  {
    slug: "handloom-sarees",
    name: "Cotton & Handloom",
    description: "Breathable handwoven cottons and linens for every day.",
    image: handloomArt,
    children: [
      { slug: "tripura-handloom", name: "Tripura Handloom", description: "Hand-woven cotton sarees with traditional striped borders.", image: tripuraArt },
      { slug: "cotton-sarees", name: "Cotton Sarees", description: "Soft tant, mul and handblock cottons for daily comfort.", image: cottonArt },
      { slug: "linen-sarees", name: "Linen Sarees", description: "Crisp, cool linen drapes that work beautifully for office.", image: linenArt },
    ],
  },
  {
    slug: "designer-sarees",
    name: "Designer Sarees",
    description: "Lightweight statement drapes for parties and receptions.",
    image: designerArt,
    children: [
      { slug: "georgette-chiffon", name: "Georgette & Chiffon", description: "Flowing, featherlight sarees in prints and embellishment.", image: georgetteArt },
      { slug: "organza-sarees", name: "Organza Sarees", description: "Sheer organza with embroidery, pearls and delicate borders.", image: organzaArt },
      { slug: "party-wear-sarees", name: "Party Wear Sarees", description: "Sequins, tissue and shimmer for evening occasions.", image: partyArt },
    ],
  },
];

const ART_BY_SLUG: Record<string, string> = Object.fromEntries(
  SAREE_CATEGORIES.flatMap((c) => [[c.slug, c.image], ...(c.children ?? []).map((k) => [k.slug, k.image])]),
);

/** Category image: admin upload first, then the built-in artwork for known slugs. */
export const categoryImage = (slug: string, uploaded?: string | null) =>
  uploaded ? resolveImage(uploaded) : ART_BY_SLUG[slug] ?? resolveImage();

export type Occasion = {
  slug: string;
  label: string;
  description: string;
  /** Matched case-insensitively against products.collection */
  keyword: string;
  image: string;
};

export const OCCASIONS: Occasion[] = [
  { slug: "wedding", label: "Wedding", description: "Bridal silks and heirloom zari", keyword: "wedding", image: weddingArt },
  { slug: "festive", label: "Festive", description: "Colour and shine for every festival", keyword: "festive", image: festiveArt },
  { slug: "party", label: "Party", description: "Statement drapes for the evening", keyword: "party", image: partyOccasionArt },
  { slug: "office-wear", label: "Office Wear", description: "Crisp linens and easy cottons", keyword: "office", image: officeArt },
  { slug: "daily-wear", label: "Daily Wear", description: "Light handlooms for every day", keyword: "daily", image: dailyArt },
];

export const occasionBySlug = (slug: string) => OCCASIONS.find((o) => o.slug === slug);

/** Occasion artwork for a link like "/occasion/wedding". */
export const occasionImageForLink = (link: string | null | undefined) => {
  const slug = (link ?? "").split("?")[0].replace(/\/+$/, "").split("/").pop() ?? "";
  return occasionBySlug(slug)?.image ?? OCCASIONS[0].image;
};

/** One short line for product rails: the occasion, else "Free Size". */
export const productDetailLine = (p: { collection?: string | null; sizes?: string[] | null }) => {
  const occasion = (p.collection ?? "").trim();
  if (occasion) return occasion.replace(/\b\w/g, (c) => c.toUpperCase());
  const sizes = (p.sizes ?? []).filter(Boolean);
  if (sizes.length === 0 || sizes.every((s) => /free/i.test(s))) return "Free Size";
  return sizes.length > 1 ? `Sizes ${sizes[0]}–${sizes[sizes.length - 1]}` : sizes[0];
};
