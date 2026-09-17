import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/database.types";
import { HeroCarousel } from "@/components/HeroCarousel";
import { TrustMarquee } from "@/components/TrustMarquee";
import { SareeCategories } from "@/components/SareeCategories";
import { ShopByOccasion } from "@/components/ShopByOccasion";
import { HeritageStory } from "@/components/HeritageStory";
import { NewArrivals } from "@/components/NewArrivals";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { DynamicSection } from "@/components/DynamicSection";

import { Testimonials } from "@/components/Testimonials";
import { BlogSection } from "@/components/BlogSection";
import { FooterBanners } from "@/components/FooterBanners";
import { BestSelling, SellingFast } from "@/components/ProductRail";
import { StoreLocation } from "@/components/StoreLocation";
import { ReelsSection } from "@/components/ReelsSection";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { useImageGroup } from "@/hooks/useImageGroup";
import { resolveImage } from "@/lib/resolveImage";
import { content } from "@/config/content";

const newsletterSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email" }).max(255),
});

type Section = {
  id?: string; key: string; title: string; subtitle: string | null;
  sort_order: number; visible: boolean;
  type?: string; layout?: string; device?: string;
  image_url?: string | null; cta_label?: string | null; cta_url?: string | null;
  bg_color?: string | null; config?: any;
};

// Rendered as its own component so its hook (useImageGroup) is not called
// from inside Index's section-renderer loop. Calling it there changed the
// number of hooks Index ran whenever the DB section list differed from the
// fallback list, which crashed the whole homepage.
const SaleBanner = ({ s }: { s: Section }) => {
  const saleImages = useImageGroup("sale-banner", []);
  const bgImage = s.image_url ? resolveImage(s.image_url) : saleImages[0]?.image;
  const badgeLabel = (s.config?.badge_label as string) || "Festive Offer";
  const endsAt = s.config?.ends_at as string | undefined;
  let daysLeft = (s.config?.days_left as string) || "Limited time";
  if (endsAt) {
    const end = new Date(endsAt);
    end.setHours(23, 59, 59, 999);
    const diffMs = end.getTime() - Date.now();
    if (diffMs <= 0) {
      daysLeft = "Ends today";
    } else {
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      daysLeft = days === 1 ? "1 day left" : `${days} days left`;
    }
  }
  const eyebrow = (s.config?.eyebrow as string) || "Special Offer";
  return (
  <section className="container py-8 md:py-12">
    <div className="magic-shine relative overflow-hidden rounded-2xl md:rounded-3xl p-6 md:p-14 text-white shadow-[0_25px_70px_-20px_hsl(166_72%_18%/0.6),0_10px_40px_-10px_hsl(46_68%_47%/0.45)] ring-1 ring-sky/40">
      {/* optional admin-uploaded background image */}
      {bgImage && (
        <>
          <img src={bgImage} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = resolveImage(); }} className="absolute inset-0 w-full h-full object-cover -z-20" />
          <div className="absolute inset-0 bg-black/40 -z-10" />
        </>
      )}
      {/* animated magical gradient base (only when no custom image) */}
      {!bgImage && <div className="magic-gradient absolute inset-0 -z-10" />}
      {/* floating orbs */}
      <div className="pointer-events-none absolute -right-20 -bottom-24 w-72 h-72 md:w-96 md:h-96 rounded-full bg-white/25 blur-3xl animate-orb" />
      <div className="pointer-events-none absolute -left-16 -top-20 w-56 h-56 md:w-80 md:h-80 rounded-full bg-[hsl(46_68%_60%/0.35)] blur-3xl animate-orb" style={{ animationDelay: "1.5s" }} />

      {/* sparkles */}
      <span className="pointer-events-none absolute top-6 right-10 text-white text-lg animate-twinkle" style={{ animationDelay: "0s" }}>✦</span>
      <span className="pointer-events-none absolute top-14 right-1/3 text-white text-xs animate-twinkle" style={{ animationDelay: "0.7s" }}>✧</span>
      <span className="pointer-events-none absolute bottom-10 right-24 text-white text-base animate-twinkle" style={{ animationDelay: "1.4s" }}>✦</span>
      <span className="pointer-events-none absolute top-1/2 left-10 text-white text-sm animate-twinkle hidden md:block" style={{ animationDelay: "2s" }}>✧</span>
      <span className="pointer-events-none absolute bottom-6 left-1/3 text-white text-xs animate-twinkle" style={{ animationDelay: "1s" }}>✦</span>

      {/* Top badges */}
      <div className="relative flex items-start justify-between gap-3 mb-6 md:mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/25 backdrop-blur-md text-[11px] md:text-xs font-bold text-white ring-1 ring-white/30 shadow-sm">
          ✨ {badgeLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/25 backdrop-blur-md text-[11px] md:text-xs font-semibold text-white ring-1 ring-white/30 shadow-sm">
          <Clock className="w-3.5 h-3.5" /> {daysLeft}
        </span>
      </div>

      <p className="relative text-white/95 text-sm md:text-lg font-semibold tracking-wide uppercase drop-shadow">{eyebrow}</p>
      <h2 className="relative font-display text-3xl md:text-6xl font-extrabold leading-tight mt-1 bg-gradient-to-r from-white via-[hsl(46_80%_85%)] to-white bg-clip-text text-transparent drop-shadow-[0_2px_18px_hsl(0_0%_100%/0.35)]">
        {s.title || "The Festive Saree Sale"}
      </h2>
      {s.subtitle && (
        <p className="relative text-white/90 text-sm md:text-base mt-2 md:mt-3 max-w-md drop-shadow">{s.subtitle}</p>
      )}

      <div className="relative mt-6 md:mt-9">
        <Button asChild className="group rounded-full bg-white text-foreground hover:bg-white h-11 md:h-12 px-5 md:px-7 font-bold shadow-[0_10px_30px_-10px_hsl(0_0%_0%/0.4)] hover:shadow-[0_15px_40px_-10px_hsl(0_0%_0%/0.5)] hover:-translate-y-0.5 transition-all">
          <Link to={s.cta_url || "/shop"}>{s.cta_label || "Shop Now"} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></Link>
        </Button>
      </div>
    </div>
  </section>
  );
};

const Index = () => {
  const [email, setEmail] = useState("");

  const { data: sections = [] } = useQuery({
    queryKey: ["homepage-sections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("homepage_sections")
        .select("*")
        .eq("visible", true)
        .order("sort_order", { ascending: true });
      return (data as Section[]) ?? [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      // Prefer admin-curated featured products; fall back to newest active products
      // so the homepage never shows an empty "seed SQL" placeholder.
      const { data: featured } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .eq("is_featured", true)
        .order("rating", { ascending: false })
        .limit(8);
      if (featured && featured.length > 0) return featured as Product[];
      const { data: recent } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);
      return (recent as Product[]) ?? [];
    },
  });

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = newsletterSchema.safeParse({ email });
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    const { error } = await supabase.rpc("subscribe_newsletter", {
      p_email: result.data.email,
      p_source: "homepage",
    });
    if (error) {
      toast.error("Couldn't subscribe right now. Please try again.");
      return;
    }
    toast.success(content.newsletter.successMessage);
    setEmail("");
  };

  // Map of section key -> renderer. Anything not in here is silently skipped.
  const renderers: Record<string, (s: Section) => React.ReactNode> = {
    "hero": () => <HeroCarousel />,
    "trust-marquee": () => <TrustMarquee />,
    "saree-categories": () => <SareeCategories />,
    "reels": () => <ReelsSection />,
    "new-arrivals": () => <NewArrivals />,
    "shop-by-occasion": () => <ShopByOccasion />,
    "best-selling": () => <BestSelling />,
    "heritage-story": () => <HeritageStory />,
    "selling-fast": () => <SellingFast />,
    "recently-viewed": () => <RecentlyViewed />,
    "testimonials": () => <Testimonials />,
    "blog": () => <BlogSection />,
    "store-location": () => <StoreLocation />,
    "footer-banners": () => <FooterBanners />,
    "featured-products": (s) => (
      <section className="container py-12 md:py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold">{s.title}</h2>
            {s.subtitle && <p className="text-muted-foreground mt-2">{s.subtitle}</p>}
          </div>
          <Button asChild variant="pillOutline" className="hidden md:inline-flex">
            <Link to="/shop">View all <ArrowRight className="w-4 h-4" /></Link>
          </Button>
        </div>
        {products.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground rounded-2xl">
            New weaves are on the loom — check back shortly! ✨
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    ),
    "sale-banner": (s) => <SaleBanner s={s} />,
    "newsletter": (s) => (
      <section className="container py-12 md:py-16">
        <Card className="relative overflow-hidden rounded-3xl p-8 md:p-14 text-center bg-primary text-primary-foreground border-0 shadow-lift">
          <div aria-hidden className="absolute inset-3 md:inset-4 rounded-2xl border border-sky/50 pointer-events-none" />
          <Sparkles className="relative w-9 h-9 text-sky mx-auto mb-4" />
          <h2 className="relative font-display text-2xl md:text-4xl font-bold text-primary-foreground">{s.title}</h2>
          {s.subtitle && (
            <p className="relative text-primary-foreground/80 mt-2 max-w-md mx-auto">{s.subtitle}</p>
          )}
          <form onSubmit={handleNewsletter} className="relative mt-6 max-w-md mx-auto flex gap-2">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-full bg-background text-foreground h-12 px-5"
              maxLength={255}
            />
            <Button type="submit" size="lg" className="rounded-full h-12 bg-sky text-sky-foreground hover:bg-sky/90 font-bold">Subscribe</Button>
          </form>
        </Card>
      </section>
    ),
  };

  // Fallback list (used while sections are loading or if the table is empty),
  // so the homepage never renders blank.
  const fallback: Section[] = [
    { key: "hero", title: "Hero", subtitle: null, sort_order: 10, visible: true },
    { key: "trust-marquee", title: "Trust", subtitle: null, sort_order: 20, visible: true },
    { key: "saree-categories", title: "Shop by Weave", subtitle: null, sort_order: 30, visible: true },
    { key: "new-arrivals", title: "New Arrivals", subtitle: null, sort_order: 40, visible: true },
    { key: "shop-by-occasion", title: "Shop by Occasion", subtitle: null, sort_order: 50, visible: true },
    { key: "best-selling", title: "Best Selling", subtitle: null, sort_order: 60, visible: true },
    { key: "heritage-story", title: "Woven in Tripura", subtitle: null, sort_order: 70, visible: true },
    { key: "reels", title: "Reels", subtitle: null, sort_order: 80, visible: true },
    { key: "selling-fast", title: "Selling Fast", subtitle: null, sort_order: 90, visible: true },
    { key: "featured-products", title: "Curated For You", subtitle: "Hand-picked sarees our stylists love this season", sort_order: 100, visible: true },
    { key: "sale-banner", title: "The Festive Saree Sale — up to 30% off", subtitle: "Silks, handlooms and designer drapes at special prices for a limited time.", sort_order: 110, visible: true },
    { key: "recently-viewed", title: "Recent", subtitle: null, sort_order: 120, visible: true },
    { key: "testimonials", title: "Testimonials", subtitle: null, sort_order: 130, visible: true },
    { key: "blog", title: "Blog", subtitle: null, sort_order: 140, visible: false },
    { key: "store-location", title: "Visit Us", subtitle: null, sort_order: 150, visible: true },
    { key: "newsletter", title: content.newsletter.title, subtitle: content.newsletter.subtitle, sort_order: 160, visible: true },
    { key: "footer-banners", title: "Footer Banners", subtitle: null, sort_order: 170, visible: true },
  ];

  const list = (sections.length > 0 ? sections : fallback).filter(
    (s) => s.key !== "blog" && (s as any).visible !== false
  );

  const sectionIdentity = (s: Section) => s.id || s.key;
  const sectionDomId = (s: Section) => `home-section-${sectionIdentity(s)}`;
  const sectionReactKey = (s: Section) => `${s.key}-${s.id || s.sort_order}`;

  return (
    <Layout>
      {list.map((s) => {
        const r = renderers[s.key];
        // Fallback: any DB-defined section without a hardcoded renderer is
        // rendered fully dynamically from its banners / linked products / categories.
        if (!r) {
          if (!s.id) return null;
          return (
            <div
              key={sectionReactKey(s)}
              id={sectionDomId(s)}
              data-section-id={sectionIdentity(s)}
              data-section-key={s.key}
              data-section-title={s.title}
            >
              <DynamicSection section={s as any} />
            </div>
          );
        }
        return (
          <div
            key={sectionReactKey(s)}
            id={sectionDomId(s)}
            data-section-id={sectionIdentity(s)}
            data-section-key={s.key}
            data-section-title={s.title}
          >
            {r(s)}
          </div>
        );
      })}
      
    </Layout>
  );
};

export default Index;
