import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SAREE_CATEGORIES, categoryImage } from "@/lib/sareeCatalog";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
  description: string | null;
  sort_order: number;
  visible: boolean;
};

type Tile = { slug: string; name: string; description: string; image: string };
type Group = { slug: string; name: string; tiles: Tile[] };

/** "Shop by Weave" — saree categories grouped by their parent category. */
export const SareeCategories = () => {
  const { data: rows = [] } = useQuery({
    queryKey: ["home-saree-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id,name,slug,parent_id,image_url,description,sort_order,visible")
        .order("sort_order");
      return ((data ?? []) as Row[]).filter((r) => r.visible !== false);
    },
    staleTime: 60_000,
  });

  const groups = useMemo<Group[]>(() => {
    const roots = rows.filter((r) => !r.parent_id);
    const fromDb = roots
      .map((root) => ({
        slug: root.slug,
        name: root.name,
        tiles: rows
          .filter((r) => r.parent_id === root.id)
          .map((r) => ({
            slug: r.slug,
            name: r.name,
            description: r.description ?? "",
            image: categoryImage(r.slug, r.image_url),
          })),
      }))
      .filter((g) => g.tiles.length > 0);
    if (fromDb.length > 0) return fromDb;
    return SAREE_CATEGORIES.map((c) => ({
      slug: c.slug,
      name: c.name,
      tiles: (c.children ?? []).map((k) => ({ slug: k.slug, name: k.name, description: k.description, image: k.image })),
    }));
  }, [rows]);

  const [active, setActive] = useState<string>("all");
  const tiles = active === "all"
    ? groups.flatMap((g) => g.tiles)
    : groups.find((g) => g.slug === active)?.tiles ?? [];

  return (
    <section className="container py-12 md:py-20">
      <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="h-px w-8 bg-sky" />
          <span className="text-[11px] md:text-xs font-bold tracking-[0.3em] uppercase gold-text-gradient">Shop by Weave</span>
          <span className="h-px w-8 bg-sky" />
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-bold mt-1 text-foreground">
          Six Yards of <span className="italic font-serif font-normal text-primary">Living Heritage</span>
        </h2>
        <p className="text-muted-foreground mt-3 text-sm md:text-base leading-relaxed">
          From the regal silk looms of Banaras and Kanchipuram to the handcrafted drapes of Tripura — choose the weave that crowns your celebration.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2.5 mb-10" role="tablist" aria-label="Saree categories">
        {[{ slug: "all", name: "All Weaves" }, ...groups].map((g) => (
          <button
            key={g.slug}
            type="button"
            role="tab"
            aria-selected={active === g.slug}
            onClick={() => setActive(g.slug)}
            className={cn(
              "px-5 py-2.5 rounded-full text-xs md:text-sm font-bold tracking-wide transition-all duration-300",
              active === g.slug
                ? "bg-primary text-primary-foreground shadow-[0_4px_16px_hsl(var(--primary)/0.35)] ring-2 ring-sky/70 scale-105"
                : "bg-card border border-border/80 hover:border-sky/80 text-foreground/85 hover:bg-muted/60",
            )}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-7">
        {tiles.map((t) => (
          <Link
            key={t.slug}
            to={`/category/${t.slug}`}
            className="group relative overflow-hidden rounded-2xl md:rounded-3xl aspect-[3/4] bg-muted shadow-card hover:shadow-2xl transition-all duration-500 border border-sky/30 hover:border-sky hover:-translate-y-1.5"
          >
            <img
              src={t.image}
              alt={t.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/95 via-emerald-950/40 to-black/20 group-hover:from-emerald-950/90 transition-colors" />
            <div className="absolute inset-2.5 md:inset-3.5 rounded-xl md:rounded-2xl border border-sky/50 pointer-events-none group-hover:border-sky/90 transition-colors" />
            <div className="absolute inset-x-0 bottom-0 p-5 md:p-7 text-white">
              <span className="silk-badge text-[9px] px-2 py-0.5 mb-2 bg-black/50 text-amber-200 border-amber-300/50">
                Master Craft
              </span>
              <h3 className="font-display text-lg md:text-2xl font-bold leading-tight drop-shadow-sm">{t.name}</h3>
              {t.description && (
                <p className="hidden sm:block text-xs md:text-sm text-white/85 mt-1.5 line-clamp-2 leading-relaxed">{t.description}</p>
              )}
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs md:text-sm font-bold text-sky group-hover:text-amber-300 transition-colors">
                Explore Collection <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
