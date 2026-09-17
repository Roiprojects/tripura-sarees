import { useMemo, useRef, useState, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronRight, SlidersHorizontal, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/database.types";
import { FiltersPanel, type CatNode } from "@/components/store/Filters";
import { usePersistedState } from "@/hooks/usePersistedState";
import { resolveImage } from "@/lib/resolveImage";
import { sortSizes } from "@/lib/sizeUtils";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import {
  expandCategoryFilterIds,
  getEffectiveCategoryFilterIds,
} from "@/lib/categoryFilters";
import { categoryImage, occasionBySlug } from "@/lib/sareeCatalog";


/**
 * One dynamic page used by every listing route:
 *   /category/:slug, /occasion/:slug, /collection/:slug, /featured, /new, /trending
 *
 * Resolves the right filter from the route, fetches products from Supabase,
 * and renders a hero (from category.banner_url/image_url, built-in saree
 * artwork or a matching homepage section) + filters + sort + product grid.
 */
type Sort = "newest" | "popular" | "price-asc" | "price-desc";
// Upper price bound meaning "no limit" (see shownPrice below).
const NO_PRICE_LIMIT = Number.MAX_SAFE_INTEGER;

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  featured: { title: "Featured Sarees", subtitle: "Hand-picked favourites from every weave" },
  new: { title: "New Arrivals", subtitle: "Fresh from the loom — the latest sarees in store" },
  trending: { title: "Trending Now", subtitle: "The drapes everyone is loving this week" },
};

const Collection = () => {
  const params = useParams();
  const { pathname } = useLocation();
  const persistPrefix = `filters:collection:${pathname}`;
  const [sort, setSort] = usePersistedState<Sort>(`${persistPrefix}:sort`, "newest");

  // Derive a filter spec from the URL.
  const spec = useMemo(() => resolveSpec(pathname, params), [pathname, params]);

  // Walk the category tree along the URL slugs (e.g. /category/banarasi-silk)
  // to find the deepest matching category + ancestor breadcrumb chain.
  const { data: catChain = [] } = useQuery({
    queryKey: ["cat-chain", spec.slugChain?.join("/")],
    enabled: !!spec.slugChain?.length,
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name,slug,parent_id,section_key");
      const all = data ?? [];
      const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const chain: any[] = [];
      let parentId: string | null = null;
      for (const segRaw of spec.slugChain!) {
        const seg = slugify(segRaw);
        const candidates = all.filter((c) => {
          const s = c.slug.toLowerCase();
          return s === seg || slugify(c.name) === seg || s.endsWith(`-${seg}`);
        });
        const sameParent = candidates.filter((c) => c.parent_id === parentId);
        const node = sameParent.find((c) => c.slug.toLowerCase() === seg)
          ?? sameParent.find((c) => slugify(c.name) === seg)
          ?? sameParent.find((c) => c.slug.toLowerCase().endsWith(`-${seg}`))
          ?? (parentId === null ? candidates.find((c) => !c.parent_id && c.slug.toLowerCase() === seg) : undefined)
          ?? candidates.find((c) => c.slug.toLowerCase() === seg)
          ?? candidates[0];
        if (!node) break;
        chain.push(node);
        parentId = node.id;
      }
      return chain;
    },
  });

  const deepest = catChain.at(-1);

  // Fetch hero metadata: deepest category OR matching homepage section.
  const { data: hero } = useQuery({
    queryKey: ["collection-hero", spec.kind, spec.slug, deepest?.id],
    queryFn: async () => {
      if (deepest) {
        const { data } = await supabase.from("categories").select("name,description,image_url,banner_url")
          .eq("id", deepest.id).maybeSingle();
        if (data) return { title: data.name, subtitle: data.description, image: data.banner_url || data.image_url || categoryImage(deepest.slug) };
      }
      if (spec.slug && spec.kind !== "occasion") {
        const { data } = await supabase.from("categories").select("name,description,image_url,banner_url,slug")
          .eq("slug", spec.slug).maybeSingle();
        if (data && (data.banner_url || data.image_url)) return { title: data.name, subtitle: data.description, image: data.banner_url || data.image_url };
      }
      const key = spec.sectionKey ?? spec.slug;
      if (key) {
        const { data } = await supabase.from("homepage_sections").select("title,subtitle,image_url")
          .eq("key", key).maybeSingle();
        if (data) return { title: data.title, subtitle: data.subtitle, image: data.image_url };
      }
      return null;
    },
  });

  // Fetch products matching the spec. When the matched category has children
  // (e.g. /category/silk-sarees → "Silk Sarees" with Banarasi, Kanjeevaram…),
  // include products from ALL descendant categories so the grid isn't empty.
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["collection-products", spec, sort, deepest?.id],
    queryFn: async () => {
      const applySort = (query: any) => {
        if (sort === "popular") return query.order("rating", { ascending: false });
        if (sort === "price-asc") return query.order("price", { ascending: true });
        if (sort === "price-desc") return query.order("price", { ascending: false });
        return query.order("created_at", { ascending: false });
      };

      // Resolve the set of category ids to filter by (target + descendants).
      let categoryIds: string[] | null = null;
      let allCats: { id: string; parent_id: string | null; slug: string; name: string }[] = [];
      const rootCatId =
        deepest?.id ??
        (spec.categorySlug
          ? (await supabase.from("categories").select("id").eq("slug", spec.categorySlug).maybeSingle()).data?.id
          : null);
      if (rootCatId || spec.slugChain?.length) {
        const { data } = await supabase.from("categories").select("id,parent_id,slug,name");
        allCats = (data ?? []) as typeof allCats;
      }
      if (rootCatId) {
        const ids = new Set<string>([rootCatId]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const c of allCats) {
            if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
              ids.add(c.id);
              changed = true;
            }
          }
        }
        categoryIds = Array.from(ids);

        // Category assignment from the admin is authoritative. Only products
        // assigned to this exact category path (target + descendants) should show.
        const idList = categoryIds.join(",");
        const arrLit = `{${categoryIds.join(",")}}`;
        const exactQuery = applySort(
          supabase.from("products").select("*").eq("status", "active")
            .or(`category_id.in.(${idList}),extra_category_ids.ov.${arrLit}`),
        );
        const { data: exactData, error: exactError } = await exactQuery.limit(48);
        if (exactError) throw exactError;
        return ((exactData ?? []) as Product[]).slice(0, 48);
      }

      let q = supabase.from("products").select("*").eq("status", "active");
      if (spec.occasionKeyword) q = q.ilike("collection", `%${spec.occasionKeyword}%`);
      if (spec.collection) {
        // /collection/:slug matches either the product's collection label or a section tag.
        const label = spec.collection.replace(/-/g, " ");
        q = q.or(`collection.ilike.${label},section_keys.cs.{${spec.collection}}`);
      }
      if (spec.sectionKey) q = q.contains("section_keys", [spec.sectionKey]);
      if (spec.isFeatured) q = q.eq("is_featured", true);
      if (spec.isNew) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        q = q.or(`is_new.eq.true,created_at.gte.${thirtyDaysAgo}`);
      }
      if (spec.isTrending) q = q.eq("is_trending", true);
      const { data, error } = await applySort(q).limit(48);
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  // Related = other sarees in the same category or occasion
  const { data: related = [] } = useQuery({
    queryKey: ["collection-related", spec, deepest?.id],
    enabled: products.length > 0,
    queryFn: async () => {
      const rootCatId =
        deepest?.id ??
        (spec.categorySlug
          ? (await supabase.from("categories").select("id").eq("slug", spec.categorySlug).maybeSingle()).data?.id
          : null);
      let relatedCategoryIds: string[] | null = null;
      if (rootCatId) {
        const { data: allCats } = await supabase.from("categories").select("id,parent_id");
        const ids = new Set<string>([rootCatId]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const c of allCats ?? []) {
            if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
              ids.add(c.id);
              changed = true;
            }
          }
        }
        relatedCategoryIds = Array.from(ids);
      }

      let q = supabase.from("products").select("*").eq("status", "active").limit(8);
      if (relatedCategoryIds?.length) {
        const idList = relatedCategoryIds.join(",");
        const arrLit = `{${relatedCategoryIds.join(",")}}`;
        q = q.or(`category_id.in.(${idList}),extra_category_ids.ov.${arrLit}`);
      }
      else if (spec.occasionKeyword) q = q.ilike("collection", `%${spec.occasionKeyword}%`);
      const { data } = await q;
      const seen = new Set(products.map((p) => p.id));
      return ((data ?? []) as Product[]).filter((p) => !seen.has(p.id)).slice(0, 4);
    },
  });

  const title = hero?.title ?? spec.title ?? "Collection";
  const subtitle = hero?.subtitle ?? spec.subtitle;
  const fallbackImage = products.find((p: any) => p?.images?.[0])?.images?.[0];
  const heroImage = hero?.image || spec.image || fallbackImage;

  // ─── Filters ──────────────────────────────────────────────────────────
  const [sizes, setSizes] = usePersistedState<string[]>(`${persistPrefix}:sizes`, []);
  const [colors, setColors] = usePersistedState<string[]>(`${persistPrefix}:colors`, []);
  const [occasions, setOccasions] = usePersistedState<string[]>(`${persistPrefix}:occasions`, []);
  const [catFilters, setCatFilters] = usePersistedState<string[]>(`${persistPrefix}:catFilters`, []);
  const [price, setPrice] = usePersistedState<[number, number]>(`${persistPrefix}:price:v2`, [0, NO_PRICE_LIMIT]);
  const [inStockOnly, setInStockOnly] = usePersistedState<boolean>(`${persistPrefix}:inStockOnly`, false);
  const [preorderOnly, setPreorderOnly] = usePersistedState<boolean>(`${persistPrefix}:preorderOnly`, false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const maxPrice = useMemo(
    () => Math.max(10000, ...products.map((p: any) => Number(p.price) || 0)),
    [products],
  );
  // The slider shows the range clamped to real prices. An upper handle at the
  // maximum is stored as "no limit", so the default range never hides pricier
  // sarees (the old default of ₹10,000 was applied before products loaded).
  const shownPrice: [number, number] = [Math.min(price[0], maxPrice), Math.min(price[1], maxPrice)];
  const setShownPrice = (v: [number, number]) => setPrice([v[0], v[1] >= maxPrice ? NO_PRICE_LIMIT : v[1]]);


  // Category tree: children of the deepest matched category, OR the full
  // top-level tree (with sub & sub-sub categories) on generic listings.
  const { data: subTree = [] } = useQuery<CatNode[]>({
    queryKey: ["collection-subtree", deepest?.id ?? "root"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id,name,parent_id")
        .order("sort_order", { ascending: true });
      const all = (data ?? []) as { id: string; name: string; parent_id: string | null }[];
      const build = (pid: string | null): CatNode[] =>
        all
          .filter((c) => c.parent_id === pid)
          .map((c) => ({ id: c.id, name: c.name, children: build(c.id) }));
      return build(deepest?.id ?? null);
    },
  });

  // Facets derived from products.
  const adminSizes = useFilterOptions("size");
  const sizeFacet = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p: any) => (p.sizes ?? []).forEach((s: string) => s && set.add(s)));
    const list = adminSizes.length > 0 ? adminSizes : Array.from(set);
    // A size filter is only useful when there is more than "Free Size" to pick from.
    const real = list.filter((s) => !/free/i.test(s));
    return real.length > 0 ? sortSizes(list) : [];
  }, [products, adminSizes]);


  const colorFacet = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p: any) => (p.colors ?? []).forEach((c: string) => c && set.add(c)));
    return Array.from(set).sort();
  }, [products]);

  const occasionFacet = useMemo(() => {
    if (spec.kind === "occasion") return [];
    const set = new Set<string>();
    products.forEach((p: any) => { if (p.collection) set.add(String(p.collection).trim()); });
    return Array.from(set).sort();
  }, [products, spec.kind]);

  // Expand selected categories to include all descendants so picking a
  // parent (e.g. "Silk Sarees") also matches products in its sub & sub-sub.
  // When both a parent and one of its descendants are selected, the more
  // specific descendant wins — otherwise the parent's subtree subsumes the
  // child and the count never narrows.
  const flatSubTree = useMemo(() => {
    const rows: { id: string; parent_id: string | null; name?: string | null; slug?: string | null }[] = [];
    const walk = (nodes: CatNode[], parentId: string | null) => {
      nodes.forEach((node) => {
        rows.push({ id: node.id, parent_id: parentId, name: node.name });
        if (node.children?.length) walk(node.children, node.id);
      });
    };
    walk(subTree, null);
    return rows;
  }, [subTree]);

  const effectiveCategoryFilters = useMemo(
    () => getEffectiveCategoryFilterIds(catFilters, flatSubTree),
    [catFilters, flatSubTree],
  );

  const expandedCatFilters = useMemo(
    () => Array.from(expandCategoryFilterIds(effectiveCategoryFilters, flatSubTree)),
    [effectiveCategoryFilters, flatSubTree],
  );

  const filtered = useMemo(() => {
    return products.filter((p: any) => {
      const price$ = Number((p as any).sale_price) > 0 ? Number((p as any).sale_price) : (Number(p.price) || 0);
      if (price$ < Number(price[0]) || price$ > Number(price[1])) return false;
      if (sizes.length && !(p.sizes ?? []).some((s: string) => sizes.includes(s))) return false;
      if (colors.length && !(p.colors ?? []).some((c: string) => colors.includes(c))) return false;
      if (occasions.length && !occasions.includes(String(p.collection ?? "").trim())) return false;
      if (expandedCatFilters.length) {
        const extras: string[] = Array.isArray((p as any).extra_category_ids) ? (p as any).extra_category_ids : [];
        const hit = expandedCatFilters.includes(p.category_id) || extras.some((eid) => expandedCatFilters.includes(eid));
        if (!hit) return false;
      }
      if (inStockOnly && (p.stock_quantity ?? 1) <= 0) return false;
      if (preorderOnly && (p.stock_quantity ?? 1) > 0) return false;
      return true;
    });
  }, [products, price, sizes, colors, occasions, expandedCatFilters, inStockOnly, preorderOnly]);

  const clearAll = () => {
    setSizes([]); setColors([]); setCatFilters([]); setOccasions([]);
    setPrice([0, NO_PRICE_LIMIT]); setInStockOnly(false); setPreorderOnly(false);
  };

  const filtersNode = (
    <FiltersPanel
      sizes={sizes} setSizes={setSizes}
      colors={colors} setColors={setColors}
      occasions={occasions} setOccasions={setOccasions}
      catFilters={catFilters} setCatFilters={setCatFilters}
      price={shownPrice} setPrice={setShownPrice} maxPrice={maxPrice}
      inStockOnly={inStockOnly} setInStockOnly={setInStockOnly}
      preorderOnly={preorderOnly} setPreorderOnly={setPreorderOnly}
      sizeFacet={sizeFacet} colorFacet={colorFacet} occasionFacet={occasionFacet}
      categoryFacet={subTree}
      onClearAll={clearAll}
    />
  );


  return (
    <Layout>
      {/* Hero banner — premium two-pane composition */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-muted/40 to-secondary/20">
        <div className="relative w-full h-[280px] sm:h-[340px] md:h-[420px] lg:h-[480px]">
          {heroImage ? (
            <img
              src={resolveImage(heroImage)}
              alt={title}
              loading="eager"
              width={1920}
              height={1080}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
              className="absolute inset-0 w-full h-full object-contain md:object-cover object-[85%_top] md:object-[right_top] animate-[fadeIn_0.8s_ease-out]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-muted to-secondary/30" />
          )}

          {/* Cinematic overlays: stronger left for legibility, softer right so subjects stay visible */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/35 to-transparent md:from-background/85 md:via-background/30 md:to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/70 to-transparent" />

          {/* Glassmorphism content card */}
          <div className="container relative h-full flex items-center">
            <div className="max-w-xl w-[72%] sm:w-[68%] md:w-[58%] lg:w-[48%] animate-[slideUp_0.7s_ease-out]">
              <div className="relative rounded-2xl border border-white/30 bg-background/55 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] p-5 sm:p-7 md:p-9">

                <div className="h-px w-12 bg-gradient-to-r from-primary to-transparent mb-4" />

                <h1 className="title-glow font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
                  {title}
                </h1>

                {subtitle && (
                  <p className="text-foreground/70 mt-3 sm:mt-4 max-w-md text-sm sm:text-base leading-relaxed">
                    {subtitle}
                  </p>
                )}

                <div className="mt-5 sm:mt-6 flex items-center gap-3">
                  <button
                    onClick={() => {
                      document.getElementById("collection-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="group relative inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-[titleShimmer_3s_linear_infinite]" />
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full [transition:transform_0.8s_ease,opacity_0.3s_ease]" />
                    <Sparkles className="relative h-4 w-4 animate-pulse" />
                    <span className="relative tracking-wide">Explore the Collection</span>
                  </button>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {"\n"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <section className="container pt-6 pb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {isLoading ? "Preparing sarees" : `${filtered.length} ${filtered.length === 1 ? "saree" : "sarees"}`}
        </div>
        <div className="flex items-center gap-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden gap-2">
                <SlidersHorizontal className="w-4 h-4" /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[88vw] max-w-sm flex flex-col">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-4">{filtersNode}</div>
              <div className="p-4 border-t">
                <Button className="w-full" onClick={() => setMobileOpen(false)}>
                  Show {filtered.length} sarees
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="popular">Most popular</SelectItem>
              <SelectItem value="price-asc">Price: low → high</SelectItem>
              <SelectItem value="price-desc">Price: high → low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Sidebar + Grid */}
      <section id="collection-grid" className="container pb-12 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 scroll-mt-24">
        <aside className="hidden lg:block">{filtersNode}</aside>
        <div>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6" aria-label="Preparing sarees">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="aspect-[3/4] rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-10 text-center rounded-2xl">
              <p className="text-muted-foreground">No sarees match these filters.</p>
              <Button variant="outline" className="mt-4" onClick={clearAll}>Clear filters</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {filtered.map((p) => <ProductCard key={p.id} product={p as any} selectedColor={colors[0]} />)}
            </div>
          )}
        </div>
      </section>


      {/* Related */}
      {related.length > 0 && (
        <section className="container pb-16">
          <h2 className="font-display text-2xl font-bold mb-4">You might also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((p) => <ProductCard key={p.id} product={p as any} />)}
          </div>
        </section>
      )}
    </Layout>
  );
};

// ─── Route → filter spec ───────────────────────────────────────────────────
type Spec = {
  kind: "category" | "collection" | "occasion" | "section" | "flag";
  slug?: string;
  slugChain?: string[];
  title?: string;
  subtitle?: string;
  crumb?: string;
  categorySlug?: string;
  collection?: string;
  occasionKeyword?: string;
  image?: string;
  sectionKey?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
};

function resolveSpec(pathname: string, params: any): Spec {
  if (params.slug && pathname.startsWith("/category/")) {
    return { kind: "category", slug: params.slug, categorySlug: params.slug, slugChain: [params.slug], crumb: titleCase(params.slug), image: categoryImage(params.slug) };
  }
  if (params.slug && pathname.startsWith("/occasion/")) {
    const occasion = occasionBySlug(params.slug);
    return {
      kind: "occasion",
      slug: params.slug,
      occasionKeyword: occasion?.keyword ?? params.slug.replace(/-/g, " "),
      title: `${occasion?.label ?? titleCase(params.slug)} Sarees`,
      subtitle: occasion?.description,
      image: occasion?.image,
      crumb: occasion?.label ?? titleCase(params.slug),
    };
  }
  if (params.slug && pathname.startsWith("/collection/")) {
    // Also resolve as a category so a category with the same slug wins.
    return { kind: "collection", slug: params.slug, collection: params.slug, categorySlug: params.slug, slugChain: [params.slug], title: titleCase(params.slug), crumb: titleCase(params.slug) };
  }

  const path = pathname.replace(/^\//, "").split("/").filter(Boolean)[0] ?? "";
  const aliases: Record<string, Spec> = {
    featured: { kind: "flag", isFeatured: true, title: TITLES.featured.title, subtitle: TITLES.featured.subtitle, crumb: "Featured" },
    new: { kind: "flag", isNew: true, slug: "new-arrivals", title: TITLES.new.title, subtitle: TITLES.new.subtitle, crumb: "New Arrivals" },
    trending: { kind: "flag", isTrending: true, title: TITLES.trending.title, subtitle: TITLES.trending.subtitle, crumb: "Trending" },
  };
  if (aliases[path]) return aliases[path];

  return { kind: "section", title: "Sarees" };
}

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default Collection;
