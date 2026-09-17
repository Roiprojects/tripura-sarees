// ─────────────────────────────────────────────────────────────────────────────
// PAGE COPY — marketing text that is specific to this store.
//
// Brand name, city, contact details and shipping numbers are pulled from
// `site.ts`, so most edits happen there. The story, stats, press and
// testimonials below are SAMPLE text — rewrite them before going live.
// ─────────────────────────────────────────────────────────────────────────────
import { Award, Gem, HandHeart, Leaf, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { site } from "./site";

const name = site.brand.name;
const freeShip = site.shipping.freeShippingThreshold;
const since = site.store.foundedYear;

export const content = {
  /** Scrolling bar at the very top of every page. Icons: "sparkles" | "crown" */
  announcements: [
    { icon: "sparkles" as const, text: `Free Shipping On Orders Over ₹${freeShip}` },
    { icon: "crown" as const, text: `New handloom arrivals every week at ${name}` },
  ],

  /** Gold marquee strip on the homepage */
  trustMarquee: ["HANDPICKED FROM MASTER WEAVERS", `FREE SHIPPING OVER ₹${freeShip}`, "AUTHENTIC SILK & HANDLOOM", "EASY 7-DAY RETURNS"],

  /** "Visit us" section (homepage + contact page) */
  storeLocation: {
    eyebrow: "Visit us in person",
    headingPrefix: "Visit Our Saree Studio in",
    headingHighlight: site.store.area,
    subheading: "Feel the weaves in person, see how each drape falls, and let our team help you choose the perfect saree for your occasion.",
    photoCaptions: {
      front: "Our Studio",
      interior: "The Saree Wall",
      highlight: "New Weaves",
      event: "Bridal Trousseau",
    },
  },

  about: {
    heroQuote: "Every saree carries a weaver's story.",
    storyPullQuote: "A saree is not just six yards of fabric — it is heritage you can wear.",
    signatureQuote: `${name} — Every saree carries a weaver's story.`,
    sinceBadge: `Draping stories since ${since}`,
    paragraphs: [
      `${name} began in ${since} with a simple promise — authentic, beautifully woven sarees, chosen with care and offered at honest prices.`,
      `Today we are proud to be a trusted saree destination for women in ${site.store.area} and across India.`,
      "We work closely with weaving clusters and trusted suppliers, from the silk looms of Banaras and Kanchipuram to the handlooms of Tripura and Bengal.",
      "Every saree is checked by hand for weave, colour, zari and finish before it reaches you.",
      "From featherlight cottons for everyday wear to rich silks for the wedding season, our collection is curated for the way you really dress.",
      "We believe buying a saree should feel personal — so we share honest photos, fabric details and care tips with every piece.",
      "Supporting handloom means supporting the families who keep these traditions alive, and that matters to us.",
      `Whether it's your wedding, a festival, an office day or a family function, ${name} has a drape for the moment.`,
      "We are more than a saree shop — we are a place built on trust, craft and the joy of draping something beautiful.",
    ],
    stats: [
      { value: "5+", label: "Years of Weaves" },
      { value: "10k+", label: "Happy Customers" },
      { value: "3k+", label: "Sarees Curated" },
      { value: "4.8★", label: "Customer Rating" },
    ],
    /** Compact stats shown on phones */
    mobileStats: [
      { value: "5+", label: "Years" },
      { value: "10k+", label: "Customers" },
      { value: "4.8★", label: "Rating" },
    ],
    values: [
      { icon: Gem, title: "Authentic Weaves", text: "Silk and handloom sarees sourced from trusted weavers and clusters." },
      { icon: Leaf, title: "Natural Fabrics", text: "Pure silks, cottons and linens that breathe and drape beautifully." },
      { icon: Sparkles, title: "Zari & Detail", text: "Borders, pallus and motifs checked closely for finish and quality." },
      { icon: ShieldCheck, title: "Quality You Trust", text: "Every saree is inspected by hand before it is packed." },
      { icon: HandHeart, title: "Supporting Weavers", text: "Buying handloom keeps traditional craft and livelihoods alive." },
      { icon: Award, title: "Occasion Ready", text: "Drapes for weddings, festivals, work and every day in between." },
    ] as { icon: LucideIcon; title: string; text: string }[],
    mission: {
      title: "Keep India's weaves in every wardrobe.",
      text: "To bring authentic, thoughtfully curated sarees to women everywhere — and a fair, lasting market to the weavers who make them.",
    },
    vision: {
      title: "The saree store women trust.",
      text: "To be the first place women turn to for sarees that honour tradition while fitting the way they live today.",
    },
    /** One entry per image in media.about.timeline */
    timeline: [
      { year: String(since), title: "The First Loom", text: `${name} opens its doors with a small, hand-picked collection of handloom sarees.`, emoji: "🪡" },
      { year: String(since + 1), title: "Weaver Partnerships", text: "We begin working directly with weaving clusters for authentic silks and cottons.", emoji: "🧵" },
      { year: String(since + 2), title: "Bridal Collection", text: "Our Banarasi and Kanjeevaram bridal edit becomes a wedding-season favourite.", emoji: "👑" },
      { year: String(since + 3), title: "Going Digital", text: `${name} starts serving customers online.`, emoji: "🌟" },
      { year: String(since + 4), title: "Our Website", text: `${name} launches its own website, bringing handwoven sarees to homes everywhere.`, emoji: "🌐" },
    ],
    testimonial: {
      quote: `"${name} is where I buy every saree now. The weaves are genuine, the colours are exactly as shown, and the team truly knows their fabrics."`,
      attribution: "— A happy customer",
    },
    cta: {
      heading: "Find the drape that tells your story.",
      text: "Discover handwoven sarees for every celebration, every season and every day.",
    },
  },

  press: {
    featured: {
      outlet: "Publication Name",
      date: "Month YYYY",
      headline: "Your featured press headline",
      excerpt: `Replace this with a short summary of a story written about ${name}. Link it to the article and swap the image in src/config/media.ts.`,
      url: "#",
    },
    items: [
      { outlet: "Publication Name", date: "Month YYYY", title: `A headline mentioning ${name}`, url: "#", accent: "from-emerald-600 to-emerald-800" },
      { outlet: "Publication Name", date: "Month YYYY", title: "Another press headline", url: "#", accent: "from-amber-400 to-amber-600" },
    ],
  },

  /** Shown on the homepage until reviews are added in Admin → Homepage Images */
  testimonials: [
    { title: "Customer Name", subtitle: "The Banarasi silk was even richer in person. The zari work is exquisite and it arrived beautifully packed.", ctaLabel: "Your City", image: "" },
    { title: "Customer Name", subtitle: "Lightweight handloom cotton that is perfect for office wear. The colour matched the photos exactly.", ctaLabel: "Your City", image: "" },
    { title: "Customer Name", subtitle: "Bought a Kanjeevaram for my sister's wedding — everyone asked where it was from. Will shop again.", ctaLabel: "Your City", image: "" },
  ],

  newsletter: {
    title: `Join the ${name} Circle`,
    subtitle: "Be the first to see new weaves, festive edits and member-only offers.",
    successMessage: `You're in! Welcome to the ${name} circle ✨`,
  },

  shippingPageSubtitle: `From our looms to your wardrobe — every ${name} order is carefully folded, protected and delivered safely.`,

  /** Pre-filled WhatsApp messages */
  whatsapp: {
    general: `Hi ${name}! I'd like to know more about your sarees.`,
    returns: `Hi ${name}, I need help with a return/refund.`,
    videoBooking: `Hi ${name}! I just booked a video consultation:`,
  },
};
