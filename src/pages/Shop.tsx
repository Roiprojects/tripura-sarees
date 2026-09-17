import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { WalletBanner } from "@/components/WalletBanner";
import { ProductCard } from "@/components/ProductCard";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Product, Category } from "@/lib/database.types";
import { colorKey, getColorCss } from "@/lib/colorUtils";
import { useShopFilterVisibility } from "@/hooks/useShopFilterVisibility";
import { sortSizes } from "@/lib/sizeUtils";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { usePersistedState } from "@/hooks/usePersistedState";
import { OCCASIONS, SAREE_CATEGORIES } from "@/lib/sareeCatalog";

// Occasion labels in display order (products.collection values).
const DEFAULT_OCCASIONS = OCCASIONS.map((o) => o.label.toLowerCase());
const DEFAULT_COLORS = ["Red", "Maroon", "Green", "Blue", "Yellow", "Pink", "Purple", "Black", "White", "Gold"];

type Sort = "popular" | "newest" | "price-asc" | "price-desc";
// Upper price bound meaning "no limit". The slider cap is derived from real
// product prices so pricier silks are never hidden by a hard-coded cap.
const NO_PRICE_LIMIT = Number.MAX_SAFE_INTEGER;
type ProductX = Omit<Product, "category"> & {
  collection?: string | null;
  compare_at_price?: number | null;
  section_keys?: string[] | null;
  is_featured?: boolean | null;
  category?: Category | null;
};
type CatNode = { slug: string; name: string; children: CatNode[] };

type FilterState = {
  cats: string[]; sizes: string[]; colors: string[]; collections: string[];
  price: [number, number]; availability: string[];
};

const AVAILABILITY_OPTIONS = [
  { value: "ready", label: "Ready to ship" },
  { value: "preorder", label: "Pre-order" },
];

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const Shop = () => {
  const [params, setParams] = useSearchParams();
  const urlCategory = params.get("category");
  const urlCollection = params.get("collection") ?? params.get("occasion");
  const urlSort = params.get("sort");
  const urlFeatured = params.get("featured");
  const urlQuery = params.get("q") ?? "";

  const lc = (s: string | null) => (s ? s.toLowerCase() : null);

  // Non-URL filters (sizes, colors, price, availability) are persisted in
  // sessionStorage so returning from a product page restores them.
  const [selectedCats, setSelectedCats] = useState<string[]>(lc(urlCategory) ? [lc(urlCategory)!] : []);
  const [selectedSizes, setSelectedSizes] = usePersistedState<string[]>("filters:shop:sizes", []);
  const [selectedColors, setSelectedColors] = usePersistedState<string[]>("filters:shop:colors", []);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(lc(urlCollection) ? [lc(urlCollection)!.replace(/-/g, " ")] : []);
  const [priceRange, setPriceRange] = usePersistedState<[number, number]>("filters:shop:price:v2", [0, NO_PRICE_LIMIT]);
  const [selectedAvailability, setSelectedAvailability] = usePersistedState<string[]>("filters:shop:availability", []);
  const [sort, setSort] = useState<Sort>(
    urlSort === "new" || urlSort === "newest" ? "newest"
      : urlSort === "price-asc" ? "price-asc"
      : urlSort === "price-desc" ? "price-desc"
      : "popular",
  );

  // Re-sync state ONLY when URL params change externally (nav clicks), not
  // when the user toggles filters: compare against the last URL we wrote.
  const lastWrittenUrlRef = (window as any).__shopUrlRef ||= { current: "" };
  useEffect(() => {
    const key = `${urlCategory}|${urlCollection}|${urlSort}`;
    if (lastWrittenUrlRef.current === key) return;
    setSelectedCats(lc(urlCategory) ? [lc(urlCategory)!] : []);
    setSelectedCollections(lc(urlCollection) ? [lc(urlCollection)!.replace(/-/g, " ")] : []);
    if (urlSort === "new" || urlSort === "newest") setSort("newest");
    else if (urlSort === "price-asc") setSort("price-asc");
    else if (urlSort === "price-desc") setSort("price-desc");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCategory, urlCollection, urlSort]);

  // Sync state -> URL so filters persist on reload and update the address bar.
  useEffect(() => {
    const next = new URLSearchParams(params);
    const preserve = ["q", "featured"];
    Array.from(next.keys()).forEach((k) => { if (!preserve.includes(k)) next.delete(k); });
    if (selectedCats.length === 1) next.set("category", selectedCats[0]);
    if (selectedCollections.length === 1) next.set("collection", selectedCollections[0]);
    if (sort !== "popular") next.set("sort", sort);
    lastWrittenUrlRef.current = `${next.get("category")}|${next.get("collection")}|${next.get("sort")}`;
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCats, selectedCollections, sort]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      return (data as Category[]) ?? [];
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, category:categories(*)")
        .eq("status", "active")
        .limit(1000);
      return (data as ProductX[]) ?? [];
    },
  });

  const { data: colorVariants = [] } = useQuery({
    queryKey: ["shop-color-variants"],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_color_variants")
        .select("color_name, hex_code");
      return (data ?? []) as { color_name: string; hex_code: string | null }[];
    },
  });

  const { map: filterVisible } = useShopFilterVisibility();
  const adminSizes = useFilterOptions("size");

  const priceCap = useMemo(() => {
    const highest = products.reduce((m, p) => Math.max(m, Number(p.price) || 0), 0);
    return Math.max(5000, Math.ceil(highest / 1000) * 1000);
  }, [products]);

  // Weave tree: root categories with their subcategories (DB first, built-in fallback).
  const categoryTree = useMemo<CatNode[]>(() => {
    const visible = categories.filter((c: any) => c.visible !== false);
    if (visible.length === 0) {
      return SAREE_CATEGORIES.map((c) => ({
        slug: c.slug, name: c.name,
        children: (c.children ?? []).map((k) => ({ slug: k.slug, name: k.name, children: [] })),
      }));
    }
    const build = (parentId: string | null): CatNode[] =>
      visible
        .filter((c) => (c.parent_id ?? null) === parentId)
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
        .map((c) => ({ slug: c.slug, name: c.name, children: build(c.id) }));
    return build(null);
  }, [categories]);

  const categoryNameBySlug = useMemo(() => {
    const m = new Map<string, string>();
    const walk = (nodes: CatNode[]) => nodes.forEach((n) => { m.set(n.slug, n.name); walk(n.children); });
    walk(categoryTree);
    return m;
  }, [categoryTree]);

  // Selected category slugs → allowed category ids (each slug + its descendants).
  const allowedCategoryIds = useMemo(() => {
    if (selectedCats.length === 0) return null;
    const ids = new Set<string>();
    selectedCats.forEach((slug) => {
      const root = categories.find((c) => c.slug === slug);
      if (root) ids.add(root.id);
    });
    let added = true;
    while (added) {
      added = false;
      categories.forEach((c) => {
        if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
          ids.add(c.id);
          added = true;
        }
      });
    }
    return ids;
  }, [selectedCats, categories]);

  // A size filter only helps when products come in more than "Free Size".
  const dynamicSizes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => (p.sizes ?? []).forEach((s) => s && set.add(String(s))));
    const list = adminSizes.length > 0 ? adminSizes : Array.from(set);
    return list.some((s) => !/free/i.test(s)) ? sortSizes(list) : [];
  }, [products, adminSizes]);

  const dynamicCollections = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => { if (p.collection) set.add(String(p.collection).toLowerCase().trim()); });
    if (set.size === 0) return DEFAULT_OCCASIONS;
    const ordered = DEFAULT_OCCASIONS.filter((c) => set.has(c));
    const extras = Array.from(set).filter((c) => !DEFAULT_OCCASIONS.includes(c)).sort();
    return [...ordered, ...extras];
  }, [products]);

  const dynamicColors = useMemo(() => {
    const exactHex = new Map(
      colorVariants
        .filter((c) => c.color_name && c.hex_code)
        .map((c) => [colorKey(c.color_name), c.hex_code as string]),
    );
    const set = new Set<string>();
    products.forEach((p) => (p.colors ?? []).forEach((c) => c && set.add(String(c))));
    const names = set.size === 0 ? DEFAULT_COLORS : Array.from(set).sort((a, b) => a.localeCompare(b));
    return names.map((name) => ({ name, hex: getColorCss(name, exactHex.get(colorKey(name))) }));
  }, [products, colorVariants]);

  const filtered = useMemo(() => {
    const q = urlQuery.trim().toLowerCase();
    const norm = (s: string | null | undefined) => (s ?? "").toString().toLowerCase().trim();
    const collectionsLc = selectedCollections.map(norm);
    const colorsLc = selectedColors.map(norm);
    let result = products.filter((p) => {
      const collection = norm(p.collection);
      const sizes = Array.isArray(p.sizes) ? p.sizes : [];
      const colors = Array.isArray(p.colors) ? p.colors.map(norm) : [];
      if (allowedCategoryIds) {
        const extras: string[] = Array.isArray((p as any).extra_category_ids) ? (p as any).extra_category_ids : [];
        if (!allowedCategoryIds.has(p.category_id) && !extras.some((id) => allowedCategoryIds.has(id))) return false;
      }
      if (collectionsLc.length > 0 && !collectionsLc.some((c) => collection === c || collection.includes(c))) return false;
      if (selectedSizes.length > 0 && !sizes.some((s) => selectedSizes.includes(s))) return false;
      if (colorsLc.length > 0 && !colors.some((c) => colorsLc.includes(c))) return false;
      const priceNum = Number(p.price) || 0;
      // An upper handle at the slider's max means "no upper limit".
      if (priceNum < Number(priceRange[0]) || (priceRange[1] < priceCap && priceNum > Number(priceRange[1]))) return false;
      if (selectedAvailability.length > 0) {
        const inStock = ((p as any).stock ?? (p as any).stock_quantity ?? 0) > 0;
        const wantsReady = selectedAvailability.includes("ready");
        const wantsPre = selectedAvailability.includes("preorder");
        if (wantsReady && !wantsPre && !inStock) return false;
        if (wantsPre && !wantsReady && inStock) return false;
      }
      if (urlFeatured === "true" && !p.is_featured && (p.rating ?? 0) < 4.5) return false;
      if (q) {
        const haystack = [
          p.name,
          p.description ?? "",
          p.collection ?? "",
          (p as any).sku ?? "",
          (p as any).sku_id ?? "",
          (p as any).design_number ?? "",
          (p as any).brand ?? "",
          ((p as any).tags ?? []).join(" "),
          p.category?.name ?? "",
          p.category?.slug ?? "",
        ].join(" ").toLowerCase();
        const tokens = q.split(/\s+/).filter(Boolean);
        if (!tokens.every((t) => haystack.includes(t))) return false;
      }
      return true;
    });
    switch (sort) {
      case "price-asc": result = [...result].sort((a, b) => a.price - b.price); break;
      case "price-desc": result = [...result].sort((a, b) => b.price - a.price); break;
      case "newest":
        result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      default: result = [...result].sort((a, b) => b.rating - a.rating);
    }
    return result;
  }, [products, selectedCollections, selectedSizes, selectedColors, priceRange, sort, urlFeatured, urlQuery, allowedCategoryIds, selectedAvailability, priceCap]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const clearAll = () => {
    setSelectedCats([]); setSelectedSizes([]); setSelectedColors([]); setSelectedCollections([]);
    setPriceRange([0, NO_PRICE_LIMIT]); setSelectedAvailability([]);
    setParams({});
  };

  const activeChips = [
    ...selectedCats.map((v) => ({ label: categoryNameBySlug.get(v) ?? titleCase(v.replace(/-/g, " ")), clear: () => toggle(selectedCats, setSelectedCats, v) })),
    ...selectedCollections.map((v) => ({ label: titleCase(v), clear: () => toggle(selectedCollections, setSelectedCollections, v) })),
    ...selectedColors.map((v) => ({ label: v, clear: () => toggle(selectedColors, setSelectedColors, v) })),
    ...selectedSizes.map((v) => ({ label: `Size ${v}`, clear: () => toggle(selectedSizes, setSelectedSizes, v) })),
    ...selectedAvailability.map((v) => ({ label: AVAILABILITY_OPTIONS.find((o) => o.value === v)?.label ?? v, clear: () => toggle(selectedAvailability, setSelectedAvailability, v) })),
  ];

  // Rendered as a plain function (not a nested component) so the accordion
  // keeps its open/closed state between renders.
  const renderFilterSections = (state?: FilterState, onChange?: (patch: Partial<FilterState>) => void) => {
    // Use draft state if provided (mobile), else live state (desktop).
    const s: FilterState = state ?? {
      cats: selectedCats, sizes: selectedSizes, colors: selectedColors,
      collections: selectedCollections, price: priceRange, availability: selectedAvailability,
    };
    const update = (patch: Partial<FilterState>) => {
      if (onChange) return onChange(patch);
      if (patch.cats !== undefined) setSelectedCats(patch.cats);
      if (patch.sizes !== undefined) setSelectedSizes(patch.sizes);
      if (patch.colors !== undefined) setSelectedColors(patch.colors);
      if (patch.collections !== undefined) setSelectedCollections(patch.collections);
      if (patch.price !== undefined) setPriceRange(patch.price);
      if (patch.availability !== undefined) setSelectedAvailability(patch.availability);
    };
    const tog = (key: keyof FilterState, val: string) => {
      const arr = s[key] as string[];
      update({ [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val] } as Partial<FilterState>);
    };

    let n = 0;
    const sectionLabel = (label: string, extra?: React.ReactNode) => {
      n += 1;
      return (
        <span className="font-display font-bold text-sm text-primary">
          {n}. {label}{extra}
        </span>
      );
    };
    const checkRow = (key: string, on: boolean, onToggle: () => void, label: React.ReactNode, className = "") => (
      <label key={key} className={`flex items-center gap-2 cursor-pointer text-sm rounded-md px-2 py-1.5 transition-colors ${on ? "bg-primary/10 font-semibold text-foreground" : "hover:bg-muted/60"} ${className}`}>
        <Checkbox checked={on} onCheckedChange={onToggle} />
        {label}
      </label>
    );

    const showSize = filterVisible.size && dynamicSizes.length > 0;
    const defaultOpen = ["category", "price", "occasion", "color", "size", "availability"]
      .filter((k) => (filterVisible as Record<string, boolean>)[k]);

    return (
      <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
        {filterVisible.category && categoryTree.length > 0 && (
          <AccordionItem value="category" className="border-border/60">
            <AccordionTrigger className="hover:no-underline">{sectionLabel("Weave")}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1 pt-1">
                {categoryTree.map((root) => (
                  <div key={root.slug}>
                    {checkRow(root.slug, s.cats.includes(root.slug), () => tog("cats", root.slug), root.name)}
                    {root.children.length > 0 && (
                      <div className="pl-5 space-y-0.5">
                        {root.children.map((c) =>
                          checkRow(c.slug, s.cats.includes(c.slug), () => tog("cats", c.slug), c.name, "text-muted-foreground"),
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {filterVisible.price && (
          <AccordionItem value="price" className="border-border/60">
            <AccordionTrigger className="hover:no-underline">
              {sectionLabel("Price", (
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  (₹{Math.min(s.price[0], priceCap)} – ₹{Math.min(s.price[1], priceCap)}{s.price[1] >= priceCap ? "+" : ""})
                </span>
              ))}
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-3 px-1">
                <Slider min={0} max={priceCap} step={250} value={[Math.min(s.price[0], priceCap), Math.min(s.price[1], priceCap)]}
                  onValueChange={(v) => update({ price: [v[0], v[1]] as [number, number] })} />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {filterVisible.occasion && (
          <AccordionItem value="occasion" className="border-border/60">
            <AccordionTrigger className="hover:no-underline">{sectionLabel("Occasion")}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1 pt-1">
                {dynamicCollections.map((c) => checkRow(c, s.collections.includes(c), () => tog("collections", c), c, "capitalize"))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {filterVisible.color && (
          <AccordionItem value="color" className="border-border/60">
            <AccordionTrigger className="hover:no-underline">{sectionLabel("Colour")}</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2 pt-1">
                {dynamicColors.map((c) => (
                  <button key={c.name} type="button" onClick={() => tog("colors", c.name)} aria-label={c.name}
                    title={c.name} aria-pressed={s.colors.includes(c.name)}
                    className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${
                      s.colors.includes(c.name) ? "border-primary scale-110" : "border-border"
                    }`} style={{ background: c.hex }} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {showSize && (
          <AccordionItem value="size" className="border-border/60">
            <AccordionTrigger className="hover:no-underline">{sectionLabel("Blouse Size")}</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2 pt-1">
                {dynamicSizes.map((sz) => (
                  <button key={sz} type="button" onClick={() => tog("sizes", sz)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                      s.sizes.includes(sz) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary"
                    }`}>{sz}</button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {filterVisible.availability && (
          <AccordionItem value="availability" className="border-border/60">
            <AccordionTrigger className="hover:no-underline">{sectionLabel("Availability")}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1 pt-1">
                {AVAILABILITY_OPTIONS.map((opt) =>
                  checkRow(opt.value, s.availability.includes(opt.value), () => tog("availability", opt.value), opt.label),
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    );
  };

  // Mobile drawer: stage filter changes locally, apply on click.
  const [mobileOpen, setMobileOpen] = useState(false);
  const [draft, setDraft] = useState<FilterState | null>(null);
  const openMobile = () => {
    setDraft({
      cats: selectedCats, sizes: selectedSizes, colors: selectedColors,
      collections: selectedCollections, price: priceRange, availability: selectedAvailability,
    });
    setMobileOpen(true);
  };
  const applyDraft = () => {
    if (!draft) return;
    setSelectedCats(draft.cats); setSelectedSizes(draft.sizes); setSelectedColors(draft.colors);
    setSelectedCollections(draft.collections); setPriceRange(draft.price); setSelectedAvailability(draft.availability);
    setMobileOpen(false);
  };
  const clearDraft = () => setDraft({ cats: [], sizes: [], colors: [], collections: [], price: [0, NO_PRICE_LIMIT], availability: [] });

  return (
    <Layout>
      <div className="relative">
        {/* Page background */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(40_60%_97%)_0%,hsl(45_55%_94%)_55%,hsl(40_60%_96%)_100%)]" />
          <div className="absolute inset-0 opacity-[0.35] [background-image:radial-gradient(hsl(46_68%_47%/0.22)_1px,transparent_1px)] [background-size:22px_22px]" />
        </div>

        {/* Hero banner */}
        <section className="container pt-6 md:pt-8">
          <div className="relative overflow-hidden rounded-3xl md:rounded-[2rem] bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 shadow-[0_30px_80px_-30px_hsl(166_72%_15%/0.6)]">
            <div aria-hidden className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(hsl(var(--sky))_1.2px,transparent_1.2px)] [background-size:24px_24px]" />
            <div aria-hidden className="absolute inset-3 md:inset-4 rounded-2xl md:rounded-[1.6rem] border border-sky/50 pointer-events-none" />
            <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-28 w-80 h-80 md:w-[28rem] md:h-[28rem] rounded-full bg-sky/20 blur-3xl" />

            <div className="relative px-7 py-12 md:px-14 md:py-20 lg:py-24 text-white">
              <span className="text-[11px] md:text-xs font-bold uppercase tracking-[0.3em] text-sky-300">
                All Sarees
              </span>
              <h1 className="mt-3 font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] text-white">
                The Saree Collection
              </h1>
              <p className="mt-4 max-w-xl text-sm md:text-base text-white/85">
                Handwoven silks, breezy cottons and statement designer drapes — every saree hand-picked from India's finest weaving traditions.
              </p>
              <div className="mt-6 md:mt-8 flex flex-wrap gap-2 md:gap-3">
                {[
                  { label: "Silk Sarees", to: "/category/silk-sarees" },
                  { label: "Cotton & Handloom", to: "/category/handloom-sarees" },
                  { label: "Designer", to: "/category/designer-sarees" },
                  { label: "Wedding", to: "/occasion/wedding" },
                  { label: "Festive", to: "/occasion/festive" },
                  { label: "Office Wear", to: "/occasion/office-wear" },
                ].map((t) => (
                  <Link
                    key={t.label}
                    to={t.to}
                    className="px-3.5 py-1.5 rounded-full bg-white/10 text-xs md:text-sm font-semibold ring-1 ring-sky/50 hover:bg-sky hover:text-sky-foreground transition-colors"
                  >
                    {t.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container py-8 md:py-12">
          <WalletBanner />
          <div className="grid lg:grid-cols-[280px_1fr] gap-6 lg:gap-8">
            <aside className="hidden lg:block">
              <Card className="rounded-2xl shadow-card border-border/60 sticky top-24 max-h-[calc(100vh-7rem)] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
                  <h2 className="font-display font-bold text-base">Filters</h2>
                  {activeChips.length > 0 && (
                    <button onClick={clearAll} className="text-xs text-primary font-semibold hover:underline">CLEAR ALL</button>
                  )}
                </div>
                <div className="px-5 py-2 overflow-y-auto flex-1">
                  <ErrorBoundary fallback={<div className="p-4 text-sm text-muted-foreground">Filters unavailable — please refresh.</div>}>
                    {renderFilterSections()}
                  </ErrorBoundary>
                </div>
              </Card>
            </aside>
            <div>
              <div className="flex items-center justify-between mb-4 gap-2">
                <div className="lg:hidden">
                  <Sheet open={mobileOpen} onOpenChange={(o) => { if (o) openMobile(); else setMobileOpen(false); }}>
                    <SheetTrigger asChild>
                      <Button variant="pillOutline" size="sm">
                        <SlidersHorizontal className="w-4 h-4" /> Filter
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-[88vw] max-w-sm flex flex-col">
                      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                        <h2 className="font-display font-bold text-base">Filters</h2>
                        <button onClick={() => setMobileOpen(false)} aria-label="Close">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto px-5 py-2">
                        <ErrorBoundary fallback={<div className="p-4 text-sm text-muted-foreground">Filters unavailable — please refresh.</div>}>
                          {draft && renderFilterSections(draft, (p) => setDraft({ ...draft, ...p }))}
                        </ErrorBoundary>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-4 border-t border-border/60">
                        <Button variant="outline" onClick={clearDraft}>Clear</Button>
                        <Button onClick={applyDraft}>Apply</Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{filtered.length}</span> sarees
                </p>
                <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
                  <SelectTrigger className="w-[180px] rounded-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {activeChips.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 animate-fade-in">
                  {activeChips.map((chip, i) => (
                    <Badge key={i} variant="secondary" className="rounded-full pl-3 pr-1 py-1 cursor-pointer hover:bg-secondary/80 transition-colors" onClick={chip.clear}>
                      {chip.label} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                  <button onClick={clearAll} className="text-xs text-primary font-semibold underline">Clear all</button>
                </div>
              )}
              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-muted/40" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground rounded-2xl">No sarees match these filters.</Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 animate-fade-in">
                  {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Shop;
