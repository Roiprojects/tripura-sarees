import { useEffect, useMemo, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "@/lib/resolveImage";
import {
  ChevronDown,
  ArrowUpRight,
  Sparkles,
  Crown,
  Gem,
  Flower2,
  Sun,
  Star,
  Heart,
  Briefcase,
  PartyPopper,
  Tag,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { SAREE_CATEGORIES, OCCASIONS } from "@/lib/sareeCatalog";

// Pick a small icon for each sub-category based on its name keywords.
const pickCategoryIcon = (name: string): LucideIcon => {
  const n = name.toLowerCase();
  if (n.includes("banarasi") || n.includes("kanjeevaram") || n.includes("kanjivaram")) return Crown;
  if (n.includes("silk") || n.includes("tussar") || n.includes("tissue")) return Gem;
  if (n.includes("handloom") || n.includes("cotton") || n.includes("linen") || n.includes("daily")) return Sun;
  if (n.includes("organza") || n.includes("georgette") || n.includes("chiffon")) return Flower2;
  if (n.includes("wedding") || n.includes("bridal")) return Heart;
  if (n.includes("party")) return PartyPopper;
  if (n.includes("festive") || n.includes("festival")) return Sparkles;
  if (n.includes("office")) return Briefcase;
  if (n.includes("sale")) return Tag;
  if (n.includes("blouse") || n.includes("set")) return Layers;
  return Star;
};

const FALLBACK_LINKS: { label: string; to: string }[] = [
  { label: "HOME", to: "/" },
  { label: "SILK SAREES", to: "/category/silk-sarees" },
  { label: "COTTON & HANDLOOM", to: "/category/handloom-sarees" },
  { label: "DESIGNER SAREES", to: "/category/designer-sarees" },
  { label: "SHOP BY OCCASION", to: "/shop-by-occasion" },
  { label: "NEW ARRIVALS", to: "/new" },
];

// Extra nav URLs whose dropdown comes from a root category's children.
// (Every "/category/<root-slug>" link gets this automatically.)
const URL_TO_ROOT_SLUG: Record<string, string> = {
  "/category/sale": "sale",
};

// Built-in dropdowns, used when the categories table has no children for a
// nav link (fresh install). Database subcategories always win.
const STATIC_DROPDOWNS: Record<string, { name: string; slug: string; to: string }[]> = {
  ...Object.fromEntries(
    SAREE_CATEGORIES.map((c) => [
      `/category/${c.slug}`,
      (c.children ?? []).map((k) => ({ name: k.name, slug: k.slug, to: `/category/${k.slug}` })),
    ]),
  ),
  "/shop-by-occasion": OCCASIONS.map((o) => ({ name: `${o.label} Sarees`, slug: o.slug, to: `/occasion/${o.slug}` })),
};

type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  image_url?: string | null;
};

export const CategoryNav = () => {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const qc = useQueryClient();

  // Realtime: mirror admin category banner/image edits instantly on the storefront.
  useEffect(() => {
    const channel = supabase
      .channel("public-category-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          qc.invalidateQueries({ queryKey: ["public-nav-categories"] });
          qc.invalidateQueries({ queryKey: ["categories"] });
          qc.invalidateQueries({ queryKey: ["categories-flat"] });
          qc.invalidateQueries({ queryKey: ["sba-categories"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);


  const { data: navRows = [] } = useQuery({
    queryKey: ["public-nav-links"],
    queryFn: async () => {
      const { data } = await supabase
        .from("nav_links" as any)
        .select("label,url,sort_order,visible")
        .eq("visible", true)
        .order("sort_order");
      return ((data ?? []) as unknown) as { label: string; url: string }[];
    },
    staleTime: 30_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["public-nav-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id,name,slug,parent_id,image_url")
        .order("name");
      return (data ?? []) as Category[];
    },
    staleTime: 60_000,
  });

  const childrenByRootSlug = useMemo(() => {
    const bySlug = new Map<string, Category>();
    categories.forEach((c) => bySlug.set(c.slug, c));
    const byParent = new Map<string, Category[]>();
    categories.forEach((c) => {
      if (c.parent_id) {
        const list = byParent.get(c.parent_id) ?? [];
        list.push(c);
        byParent.set(c.parent_id, list);
      }
    });
    const result = new Map<string, Category[]>();
    const urlToRoot: Record<string, string> = { ...URL_TO_ROOT_SLUG };
    // Every root category gets its own dropdown at /category/<slug>.
    categories.forEach((c) => { if (!c.parent_id) urlToRoot[`/category/${c.slug}`] = c.slug; });
    for (const [url, rootSlug] of Object.entries(urlToRoot)) {
      const root = bySlug.get(rootSlug);
      if (!root) continue;
      const children = byParent.get(root.id) ?? [];
      if (children.length) result.set(url, children);
    }
    return result;
  }, [categories]);

  const links = useMemo(() => {
    const normalize = (r: { label: string; url: string }) => ({ label: r.label, to: r.url });
    const source = navRows.length
      ? navRows.map(normalize)
      : FALLBACK_LINKS;
    const seen = new Set<string>();
    return source.filter((link) => {
      const key = link.to.trim().toLowerCase() || link.label.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [navRows]);

  return (
    <div className="bg-transparent border-b border-border relative">
      <div className="container">
        <nav className="hidden md:flex items-center justify-center gap-7 lg:gap-9 py-3 overflow-visible">
          {links.map((l) => {
            const catKids = childrenByRootSlug.get(l.to);
            const subLinks = catKids ?? STATIC_DROPDOWNS[l.to];
            const hasDropdown = !!subLinks?.length;
            const isOpen = openLabel === l.label;
            return (
              <div
                key={`${l.label}-${l.to}`}
                className="relative"
                onMouseEnter={() => hasDropdown && setOpenLabel(l.label)}
                onMouseLeave={() => hasDropdown && setOpenLabel((cur) => (cur === l.label ? null : cur))}
              >
                <NavLink
                  to={l.to}
                  end={l.to === "/"}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1 text-xs lg:text-sm font-bold tracking-wide whitespace-nowrap transition-colors hover:text-primary ${
                      isActive ? "text-primary" : "text-foreground"
                    }`
                  }
                >
                  {l.label}
                  {hasDropdown && <ChevronDown className="w-3 h-3 opacity-70" />}
                </NavLink>


                {hasDropdown && isOpen && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50 animate-in fade-in-0 slide-in-from-top-1 duration-150">
                    <div
                      className="relative min-w-[300px] rounded-2xl border border-border/60 bg-popover/95 backdrop-blur-xl text-popover-foreground shadow-2xl overflow-hidden"
                      style={{
                        boxShadow:
                          "0 20px 50px -12px hsl(var(--primary) / 0.18), 0 8px 20px -8px hsl(var(--foreground) / 0.12)",
                      }}
                    >
                      {/* gradient accent strip */}
                      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary/0 via-primary to-primary/0" />

                      {/* header */}
                      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                          {l.label}
                        </span>
                        <Link
                          to={l.to}
                          onClick={() => setOpenLabel(null)}
                          className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary hover:underline"
                        >
                          View all <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>

                      <div className="h-px bg-border/60 mx-3" />

                      {/* items */}
                      <div className="p-2 grid gap-0.5">
                        {subLinks!.map((c: any) => {
                          const Icon = pickCategoryIcon(c.name);
                          const linkTo = c.to ? c.to : `/category/${c.slug}`;
                          return (
                            <Link
                              key={c.id ?? c.to ?? c.slug}
                              to={linkTo}
                              onClick={() => setOpenLabel(null)}
                              className="group/item relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/90 hover:bg-accent hover:text-accent-foreground transition-all"
                            >
                              <span className="flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden bg-primary/8 text-primary group-hover/item:bg-primary group-hover/item:text-primary-foreground transition-colors">
                                {c.image_url ? (
                                  <img
                                    src={resolveImage(c.image_url)}
                                    alt={c.name}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                  />
                                ) : (
                                  <Icon className="w-4 h-4" strokeWidth={2.2} />
                                )}
                              </span>
                              <span className="flex-1 truncate">{c.name}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all text-primary" />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
