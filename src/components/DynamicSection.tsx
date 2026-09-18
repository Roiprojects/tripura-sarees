import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Product } from "@/lib/database.types";
import { resolveImage } from "@/lib/resolveImage";

type Section = {
  id: string; key: string; title: string; subtitle: string | null;
  type: string; layout: string; device: string;
  image_url: string | null; cta_label: string | null; cta_url: string | null;
  bg_color: string | null; config: any;
};
type Banner = {
  id: string; title: string | null; subtitle: string | null;
  image_desktop: string | null; image_mobile: string | null;
  cta_label: string | null; cta_url: string | null;
};

/**
 * Renders any DB-defined homepage section: pulls its banners, manually-linked
 * products, and linked categories, then picks a layout based on `section.type`.
 */
export const DynamicSection = ({ section }: { section: Section }) => {
  const isMobile = useIsMobile();
  // The device check lives in this wrapper so the content component's hooks
  // always run in the same order. useIsMobile() flips from false to true after
  // the first render on phones; returning early before the queries changed the
  // hook count between renders and crashed the homepage.
  if (section.device === "desktop" && isMobile) return null;
  if (section.device === "mobile" && !isMobile) return null;
  return <DynamicSectionContent section={section} isMobile={isMobile} />;
};

const DynamicSectionContent = ({ section, isMobile }: { section: Section; isMobile: boolean }) => {
  const { data: banners = [] } = useQuery({
    queryKey: ["public-banners", section.id],
    queryFn: async () => {
      const { data } = await supabase.from("homepage_banners").select("*")
        .eq("section_id", section.id).eq("visible", true).order("sort_order");
      return (data ?? []) as Banner[];
    },
  });

  const { data: linkedProducts = [] } = useQuery({
    queryKey: ["public-section-products", section.id],
    queryFn: async () => {
      const { data } = await supabase.from("section_products")
        .select("sort_order, product:products(*)")
        .eq("section_id", section.id).order("sort_order");
      return ((data ?? []).map((r: any) => r.product).filter(Boolean)) as Product[];
    },
  });

  const { data: linkedCats = [] } = useQuery({
    queryKey: ["public-section-cats", section.id],
    queryFn: async () => {
      const { data } = await supabase.from("section_categories")
        .select("category:categories(id,name,slug,image_url)")
        .eq("section_id", section.id);
      return ((data ?? []).map((r: any) => r.category).filter(Boolean)) as any[];
    },
  });

  // If manual product links are empty, fall back to category-based fill.
  const { data: catFill = [] } = useQuery({
    queryKey: ["public-section-catfill", section.id, linkedCats.map((c: any) => c.id).join(",")],
    queryFn: async () => {
      if (linkedProducts.length > 0 || linkedCats.length === 0) return [];
      const { data } = await supabase.from("products").select("*")
        .eq("status", "active")
        .in("category_id", linkedCats.map((c: any) => c.id))
        .order("created_at", { ascending: false }).limit(12);
      return (data ?? []) as Product[];
    },
    enabled: linkedProducts.length === 0 && linkedCats.length > 0,
  });

  const products = linkedProducts.length > 0 ? linkedProducts : catFill;

  const style = section.bg_color ? { background: section.bg_color } : undefined;
  const cta = section.cta_url ? (
    <Button asChild variant="pillOutline" className="hidden md:inline-flex">
      <Link to={section.cta_url}>{section.cta_label || "View all"} <ArrowRight className="w-4 h-4" /></Link>
    </Button>
  ) : null;

  // ─── Banner / hero strip ────────────────────────────────────────────────
  if (section.type === "banner" || section.layout === "banner") {
    if (banners.length === 0 && !section.image_url) return null;
    return (
      <section className="container py-6 md:py-10" style={style}>
        <div className="grid gap-4 md:grid-cols-2">
          {(banners.length ? banners : [{
            id: section.id, title: section.title, subtitle: section.subtitle,
            image_desktop: section.image_url, image_mobile: section.image_url,
            cta_label: section.cta_label, cta_url: section.cta_url,
          } as Banner]).map((b) => {
            const img = resolveImage((isMobile && b.image_mobile) ? b.image_mobile : b.image_desktop);
            const inner = (
              <div className="relative rounded-3xl overflow-hidden aspect-[16/7] md:aspect-[21/9] bg-muted shadow-card">
                <img src={img} alt={b.title ?? ""} loading="lazy" decoding="async" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }} className="absolute inset-0 w-full h-full object-cover" />
                {(b.title || b.subtitle) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent flex flex-col justify-center p-6 md:p-10 text-white">
                    {b.title && <h3 className="font-display text-2xl md:text-4xl font-bold drop-shadow">{b.title}</h3>}
                    {b.subtitle && <p className="mt-1 max-w-md drop-shadow">{b.subtitle}</p>}
                    {b.cta_label && <span className="mt-3 inline-block self-start px-4 py-2 rounded-full bg-white text-foreground text-sm font-semibold">{b.cta_label}</span>}
                  </div>
                )}
              </div>
            );
            return b.cta_url ? <Link key={b.id} to={b.cta_url}>{inner}</Link> : <div key={b.id}>{inner}</div>;
          })}
        </div>
      </section>
    );
  }

  // ─── Category grid ──────────────────────────────────────────────────────
  if (section.type === "categories" && linkedCats.length > 0) {
    return (
      <section className="container py-10" style={style}>
        <Header title={section.title} subtitle={section.subtitle} cta={cta} />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {linkedCats.map((c: any) => (
            <Link key={c.id} to={`/category/${c.slug}`} className="group">
              <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
                {c.image_url && <img src={resolveImage(c.image_url)} alt={c.name} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }} className="w-full h-full object-cover" />}
              </div>
              <div className="text-center mt-2 text-sm font-semibold">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  // ─── Product grid / carousel (default) ─────────────────────────────────
  if (products.length === 0) return null;
  return (
    <section className="container py-10 md:py-14" style={style}>
      <Header title={section.title} subtitle={section.subtitle} cta={cta} />
      <div className={section.layout === "carousel"
        ? "flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 lg:grid-cols-4"
        : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"}>
        {products.map((p) => (
          <div key={p.id} className="snap-start shrink-0 w-[70%] md:w-auto">
            <ProductCard product={p as any} />
          </div>
        ))}
      </div>
    </section>
  );
};

const Header = ({ title, subtitle, cta }: { title: string; subtitle: string | null; cta: React.ReactNode }) => (
  <div className="flex items-end justify-between mb-6 gap-3">
    <div>
      <h2 className="font-display text-2xl md:text-4xl font-bold">{title}</h2>
      {subtitle && <p className="text-muted-foreground mt-1.5">{subtitle}</p>}
    </div>
    {cta}
  </div>
);
