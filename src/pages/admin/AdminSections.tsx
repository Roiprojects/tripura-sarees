import { useEffect, useState } from "react";
import { CrudPage } from "@/components/admin/CrudPage";
import { supabase } from "@/integrations/supabase/client";
import {
  Image as ImageIcon, Megaphone, LayoutGrid, Sparkles, Shirt, Cake, Users, Star,
  Tag, ShoppingBag, Eye, ShieldCheck, BadgePercent, Mail, Layers, Package,
} from "lucide-react";

const TYPE_META: Record<string, { Icon: any; gradient: string }> = {
  hero: { Icon: ImageIcon, gradient: "from-fuchsia-500 to-pink-500" },
  marquee: { Icon: Megaphone, gradient: "from-amber-500 to-orange-500" },
  tiles: { Icon: LayoutGrid, gradient: "from-sky-500 to-cyan-500" },
  categories: { Icon: Layers, gradient: "from-violet-500 to-indigo-500" },
  occasions: { Icon: Sparkles, gradient: "from-emerald-600 to-amber-500" },
  product_grid: { Icon: Package, gradient: "from-blue-500 to-violet-500" },
  featured_grid: { Icon: Star, gradient: "from-yellow-500 to-orange-500" },
  collections: { Icon: Tag, gradient: "from-pink-500 to-rose-500" },
  recently_viewed: { Icon: Eye, gradient: "from-slate-500 to-slate-700" },
  trust_bar: { Icon: ShieldCheck, gradient: "from-emerald-500 to-teal-500" },
  banner: { Icon: BadgePercent, gradient: "from-red-500 to-orange-500" },
  newsletter: { Icon: Mail, gradient: "from-indigo-500 to-blue-500" },
  cake: { Icon: Cake, gradient: "from-pink-500 to-amber-500" },
  shop: { Icon: ShoppingBag, gradient: "from-fuchsia-500 to-violet-500" },
};

// Maps a section key -> filter args used by the live storefront.
// Keep in sync with src/hooks/useSectionProducts.ts mappings.
const KEY_FILTERS: Record<string, { sectionKey?: string; gender?: string; collection?: string; isFeatured?: boolean; isNew?: boolean; isTrending?: boolean }> = {
  "new-arrivals": { sectionKey: "new-arrivals", isNew: true },
  "best-selling": { sectionKey: "best-selling", isFeatured: true },
  "selling-fast": { sectionKey: "selling-fast", isTrending: true },
  "featured-products": { isFeatured: true },
};

const SectionThumb = ({ row }: { row: any }) => {
  const meta = TYPE_META[row.type] ?? TYPE_META.product_grid;
  const Icon = meta.Icon;
  const [preview, setPreview] = useState<{ image: string | null; count: number } | null>(null);

  useEffect(() => {
    const filters = KEY_FILTERS[row.key];
    if (!filters) {
      setPreview({ image: null, count: 0 });
      return;
    }
    let q = supabase
      .from("products")
      .select("images, id", { count: "exact" })
      .eq("status", "active");
    if (filters.sectionKey) q = q.contains("section_keys", [filters.sectionKey]);
    if (filters.gender) q = q.eq("gender", filters.gender);
    if (filters.collection) q = q.eq("collection", filters.collection);
    if (filters.isFeatured) q = q.eq("is_featured", true);
    if (filters.isNew) q = q.eq("is_new", true);
    if (filters.isTrending) q = q.eq("is_trending", true);
    q.limit(1).then(({ data, count }) => {
      const first = (data?.[0] as any)?.images?.[0] ?? null;
      setPreview({ image: first, count: count ?? 0 });
    });
  }, [row.key, row.type]);

  return (
    <div className="flex items-center gap-3">
      <div className={`relative w-14 h-14 rounded-xl overflow-hidden shadow-sm ring-1 ring-border bg-gradient-to-br ${meta.gradient} flex items-center justify-center shrink-0`}>
        {preview?.image ? (
          <img
            src={preview.image}
            alt={row.title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <Icon className="w-6 h-6 text-white" />
        )}
      </div>
      {preview && (
        <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
          {preview.count} {preview.count === 1 ? "product" : "products"}
        </span>
      )}
    </div>
  );
};

const AdminSections = () => (
  <CrudPage
    table="homepage_sections"
    title="Homepage Sections"
    searchKey="title"
    orderBy={{ column: "sort_order", ascending: true }}
    defaultValues={{ visible: true, sort_order: 0, type: "product_grid", config: {} }}
    columns={[
      { key: "sort_order", label: "#", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.sort_order}</span> },
      { key: "preview", label: "Preview", render: (r) => <SectionThumb row={r} /> },
      {
        key: "title",
        label: "Section",
        render: (r) => (
          <div>
            <div className="font-semibold">{r.title}</div>
            {r.subtitle && <div className="text-xs text-muted-foreground">{r.subtitle}</div>}
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-0.5">key: {r.key}</div>
          </div>
        ),
      },
      { key: "type", label: "Type", render: (r) => <span className="text-xs px-2 py-1 rounded bg-muted">{r.type}</span> },
      {
        key: "visible",
        label: "Visible",
        render: (r) => (
          <span className={`text-xs px-2 py-1 rounded font-semibold ${r.visible ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
            {r.visible ? "Published" : "Hidden"}
          </span>
        ),
      },
    ]}
    fields={[
      { key: "title", label: "Title", required: true },
      { key: "subtitle", label: "Subtitle" },
      { key: "key", label: "Key (unique, used by frontend)", required: true, placeholder: "shop-by-occasion" },
      {
        key: "type",
        label: "Type",
        type: "select",
        required: true,
        options: [
          { value: "hero", label: "Hero Carousel" },
          { value: "marquee", label: "Trust Marquee" },
          { value: "tiles", label: "Tiles / Quick browse" },
          { value: "categories", label: "Shop by Weave" },
          { value: "occasions", label: "Shop by Occasion" },
          { value: "product_grid", label: "Product Grid" },
          { value: "featured_grid", label: "Featured Products" },
          { value: "collections", label: "Special Collections" },
          { value: "recently_viewed", label: "Recently Viewed" },
          { value: "trust_bar", label: "Trust Bar" },
          { value: "banner", label: "Sale / Promo Banner" },
          { value: "newsletter", label: "Newsletter" },
        ],
      },
      { key: "sort_order", label: "Sort order (lower = higher)", type: "number" },
      { key: "visible", label: "Visible on homepage", type: "boolean" },
      { key: "config", label: "Config (JSON)", type: "json", placeholder: '{"collection":"festive","limit":8}' },
    ]}
  />
);

export default AdminSections;
