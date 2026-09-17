import { useEffect, useMemo, useRef, useState } from "react";
import { site } from "@/config/site";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tag, DollarSign, Palette, Globe, Image as ImageIcon, Link2, Settings, Package, Loader2, ArrowLeft, AlertCircle, CheckCircle2, Eye } from "lucide-react";
import { toast } from "sonner";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ProductCard } from "@/components/ProductCard";
import { resolveImage } from "@/lib/resolveImage";
import { CategoryQuickActions } from "@/components/admin/CategoryQuickActions";
import { CategoryListEditor } from "@/components/admin/CategoryListEditor";
import { ColorVariantManager, type ColorVariant, PRESET_COLORS } from "@/components/admin/ColorVariantManager";
import { SizeColorMatrix, type ComboVariant } from "@/components/admin/SizeColorMatrix";

function ExtraCategoryPicker({
  options, value, onChange,
}: { options: { id: string; path: string; root: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const filtered = q.trim()
    ? options.filter((o) => o.path.toLowerCase().includes(q.toLowerCase()))
    : options;

  // Group by root (top-level category)
  const groups = filtered.reduce<Record<string, { id: string; path: string; sub: string }[]>>((acc, o) => {
    const sub = o.path.startsWith(o.root + " › ") ? o.path.slice(o.root.length + 3) : o.path === o.root ? "(main)" : o.path;
    (acc[o.root] ||= []).push({ id: o.id, path: o.path, sub });
    return acc;
  }, {});
  const groupNames = Object.keys(groups).sort();

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  const toggleGroup = (name: string) => setOpenGroups((g) => ({ ...g, [name]: !g[name] }));

  const selectAllInGroup = (ids: string[]) => {
    const merged = Array.from(new Set([...value, ...ids]));
    onChange(merged);
  };
  const clearGroup = (ids: string[]) => onChange(value.filter((v) => !ids.includes(v)));

  // Auto-open groups that match search
  const isOpen = (name: string) => (q.trim() ? true : !!openGroups[name]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search e.g. Silk, Handloom, Wedding…"
          className="h-9 text-sm"
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="shrink-0 text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Clear all ({value.length})
          </button>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto border rounded-lg divide-y bg-white">
        {groupNames.length === 0 ? (
          <p className="text-xs text-slate-400 italic p-4 text-center">No categories match "{q}"</p>
        ) : groupNames.map((name) => {
          const items = groups[name];
          const ids = items.map((i) => i.id);
          const selectedCount = ids.filter((id) => value.includes(id)).length;
          const open = isOpen(name);
          return (
            <div key={name}>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/70">
                <button type="button" onClick={() => toggleGroup(name)} className="flex-1 flex items-center gap-2 text-left">
                  <span className={`inline-block w-4 text-center text-slate-500 text-xs transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
                  <span className="text-sm font-semibold text-slate-800">{name}</span>
                  <span className="text-[11px] text-slate-500">({items.length})</span>
                  {selectedCount > 0 && (
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">{selectedCount} selected</span>
                  )}
                </button>
                {selectedCount < items.length ? (
                  <button type="button" onClick={() => selectAllInGroup(ids)} className="text-[11px] font-medium text-emerald-700 hover:underline">Select all</button>
                ) : (
                  <button type="button" onClick={() => clearGroup(ids)} className="text-[11px] font-medium text-slate-500 hover:underline">Clear</button>
                )}
              </div>
              {open && (
                <div className="pl-4">
                  {items.map((it) => {
                    const on = value.includes(it.id);
                    return (
                      <button
                        key={it.id} type="button" onClick={() => toggle(it.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm border-t border-slate-100 transition-colors ${on ? "bg-emerald-50 text-emerald-800 font-medium" : "hover:bg-slate-50"}`}
                      >
                        <span className={`w-4 h-4 rounded border-2 grid place-items-center shrink-0 ${on ? "border-emerald-600 bg-emerald-600" : "border-slate-300"}`}>
                          {on && <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />}
                        </span>
                        <span className="truncate">{it.sub}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


type ProductForm = {
  id?: string;
  name: string;
  slug: string;
  sku: string;
  sku_id: string;
  design_number: string;
  brand: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  status: string;
  gender: string;
  collection: string;
  category_id: string | null;
  extra_category_ids: string[];
  images: string[];
  sizes: string[];
  colors: string[];
  tags: string[];
  section_keys: string[];
  age_groups: string[];
  seo_title: string;
  seo_description: string;
  is_featured: boolean;
  is_new: boolean;
  is_trending: boolean;
  show_on_homepage: boolean;
  // Preorder
  preorder_enabled: boolean;
  preorder_status: "in_stock" | "out_of_stock" | "coming_soon" | "preorder";
  preorder_available_date: string;
  preorder_message: string;
  preorder_stock_limit: number | null;
  // Size guide
  size_guide_id: string | null;
};

const empty: ProductForm = {
  name: "", slug: "", sku: "", sku_id: "", design_number: "", brand: "", description: "", price: 0, compare_at_price: null,
  stock: 10, status: "active", gender: "women", collection: "", category_id: null, extra_category_ids: [],
  images: [], sizes: ["Free Size"], colors: [], tags: [], section_keys: [], age_groups: [],
  seo_title: "", seo_description: "",
  is_featured: false, is_new: false, is_trending: false, show_on_homepage: true,
  preorder_enabled: false, preorder_status: "in_stock",
  preorder_available_date: "", preorder_message: "", preorder_stock_limit: null,
  size_guide_id: null,
};

const SECTIONS = [
  { key: "new-arrivals", label: "New Arrivals" },
  { key: "best-selling", label: "Best Selling" },
  { key: "selling-fast", label: "Selling Fast" },
  { key: "featured-products", label: "Curated For You" },
  { key: "recently-viewed", label: "Recently Viewed Eligible" },
];

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const splitCsv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const joinCsv = (a: string[]) => (a ?? []).join(", ");

const AdminProductForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const nav = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState<ProductForm>(empty);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [comboVariants, setComboVariants] = useState<ComboVariant[]>([]);
  const [tab, setTab] = useState("general");
  const [skuStatus, setSkuStatus] = useState<"idle" | "checking" | "ok" | "dup">("idle");
  const [slugTouched, setSlugTouched] = useState(false);
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const saveInFlightRef = useRef(false);
  const draftProductIdRef = useRef<string | null>(null);

  const analyzeImageWithAI = async (imageUrl: string) => {
    setAiImageLoading(true);
    const tId = toast.loading("✨ AI is analyzing your image…");
    try {
      const { data, error } = await supabase.functions.invoke("analyze-product-image", {
        body: { image_url: imageUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setForm((f) => ({
        ...f,
        name: f.name?.trim() ? f.name : (data?.name ?? f.name),
        description: f.description?.trim() ? f.description : (data?.description ?? f.description),
      }));
      toast.success("AI generated name & description — edit if needed", { id: tId });
    } catch (e: any) {
      toast.error(e?.message || "AI image analysis failed", { id: tId });
    } finally {
      setAiImageLoading(false);
    }
  };

  // Load existing product
  const existing = useQuery({
    queryKey: ["admin-product", id],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existing.data) {
      const d: any = existing.data;
      setForm({
        ...empty,
        ...d,
        images: d.images ?? [],
        sizes: d.sizes ?? [],
        colors: d.colors ?? [],
        tags: d.tags ?? [],
        section_keys: d.section_keys ?? [],
        extra_category_ids: d.extra_category_ids ?? [],
        age_groups: d.age_groups ?? [],
        seo_title: d.seo_title ?? "",
        seo_description: d.seo_description ?? "",
        slug: d.slug ?? "",
        sku: d.sku ?? "",
        sku_id: d.sku_id ?? "",
        design_number: d.design_number ?? "",
        brand: d.brand ?? "",
        description: d.description ?? "",
        collection: d.collection ?? "",
        gender: d.gender ?? "",
        status: d.status ?? "active",
        preorder_enabled: !!d.preorder_enabled,
        preorder_status: d.preorder_status ?? "in_stock",
        preorder_available_date: d.preorder_available_date ?? "",
        preorder_message: d.preorder_message ?? "",
        preorder_stock_limit: d.preorder_stock_limit ?? null,
        size_guide_id: d.size_guide_id ?? null,
      });
      setSlugTouched(true);
    }
  }, [existing.data]);

  // Load existing variants when editing
  const existingVariants = useQuery({
    queryKey: ["admin-product-variants", id],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("size, color_name, sku_code, design_id, stock_quantity, variant_price, discount_percent")
        .eq("product_id", id!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  useEffect(() => {
    if (existingVariants.data) {
      const combos: ComboVariant[] = existingVariants.data
        .filter((v: any) => !!v.color_name)
        .map((v: any) => ({
          size: v.size,
          color_name: v.color_name,
          sku_code: v.sku_code ?? "",
          design_id: v.design_id ?? "",
          stock_quantity: v.stock_quantity ?? 0,
          variant_price: v.variant_price ?? null,
          discount_percent: v.discount_percent ?? 0,
        }));
      setComboVariants(combos);
    }
  }, [existingVariants.data]);

  // Load existing color variants when editing
  const existingColorVariants = useQuery({
    queryKey: ["admin-product-color-variants", id],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_color_variants")
        .select("color_name, hex_code, images, stock_quantity, sku_code")
        .eq("product_id", id!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((v: any) => ({
        color_name: v.color_name,
        hex_code: v.hex_code ?? "",
        images: v.images ?? [],
        stock_quantity: v.stock_quantity ?? 0,
        sku_code: v.sku_code ?? "",
      })) as ColorVariant[];
    },
  });

  useEffect(() => {
    if (existingColorVariants.data) {
      setColorVariants(existingColorVariants.data);
    } else if (existing.data && (existing.data as any).colors?.length && !existingColorVariants.isLoading) {
      // Backfill legacy colors[] into editable color variants on first edit
      const legacy = ((existing.data as any).colors as string[]).map((name) => {
        const preset = PRESET_COLORS.find((p) => p.name.toLowerCase() === name.toLowerCase());
        return {
          color_name: name,
          hex_code: preset?.hex ?? "#cccccc",
          images: [],
          stock_quantity: 0,
          sku_code: "",
        } as ColorVariant;
      });
      setColorVariants((cur) => (cur.length === 0 ? legacy : cur));
    }
  }, [existingColorVariants.data, existing.data]);

  // Categories (with parent grouping)
  const cats = useQuery({
    queryKey: ["admin-categories-tree"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name,parent_id,sort_order").order("sort_order");
      return data ?? [];
    },
  });

  const allProducts = useQuery({
    queryKey: ["admin-products-mini"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name").order("name");
      return data ?? [];
    },
  });

  // Auto slug
  useEffect(() => {
    if (!slugTouched && form.name) {
      setForm((f) => ({ ...f, slug: slugify(f.name) }));
    }
  }, [form.name, slugTouched]);

  // Live SKU dup-check (debounced)
  useEffect(() => {
    if (!form.sku) { setSkuStatus("idle"); return; }
    setSkuStatus("checking");
    const t = setTimeout(async () => {
      let q = supabase.from("products").select("id").eq("sku", form.sku);
      if (isEdit && id) q = q.neq("id", id);
      const { data } = await q.limit(1);
      setSkuStatus((data?.length ?? 0) > 0 ? "dup" : "ok");
    }, 400);
    return () => clearTimeout(t);
  }, [form.sku, id, isEdit]);

  const allCats = (cats.data ?? []) as any[];
  const mainCats = useMemo(() => allCats.filter((c) => !c.parent_id), [allCats]);

  // Track the 3-level cascading selection. The deepest non-empty value wins
  // and is what gets saved into form.category_id.
  const [parentId, setParentId] = useState<string | null>(null);   // level 1
  const [subId, setSubId] = useState<string | null>(null);         // level 2
  const [leafId, setLeafId] = useState<string | null>(null);       // level 3

  // When form.category_id loads (edit mode), walk up the tree to pre-fill all 3.
  useEffect(() => {
    if (!form.category_id || allCats.length === 0) return;
    const byId = new Map(allCats.map((c) => [c.id, c]));
    const chain: any[] = [];
    let cur = byId.get(form.category_id);
    while (cur) { chain.unshift(cur); cur = cur.parent_id ? byId.get(cur.parent_id) : null; }
    setParentId(chain[0]?.id ?? null);
    setSubId(chain[1]?.id ?? null);
    setLeafId(chain[2]?.id ?? null);
  }, [form.category_id, allCats.length]);

  const catById = useMemo(() => new Map(allCats.map((c) => [c.id, c])), [allCats]);
  const rootIdOf = (c: any): string | null => {
    let cur = c;
    while (cur?.parent_id) cur = catById.get(cur.parent_id);
    return cur?.id ?? null;
  };
  // Subcategory list: if a main is picked → its direct children;
  // otherwise show ALL level-2 categories across all top-level categories with parent label.
  const subOfParent = useMemo(() => {
    if (parentId) return allCats.filter((c) => c.parent_id === parentId);
    return allCats
      .filter((c) => c.parent_id && catById.get(c.parent_id) && !catById.get(c.parent_id)!.parent_id)
      .map((c) => ({ ...c, _label: `${catById.get(c.parent_id)?.name} → ${c.name}` }));
  }, [allCats, parentId, catById]);
  // Sub-sub list: if a sub is picked → its direct children;
  // otherwise show ALL level-3 categories with full breadcrumb.
  const leavesOfSub = useMemo(() => {
    if (subId) return allCats.filter((c) => c.parent_id === subId);
    const pool = allCats.filter((c) => {
      const p = c.parent_id ? catById.get(c.parent_id) : null;
      return p && p.parent_id; // grandparent exists → level 3
    });
    const filtered = parentId ? pool.filter((c) => rootIdOf(c) === parentId) : pool;
    return filtered.map((c) => {
      const p = catById.get(c.parent_id!);
      const gp = p?.parent_id ? catById.get(p.parent_id) : null;
      return { ...c, _label: `${gp?.name ?? ""} → ${p?.name ?? ""} → ${c.name}` };
    });
  }, [allCats, subId, parentId, catById]);

  const ensureUniqueSlug = async (base: string, excludeId?: string): Promise<string> => {
    const root = slugify(base) || "product";
    let candidate = root;
    let n = 2;
    // Loop until we find a slug not taken by another product
    // (cap at 1000 to avoid runaway)
    for (let i = 0; i < 1000; i++) {
      let q = supabase.from("products").select("id").eq("slug", candidate).limit(1);
      if (excludeId) q = q.neq("id", excludeId);
      const { data, error } = await q;
      if (error) throw error;
      if (!data || data.length === 0) return candidate;
      candidate = `${root}-${n++}`;
    }
    return `${root}-${Date.now()}`;
  };

  const save = useMutation({
    mutationFn: async (p: ProductForm) => {
      // Validate
      if (!p.name.trim()) throw new Error("Product name is required");
      // Price can be 0 at the product level when variants carry their own prices.
      const hasVariantPrice = (comboVariants ?? []).some((v: any) => Number(v?.variant_price) > 0);
      if ((!p.price || p.price <= 0) && !hasVariantPrice) {
        throw new Error("Set a product price, or add at least one variant with a price.");
      }
      if (p.sku && skuStatus === "dup") throw new Error("SKU already exists");

      const desiredSlug = p.slug ? slugify(p.slug) : slugify(p.name);
      const uniqueSlug = await ensureUniqueSlug(desiredSlug, p.id);
      if (uniqueSlug !== desiredSlug) {
        setForm((f) => ({ ...f, slug: uniqueSlug }));
        setSlugTouched(true);
        toast.info(`Slug "${desiredSlug}" was taken — saved as "${uniqueSlug}"`);
      }


      const payload: any = {
        name: p.name.trim(),
        slug: uniqueSlug,

        sku: p.sku || null,
        sku_id: p.sku_id?.trim() || null,
        design_number: p.design_number?.trim() || null,
        brand: p.brand?.trim() || null,
        description: p.description,
        price: Number(p.price) || 0,
        compare_at_price: p.compare_at_price ? Number(p.compare_at_price) : null,
        stock: Number(p.stock) || 0,
        status: p.status || "active",
        gender: p.gender || null,
        collection: p.collection || null,
        category_id: p.category_id || null,
        extra_category_ids: (p.extra_category_ids ?? []).filter((cid: string) => cid && cid !== p.category_id),
        images: p.images,
        sizes: p.sizes,
        // Keep legacy colors[] in sync with color variants for storefront filters
        colors: colorVariants.length > 0 ? colorVariants.map((c) => c.color_name) : p.colors,
        tags: p.tags,
        section_keys: p.section_keys,
        age_groups: p.age_groups ?? [],
        seo_title: p.seo_title || null,
        seo_description: p.seo_description || null,
        is_featured: p.is_featured,
        is_new: p.is_new,
        is_trending: p.is_trending,
        show_on_homepage: p.show_on_homepage,
        specifications: Array.isArray((p as any).specifications) ? (p as any).specifications : [],
        care_instructions: Array.isArray((p as any).care_instructions) ? (p as any).care_instructions : [],
        country_of_origin: ((p as any).country_of_origin || "").trim() || null,
        disclaimer: ((p as any).disclaimer || "").trim() || null,
        // Preorder + size guide
        preorder_enabled: !!p.preorder_enabled,
        preorder_status: p.preorder_status || "in_stock",
        preorder_available_date: p.preorder_available_date || null,
        preorder_message: p.preorder_message?.trim() || null,
        preorder_stock_limit: p.preorder_stock_limit ?? null,
        size_guide_id: p.size_guide_id || null,
      };
      const existingProductId = p.id || draftProductIdRef.current;
      let productId: string;
      if (existingProductId) {
        const { error } = await supabase.from("products").update(payload).eq("id", existingProductId);
        if (error) throw error;
        productId = existingProductId;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id as string;
        draftProductIdRef.current = productId;
        // Promote form to "edit mode" so any retry after a downstream failure
        // updates this row instead of inserting another duplicate product.
        setForm((f) => ({ ...f, id: productId }));
      }

      // Sync product variants: every row is one Size × Color combo with its own SKU, price and stock.
      const activeColors = new Set(
        colorVariants.map((c) => c.color_name.trim()).filter(Boolean),
      );
      const validComboRows = comboVariants
        .filter((v) => p.sizes.includes(v.size) && activeColors.has(v.color_name))
        .map((v, i) => ({
          product_id: productId,
          size: v.size,
          color_name: v.color_name,
          sku_code: v.sku_code?.trim() || null,
          design_id: v.design_id?.trim() || null,
          stock_quantity: Math.max(0, Number(v.stock_quantity) || 0),
          variant_price: v.variant_price ?? null,
          discount_percent: Math.min(100, Math.max(0, Number((v as any).discount_percent) || 0)),
          sort_order: i,
        }));

      await supabase.from("product_variants").delete().eq("product_id", productId);
      const allRows = validComboRows;
      if (allRows.length > 0) {
        const { error } = await supabase.from("product_variants").insert(allRows);
        if (error) throw error;
      }

      // Sync per-color variants
      await supabase.from("product_color_variants").delete().eq("product_id", productId);
      if (colorVariants.length > 0) {
        const rows = colorVariants
          .filter((c) => c.color_name.trim())
          .map((c, i) => ({
            product_id: productId,
            color_name: c.color_name.trim(),
            hex_code: c.hex_code || null,
            images: c.images ?? [],
            stock_quantity: Math.max(0, Number(c.stock_quantity) || 0),
            sku_code: c.sku_code?.trim() || null,
            sort_order: i,
          }));
        if (rows.length > 0) {
          const { error } = await supabase.from("product_color_variants").insert(rows);
          if (error) throw error;
        }
      }
      return productId;
    },
    onSuccess: (newId) => {
      draftProductIdRef.current = null;
      toast.success(isEdit ? "Product saved" : "Product created");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      nav("/admin/products");
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
    onSettled: () => {
      saveInFlightRef.current = false;
    },
  });

  const handleSave = () => {
    if (saveInFlightRef.current || save.isPending) return;
    saveInFlightRef.current = true;
    save.mutate(form);
  };

  const tabs = [
    { id: "general", label: "General", icon: Tag },
    { id: "media", label: "Media", icon: ImageIcon },
    { id: "pricing", label: "Pricing", icon: DollarSign },
    { id: "attributes", label: "Attributes", icon: Palette },
    { id: "seo", label: "SEO", icon: Globe },
    { id: "relationships", label: "Relationships", icon: Link2 },
    { id: "advanced", label: "Advanced", icon: Settings },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => nav("/admin/products")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center shadow-lg">
          <Package className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">{isEdit ? "Edit Product" : "Add New Product"}</h1>
          <p className="text-slate-500 text-sm">{isEdit ? "Update product details" : "Create a new product in your catalog"}</p>
        </div>
        <Button variant="outline" onClick={() => nav("/admin/products")}>Cancel</Button>
        <Button
          onClick={handleSave}
          disabled={save.isPending}
          className="bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:opacity-90 text-white"
        >
          {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Save changes" : "Create product"}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start bg-white border rounded-xl p-1 h-auto flex-wrap">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.id} value={t.id} className="data-[state=active]:bg-slate-100 data-[state=active]:shadow-sm gap-2 px-4 py-2.5">
                <Icon className="w-4 h-4" /> {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general" className="mt-4">
          <Card className="p-6 space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Basic Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Product Name" required>
                <div className="flex gap-2">
                  <Input placeholder="Enter product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  {form.images[0] && (
                    <button
                      type="button"
                      disabled={aiImageLoading}
                      onClick={() => analyzeImageWithAI(form.images[0])}
                      title="Regenerate name & description from the cover image"
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-3 rounded-md bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {aiImageLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "✨"} AI
                    </button>
                  )}
                </div>
              </Field>
              <Field label="Slug">
                <Input placeholder="product-slug" value={form.slug} onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: e.target.value }); }} />
              </Field>
              <Field label="SKU">
                <div className="relative">
                  <Input placeholder="Enter SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                  {form.sku && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {skuStatus === "checking" && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                      {skuStatus === "ok" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {skuStatus === "dup" && <AlertCircle className="w-4 h-4 text-red-500" />}
                    </div>
                  )}
                </div>
                {skuStatus === "dup" && <p className="text-xs text-red-500 mt-1">SKU already exists</p>}
              </Field>
              <Field label="SKU ID">
                <Input placeholder="e.g. TH-2025-001" value={form.sku_id} onChange={(e) => setForm({ ...form, sku_id: e.target.value })} />
              </Field>
              <Field label="Design number">
                <Input placeholder="e.g. D-1024" value={form.design_number} onChange={(e) => setForm({ ...form, design_number: e.target.value })} />
              </Field>
              <Field label="Brand">
                <Input placeholder={`e.g. ${site.brand.name}`} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
            </div>

            {/* Preorder + Size guide */}
            <PreorderAndGuideSection form={form} setForm={setForm} />

            {/* ───── Category Picker — Hierarchical Column Flow ───── */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {/* Header / Path Display */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Product Placement</h3>
                      <p className="text-xs text-slate-500">Define the hierarchy for this product in your storefront</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider rounded-full border border-red-100">
                    Required
                  </span>
                </div>

                <div className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-inner overflow-x-auto">
                  <span className="text-xs font-medium text-slate-400 shrink-0">Path:</span>
                  <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                    {parentId || subId || leafId ? (
                      <>
                        <span className="font-medium text-indigo-600">
                          {parentId
                            ? catById.get(parentId)?.name
                            : subId
                            ? catById.get(catById.get(subId)?.parent_id)?.name
                            : catById.get(catById.get(catById.get(leafId!)?.parent_id)?.parent_id)?.name}
                        </span>
                        {(subId || leafId) && (
                          <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                        {(subId || leafId) && (
                          <span className="font-medium text-indigo-600">
                            {subId ? catById.get(subId)?.name : catById.get(catById.get(leafId!)?.parent_id)?.name}
                          </span>
                        )}
                        {leafId ? (
                          <>
                            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="font-semibold text-indigo-700">{catById.get(leafId)?.name}</span>
                          </>
                        ) : subId ? (
                          <>
                            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="text-slate-400 italic">Select Specific Type…</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="text-slate-400 italic">Select Sub Category…</span>
                          </>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400 italic">No category chosen yet</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Selection Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 md:min-h-[400px]">
                {/* Column 1 — Main Category */}
                <div className="flex flex-col min-h-[280px]">
                  <div className="p-4 flex items-center justify-between border-b border-slate-50 bg-white">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">1. Main Category</span>
                    <CategoryQuickActions
                      levelLabel="Main Category"
                      selected={parentId ? (catById.get(parentId) as any) ?? null : null}
                      parentForNew={null}
                      onCreated={(c) => { setParentId(c.id); setSubId(null); setLeafId(null); setForm({ ...form, category_id: c.id }); }}
                      onDeleted={() => { setParentId(null); setSubId(null); setLeafId(null); setForm({ ...form, category_id: null }); }}
                    />
                  </div>
                  <div className="overflow-y-auto max-h-[350px] p-2 space-y-1">
                    {mainCats.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-6">No main categories. Use + to add one.</p>
                    )}
                    {mainCats.map((c: any) => {
                      const active = parentId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setParentId(c.id); setSubId(null); setLeafId(null); setForm({ ...form, category_id: c.id }); }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between group ${active ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-600 hover:bg-slate-50"}`}
                        >
                          <span className="truncate">{c.name}</span>
                          <svg className={`w-4 h-4 shrink-0 ${active ? "opacity-100 text-indigo-500" : "opacity-0 group-hover:opacity-100 text-slate-300"} transition-opacity`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2 — Sub Category */}
                <div className="flex flex-col min-h-[280px] bg-slate-50/30">
                  <div className="p-4 flex items-center justify-between border-b border-slate-50 bg-white">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">2. Sub Category</span>
                    <CategoryQuickActions
                      levelLabel="Subcategory"
                      selected={subId ? (catById.get(subId) as any) ?? null : null}
                      parentForNew={parentId}
                      onCreated={(c) => { setSubId(c.id); setLeafId(null); setForm({ ...form, category_id: c.id }); }}
                      onDeleted={() => { setSubId(null); setLeafId(null); setForm({ ...form, category_id: parentId }); }}
                    />
                  </div>
                  <div className="overflow-y-auto max-h-[350px] p-2 space-y-1">
                    {!parentId && (
                      <p className="text-xs text-slate-400 text-center py-6 italic">Pick a main category first</p>
                    )}
                    {parentId && subOfParent.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-6">No subcategories yet. Use + to add one.</p>
                    )}
                    {subOfParent.map((c: any) => {
                      const active = subId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSubId(c.id); setLeafId(null);
                            const inferredParent = c.parent_id ?? parentId;
                            if (!parentId && inferredParent) setParentId(inferredParent);
                            setForm({ ...form, category_id: c.id });
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between ${active ? "bg-indigo-50 text-indigo-700 font-medium border border-indigo-100" : "text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100"}`}
                        >
                          <span className="truncate">{c._label ?? c.name}</span>
                          {active && (
                            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Column 3 — Specific Type */}
                <div className="flex flex-col min-h-[280px]">
                  <div className="p-4 flex items-center justify-between border-b border-slate-50 bg-white">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      3. Specific Type <span className="lowercase font-normal text-slate-400">(optional)</span>
                    </span>
                    <CategoryQuickActions
                      levelLabel="Sub-subcategory"
                      selected={leafId ? (catById.get(leafId) as any) ?? null : null}
                      parentForNew={subId}
                      onCreated={(c) => { setLeafId(c.id); setForm({ ...form, category_id: c.id }); }}
                      onDeleted={() => { setLeafId(null); setForm({ ...form, category_id: subId ?? parentId }); }}
                    />
                  </div>
                  <div className="overflow-y-auto max-h-[350px] p-4">
                    {!subId && (
                      <p className="text-xs text-slate-400 text-center py-6 italic">Pick a subcategory first</p>
                    )}
                    {subId && leavesOfSub.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-6">No specific types. Leave empty or add one with +</p>
                    )}
                    <div className="grid gap-2">
                      {leavesOfSub.map((c: any) => {
                        const active = leafId === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setLeafId(c.id);
                              const inferredSub = c.parent_id ?? subId;
                              const inferredMain = inferredSub ? catById.get(inferredSub)?.parent_id ?? parentId : parentId;
                              if (!subId && inferredSub) setSubId(inferredSub);
                              if (!parentId && inferredMain) setParentId(inferredMain);
                              setForm({ ...form, category_id: c.id });
                            }}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all text-left ${active ? "border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200" : "border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30"}`}
                          >
                            <span className={`w-4 h-4 rounded-full border-2 grid place-items-center shrink-0 ${active ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-white"}`}>
                              {active && <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                            </span>
                            <span className={`text-sm font-medium truncate ${active ? "text-indigo-700" : "text-slate-700"}`}>{c._label ?? c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Pro Tip */}
              <div className="p-4 bg-amber-50 border-t border-amber-100">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <span className="font-bold uppercase">Pro Tip:</span> The deeper you go, the better. A product placed in <span className="font-bold underline decoration-amber-300">Banarasi Silk</span> automatically appears on the <span className="font-semibold">Silk Sarees</span> parent page too.
                  </p>
                </div>
              </div>
            </div>

            {/* ───── Also show this product in… ───── */}
            <div className="border rounded-2xl bg-white overflow-hidden shadow-sm">
              <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Also show this product in… <span className="text-xs font-normal text-slate-500">(optional)</span></h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Tick any extra categories or sub-categories where this product should also appear. The main placement above stays the same.
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                    {form.extra_category_ids.length} selected
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {(() => {
                  const primary = form.category_id;
                  const options = allCats
                    .filter((c) => c.id !== primary)
                    .map((c) => {
                      const chain: string[] = [];
                      let cur: any = c;
                      while (cur) { chain.unshift(cur.name); cur = cur.parent_id ? catById.get(cur.parent_id) : null; }
                      return { id: c.id as string, path: chain.join(" › "), root: chain[0] || "Other" };
                    })
                    .sort((a, b) => a.path.localeCompare(b.path));
                  return <ExtraCategoryPicker options={options} value={form.extra_category_ids}
                    onChange={(v) => setForm({ ...form, extra_category_ids: v })} />;
                })()}
                {form.extra_category_ids.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">Nothing selected yet — pick from the list above.</p>
                ) : (
                  <div>
                    <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 mb-1.5">Selected placements</div>
                    <div className="flex flex-wrap gap-1.5">
                      {form.extra_category_ids.map((cid) => {
                        const c = catById.get(cid);
                        if (!c) return null;
                        const chain: string[] = [];
                        let cur: any = c;
                        while (cur) { chain.unshift(cur.name); cur = cur.parent_id ? catById.get(cur.parent_id) : null; }
                        return (
                          <span key={cid} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {chain.join(" › ")}
                            <button type="button" aria-label="Remove" onClick={() => setForm({ ...form, extra_category_ids: form.extra_category_ids.filter((x) => x !== cid) })} className="hover:text-emerald-900 font-bold">×</button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>





            <Field label="Description">
              <div className="space-y-2">
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full min-h-[120px] rounded-md border p-3 text-sm" placeholder="Detailed product description…" />
                <button
                  type="button"
                  disabled={!form.name || aiDescLoading}
                  onClick={async () => {
                    if (!form.name.trim()) { toast.error("Enter a product name first"); return; }
                    setAiDescLoading(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("generate-product-description", {
                        body: { name: form.name },
                      });
                      if (error) throw error;
                      if (data?.description) {
                        setForm((f) => ({ ...f, description: data.description }));
                        toast.success("AI description generated");
                      } else {
                        toast.error(data?.error || "Couldn't generate description");
                      }
                    } catch (e: any) {
                      toast.error(e?.message || "AI generation failed");
                    } finally {
                      setAiDescLoading(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {aiDescLoading ? "Generating…" : "✨ Generate with AI"}
                </button>
              </div>
            </Field>

            <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
              <div className="text-xs text-slate-700">
                <div className="font-semibold text-slate-900">Auto-fill product details</div>
                <div>Generates Specifications, Care Instructions, Country of Origin & Disclaimer from the product name.</div>
              </div>
              <button
                type="button"
                disabled={!form.name || aiDescLoading}
                onClick={async () => {
                  if (!form.name.trim()) { toast.error("Enter a product name first"); return; }
                  setAiDescLoading(true);
                  const tId = toast.loading("✨ Generating product details…");
                  try {
                    const { data, error } = await supabase.functions.invoke("generate-product-description", {
                      body: { name: form.name, mode: "details" },
                    });
                    if (error) throw error;
                    if (data?.error) throw new Error(data.error);
                    setForm((f) => ({
                      ...f,
                      specifications: Array.isArray(data.specifications) && data.specifications.length ? data.specifications : (f as any).specifications,
                      care_instructions: Array.isArray(data.care_instructions) && data.care_instructions.length ? data.care_instructions : (f as any).care_instructions,
                      country_of_origin: data.country_of_origin || (f as any).country_of_origin,
                      disclaimer: data.disclaimer || (f as any).disclaimer,
                    } as any));
                    toast.success("Details generated — review and save", { id: tId });
                  } catch (e: any) {
                    toast.error(e?.message || "AI generation failed", { id: tId });
                  } finally {
                    setAiDescLoading(false);
                  }
                }}
                className="shrink-0 inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {aiDescLoading ? "Generating…" : "✨ Generate with AI"}
              </button>
            </div>

            <Field label="Specifications" hint="One per line, format: Label: Value (e.g. “Material: Silk blend”). Shown as bullets on the product page.">

              <textarea
                value={((form as any).specifications ?? [])
                  .map((s: any) => `${s.label}: ${s.value}`)
                  .join("\n")}
                onChange={(e) => {
                  const specs = e.target.value
                    .split("\n")
                    .map((ln) => {
                      const idx = ln.indexOf(":");
                      if (idx === -1) return null;
                      const label = ln.slice(0, idx).trim();
                      const value = ln.slice(idx + 1).trim();
                      return label && value ? { label, value } : null;
                    })
                    .filter(Boolean);
                  setForm({ ...form, specifications: specs } as any);
                }}
                className="w-full min-h-[140px] rounded-md border p-3 text-sm font-mono"
                placeholder={"Fabric: Pure Katan Silk\nWeave: Banarasi Handloom\nSaree Length: 5.5 m\nBlouse Piece: 0.8 m (unstitched)"}
              />
            </Field>

            <Field label="Care Instructions" hint="One instruction per line.">
              <textarea
                value={((form as any).care_instructions ?? []).join("\n")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    care_instructions: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                  } as any)
                }
                className="w-full min-h-[100px] rounded-md border p-3 text-sm"
                placeholder={"Dry clean only to protect the zari\nStore folded in a muslin cloth, away from direct sunlight"}
              />
            </Field>

            <Field label="Country of Origin">
              <input
                value={(form as any).country_of_origin ?? ""}
                onChange={(e) => setForm({ ...form, country_of_origin: e.target.value } as any)}
                className="w-full h-10 rounded-md border px-3 text-sm"
                placeholder="India"
              />
            </Field>

            <Field label="Disclaimer" hint="Shown at the bottom of the product page. Leave blank to use the default AI-model + color-variation disclaimer.">
              <textarea
                value={(form as any).disclaimer ?? ""}
                onChange={(e) => setForm({ ...form, disclaimer: e.target.value } as any)}
                className="w-full min-h-[100px] rounded-md border p-3 text-sm"
                placeholder={"Being handwoven, slight irregularities in the weave are a hallmark of handloom. Colours may vary slightly due to lighting or your screen settings."}
              />
            </Field>

          </Card>
        </TabsContent>


        {/* PRICING */}
        <TabsContent value="pricing" className="mt-4">
          <Card className="p-6 space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Pricing & Inventory</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Base price (₹)">
                <Input type="number" step="any" value={form.price ?? ""} onChange={(e) => setForm({ ...form, price: e.target.value ? Number(e.target.value) : 0 })} />
              </Field>
              <Field label="MRP / Compare-at (₹)">
                <Input type="number" step="any" value={form.compare_at_price ?? ""} onChange={(e) => setForm({ ...form, compare_at_price: e.target.value ? Number(e.target.value) : null })} />
              </Field>
              <Field label="Total stock (fallback)">
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
              </Field>
            </div>
            <p className="text-xs text-slate-500 -mt-2">
              Base price is used when a variant doesn't have its own price set. Per-size/color prices in the matrix below override this.
            </p>
            {form.compare_at_price && form.compare_at_price > form.price && form.price > 0 && (
              <div className="rounded-lg bg-emerald-50 text-emerald-700 px-4 py-2 text-sm">
                💰 Discount: {Math.round(((form.compare_at_price - form.price) / form.compare_at_price) * 100)}% off
              </div>
            )}

            <div className="pt-4 border-t rounded-lg bg-violet-50/40 border-violet-100 px-4 py-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Advanced variants</h3>
                  <p className="text-xs text-slate-500">Use the Attributes tab to set price, stock and SKU for every Size × Color combination.</p>
                </div>
                <button type="button" onClick={() => setTab("attributes")} className="text-xs font-semibold text-violet-600 hover:underline">
                  Open Size × Color matrix →
                </button>
              </div>
            </div>

            {/* Live summary of Color × Size × Price from the matrix */}
            {comboVariants.length > 0 && (
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h3 className="text-lg font-bold text-slate-900">Variant pricing summary</h3>
                  <span className="text-xs text-slate-500">
                    {comboVariants.length} SKU{comboVariants.length === 1 ? "" : "s"} · auto-synced from Attributes
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {colorVariants.map((cv) => {
                    const rows = comboVariants.filter((v) => v.color_name === cv.color_name);
                    if (rows.length === 0) return null;
                    const img =
                      resolveImage(cv.images?.[0]) ||
                      resolveImage(form.images?.[0]) ||
                      "";
                    const colorTotalStock = rows.reduce((s, v) => s + (Number(v.stock_quantity) || 0), 0);
                    return (
                      <div key={cv.color_name} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50/70 border-b">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 ring-1 ring-slate-200">
                            {img ? (
                              <img src={img} alt={cv.color_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full grid place-items-center text-[10px] text-slate-400">
                                No img
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3.5 h-3.5 rounded-full ring-1 ring-white shadow-sm"
                                style={{ backgroundColor: cv.hex_code || "#cccccc" }}
                              />
                              <span className="text-sm font-semibold text-slate-800 truncate">{cv.color_name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {rows.length} size{rows.length === 1 ? "" : "s"} · stock {colorTotalStock}
                            </div>
                          </div>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {rows.map((r) => {
                            const oos = Number(r.stock_quantity) <= 0;
                            const price = r.variant_price ?? form.price;
                            return (
                              <div
                                key={`${r.color_name}-${r.size}`}
                                className={`flex items-center justify-between gap-2 px-3 py-2 text-xs ${
                                  oos ? "bg-amber-50/40" : ""
                                }`}
                              >
                                <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-full bg-violet-600 text-white font-bold">
                                  {r.size}
                                </span>
                                <span className="font-mono text-[10px] text-slate-500 truncate flex-1">
                                  {r.sku_code || "—"}
                                </span>
                                <span className="text-slate-600">
                                  stk <strong className={oos ? "text-amber-700" : "text-slate-800"}>{r.stock_quantity}</strong>
                                </span>
                                <span className="font-bold text-violet-700">₹{price || 0}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>


        {/* ATTRIBUTES */}
        <TabsContent value="attributes" className="mt-4">
          <Card className="p-6 space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Variants & Attributes</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Occasion">
                <Input list="occasion-suggestions" value={form.collection} onChange={(e) => setForm({ ...form, collection: e.target.value })} placeholder="Wedding, Festive, Party, Office Wear, Daily Wear" />
                <datalist id="occasion-suggestions">
                  {["Wedding", "Festive", "Party", "Office Wear", "Daily Wear"].map((o) => <option key={o} value={o} />)}
                </datalist>
              </Field>
              <Field label="Sizes">
                <SizePicker value={form.sizes} onChange={(sizes) => setForm({ ...form, sizes })} />
              </Field>
              <Field label="Tags (comma-separated)">
                <Input value={joinCsv(form.tags)} onChange={(e) => setForm({ ...form, tags: splitCsv(e.target.value) })} placeholder="zari, handloom, pure silk" />
              </Field>
            </div>

            <div className="pt-4 border-t">
              <div className="mb-3">
                <h3 className="text-lg font-bold text-slate-900">Color variants</h3>
                <p className="text-xs text-slate-500">
                  Pick from the palette, use the color picker for custom shades, and upload images for each color.
                  Customers will swap the gallery by clicking a swatch.
                </p>
              </div>
              <ColorVariantManager
                baseSku={form.sku}
                variants={colorVariants}
                onChange={setColorVariants}
                mediaImages={form.images}
                onFirstVariantImage={(url) => {
                  // Auto-fill product name & description from the first color-variant image,
                  // but only if admin hasn't typed anything yet (so name stays the same across all colors).
                  if (!form.name.trim() && !form.description.trim() && form.images.length === 0) {
                    analyzeImageWithAI(url);
                  }
                }}
              />
            </div>

            {/* Combined Size × Color matrix — Flipkart/Amazon-style per-combo stock & price */}
            <div className="pt-4 border-t">
              <div className="mb-3 flex items-baseline justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Color × Size matrix (price &amp; stock)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set a different <strong>price</strong> and <strong>stock</strong> for every
                    Color &amp; Size combination. The storefront uses these to auto-update price,
                    cap the quantity selector, and disable out-of-stock combos.
                  </p>
                </div>
              </div>
              <SizeColorMatrix
                sizes={form.sizes}
                colors={colorVariants.map((c) => ({
                  color_name: c.color_name,
                  hex_code: c.hex_code,
                }))}
                basePrice={form.price}
                baseSku={form.sku}
                variants={comboVariants}
                onChange={setComboVariants}
                onSizesChange={(sizes) => setForm({ ...form, sizes })}
                onColorsChange={(next) => {
                  // Merge edits/additions/removals back into the rich colorVariants list
                  const byName = new Map(colorVariants.map((c) => [c.color_name, c]));
                  const merged = next.map(
                    (n) =>
                      byName.get(n.color_name) ?? {
                        color_name: n.color_name,
                        hex_code: n.hex_code,
                        images: [],
                        stock_quantity: 0,
                        sku_code: "",
                      },
                  ).map((c) => {
                    const updated = next.find((n) => n.color_name === c.color_name);
                    return updated ? { ...c, hex_code: updated.hex_code } : c;
                  });
                  setColorVariants(merged);
                }}
              />
            </div>
          </Card>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="mt-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900">SEO Metadata</h2>
              <button
                type="button"
                disabled={!form.name || aiDescLoading}
                onClick={async () => {
                  if (!form.name.trim()) { toast.error("Enter a product name first"); return; }
                  setAiDescLoading(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("generate-product-description", {
                      body: { name: form.name, mode: "seo" },
                    });
                    if (error) throw error;
                    if (data?.seo_title || data?.seo_description) {
                      setForm((f) => ({ ...f, seo_title: data.seo_title ?? f.seo_title, seo_description: data.seo_description ?? f.seo_description }));
                      toast.success("AI SEO metadata generated");
                    } else {
                      toast.error(data?.error || "Couldn't generate SEO");
                    }
                  } catch (e: any) {
                    toast.error(e?.message || "AI generation failed");
                  } finally {
                    setAiDescLoading(false);
                  }
                }}
                className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {aiDescLoading ? "Generating…" : "✨ Generate with AI"}
              </button>
            </div>
            <Field label="SEO Title">
              <Input maxLength={60} value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} placeholder="Optimized title for search engines" />
              <p className="text-xs text-slate-400 mt-1">{form.seo_title.length}/60</p>
            </Field>
            <Field label="SEO Description">
              <textarea maxLength={160} value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} className="w-full min-h-[80px] rounded-md border p-3 text-sm" placeholder="Description shown in search results" />
              <p className="text-xs text-slate-400 mt-1">{form.seo_description.length}/160</p>
            </Field>
          </Card>
        </TabsContent>

        {/* MEDIA */}
        <TabsContent value="media" className="mt-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Product Images</h2>
                <p className="text-sm text-slate-500">Drag to reorder. First image is the cover.</p>
              </div>
              <div className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-fuchsia-50 to-violet-50 text-violet-700 border border-violet-100 font-medium">
                ✨ Upload your first image — AI will auto-fill the product name & description
              </div>
            </div>
            {aiImageLoading && (
              <div className="flex items-center gap-2 text-sm text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                AI is analyzing the image to generate name & description…
              </div>
            )}
            <ImageUploader
              value={form.images}
              onChange={(urls) => {
                const prev = form.images;
                setForm({ ...form, images: urls });
                // Trigger AI when the first image is added (and name is empty so we don't overwrite manual edits)
                if (urls.length > prev.length && prev.length === 0 && urls[0]) {
                  if (!form.name.trim() && !form.description.trim()) {
                    analyzeImageWithAI(urls[0]);
                  }
                }
              }}
            />
          </Card>
        </TabsContent>

        {/* RELATIONSHIPS */}
        <TabsContent value="relationships" className="mt-4">
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Homepage Visibility & Section Assignment</h2>
            <p className="text-sm text-slate-500">Choose exactly where this product appears on the homepage. Selections sync live to the storefront.</p>

            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Homepage Sections (multi-select)</h3>
              <div className="flex flex-wrap gap-2">
                {SECTIONS.map((s) => {
                  const active = form.section_keys.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          section_keys: active ? form.section_keys.filter((k) => k !== s.key) : [...form.section_keys, s.key],
                        })
                      }
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                        active ? "bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white border-transparent shadow" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {active && "✓ "}{s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Live Storefront Preview
              </h3>
              {form.section_keys.length === 0 ? (
                <div className="text-sm text-slate-400 p-6 border rounded-xl bg-slate-50 text-center">
                  Select at least one section to preview how this product appears on the homepage.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {form.section_keys.map((k) => {
                    const meta = SECTIONS.find((s) => s.key === k);
                    const img = resolveImage(form.images?.[0]);
                    return (
                      <div key={k} className="rounded-2xl border overflow-hidden bg-white shadow-sm">
                        <div className="px-3 py-2 bg-gradient-to-r from-fuchsia-500/10 to-violet-500/10 border-b">
                          <div className="text-[10px] uppercase tracking-wider text-violet-700 font-bold">{meta?.label}</div>
                        </div>
                        <div className="aspect-square bg-muted overflow-hidden">
                          {img ? (
                            <img src={img} alt={form.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <ImageIcon className="w-10 h-10" />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="text-sm font-semibold text-slate-900 truncate">{form.name || "Untitled product"}</div>
                          <div className="text-sm text-violet-700 font-bold">₹{form.price || 0}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ADVANCED */}
        <TabsContent value="advanced" className="mt-4">
          <Card className="p-6 space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Homepage Visibility Flags</h2>
            <p className="text-sm text-slate-500">Toggle quick-flags that control where this product surfaces automatically.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Toggle checked={form.show_on_homepage} onChange={(v) => setForm({ ...form, show_on_homepage: v })} label="Show on Homepage" />
              <Toggle checked={form.is_featured} onChange={(v) => setForm({ ...form, is_featured: v })} label="Featured Product" />
              <Toggle checked={form.is_trending} onChange={(v) => setForm({ ...form, is_trending: v })} label="Trending Product" />
              <Toggle checked={form.is_new} onChange={(v) => setForm({ ...form, is_new: v })} label="New Arrival" />
              <Toggle
                checked={form.section_keys.includes("recently-viewed")}
                onChange={(v) => setForm({
                  ...form,
                  section_keys: v
                    ? Array.from(new Set([...form.section_keys, "recently-viewed"]))
                    : form.section_keys.filter((k) => k !== "recently-viewed"),
                })}
                label="Recently Viewed Eligible"
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Field = ({ label, required, children }: any) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-slate-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label className="flex items-center gap-2 text-sm cursor-pointer p-3 rounded-lg border border-slate-200 hover:border-slate-300">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-violet-600" />
    <span className="text-slate-700 font-medium">{label}</span>
  </label>
);

const SIZE_PRESETS: { group: string; sizes: string[] }[] = [
  { group: "Saree", sizes: ["Free Size"] },
  { group: "Blouse (bust, inches)", sizes: ["32", "34", "36", "38", "40", "42", "44"] },
  { group: "Standard", sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"] },
];

const SizePicker = ({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) => {
  const [custom, setCustom] = useState("");
  const selected = new Set(value);
  const toggle = (s: string) => {
    const next = new Set(selected);
    next.has(s) ? next.delete(s) : next.add(s);
    onChange(Array.from(next));
  };
  const addCustom = () => {
    const s = custom.trim();
    if (!s) return;
    if (!selected.has(s)) onChange([...value, s]);
    setCustom("");
  };
  const removeOne = (s: string) => onChange(value.filter((x) => x !== s));

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3 bg-slate-50">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200">
          {value.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-600 text-white text-xs font-semibold">
              {s}
              <button type="button" onClick={() => removeOne(s)} className="hover:bg-white/20 rounded-full w-4 h-4 leading-none">×</button>
            </span>
          ))}
        </div>
      )}
      {SIZE_PRESETS.map((g) => {
        const groupSelected = g.sizes.filter((s) => selected.has(s)).length;
        const allOn = groupSelected === g.sizes.length;
        const toggleAll = () => {
          const next = new Set(selected);
          if (allOn) g.sizes.forEach((s) => next.delete(s));
          else g.sizes.forEach((s) => next.add(s));
          onChange(Array.from(next));
        };
        return (
          <div key={g.group}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {g.group}{" "}
                <span className="text-slate-400 normal-case font-normal">
                  ({groupSelected}/{g.sizes.length})
                </span>
              </p>
              <button
                type="button"
                onClick={toggleAll}
                className="text-[11px] font-semibold text-violet-600 hover:text-violet-700 hover:underline"
              >
                {allOn ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {g.sizes.map((s) => {
                const active = selected.has(s);
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => toggle(s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition ${
                      active
                        ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                        : "bg-white border-slate-300 text-slate-700 hover:border-violet-400"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex gap-2 pt-1">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          placeholder="Add custom size and press Enter"
          className="h-9 text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={addCustom}>Add</Button>
      </div>
      <p className="text-[11px] text-slate-500">Click sizes to select multiple. Customers will see each as a separate option.</p>
    </div>
  );
};

type PreorderProps = { form: ProductForm; setForm: (f: ProductForm) => void };
const PreorderAndGuideSection = ({ form, setForm }: PreorderProps) => {
  const guides = useQuery({
    queryKey: ["size-guides-picker"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("size_guides").select("id, brand, title").order("brand");
      return (data ?? []) as { id: string; brand: string; title: string }[];
    },
  });
  return (
    <div className="mt-4 grid md:grid-cols-2 gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Availability &amp; Preorder</h3>
          <label className="inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={form.preorder_enabled}
              onChange={(e) => setForm({ ...form, preorder_enabled: e.target.checked, preorder_status: e.target.checked ? "preorder" : "in_stock" })}
            />
            Enable preorder
          </label>
        </div>
        <label className="text-xs font-semibold text-slate-600 block">Product status</label>
        <select
          value={form.preorder_status}
          onChange={(e) => setForm({ ...form, preorder_status: e.target.value as ProductForm["preorder_status"] })}
          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="in_stock">Normal (In stock)</option>
          <option value="out_of_stock">Out of stock</option>
          <option value="coming_soon">Coming soon</option>
          <option value="preorder">Preorder available</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Stock will be available in (days)</label>
            <Input
              type="number"
              min={0}
              value={(() => {
                const d = form.preorder_available_date;
                if (!d) return "";
                const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
                return diff > 0 ? String(diff) : "";
              })()}
              onChange={(e) => {
                const n = e.target.value ? Number(e.target.value) : null;
                if (!n || n <= 0) {
                  setForm({ ...form, preorder_available_date: "" });
                } else {
                  const dt = new Date();
                  dt.setDate(dt.getDate() + n);
                  setForm({ ...form, preorder_available_date: dt.toISOString().slice(0, 10) });
                }
              }}
              placeholder="e.g. 7"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Preorder stock limit</label>
            <Input
              type="number"
              min={0}
              value={form.preorder_stock_limit ?? ""}
              onChange={(e) => setForm({ ...form, preorder_stock_limit: e.target.value ? Number(e.target.value) : null })}
              placeholder="Unlimited"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Preorder message</label>
          <textarea
            value={form.preorder_message ?? ""}
            onChange={(e) => setForm({ ...form, preorder_message: e.target.value })}
            className="w-full min-h-[70px] rounded-md border p-3 text-sm"
            placeholder="Shown on the product page (e.g. Ships by 30 Aug — advance booking)"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h3 className="font-bold text-slate-900">Brand size guide</h3>
        <p className="text-xs text-slate-500">Pick which brand's size chart to show on this product's page.</p>
        <select
          value={form.size_guide_id ?? ""}
          onChange={(e) => setForm({ ...form, size_guide_id: e.target.value || null })}
          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">— None (use default blouse size chart) —</option>
          {(guides.data ?? []).map((g) => (
            <option key={g.id} value={g.id}>{g.brand} · {g.title}</option>
          ))}
        </select>
        <p className="text-[11px] text-slate-500">
          Manage size guides in <a href="/admin/size-guides" className="text-violet-600 underline">Admin → Size Guides</a>.
        </p>
      </div>
    </div>
  );
};


export default AdminProductForm;
