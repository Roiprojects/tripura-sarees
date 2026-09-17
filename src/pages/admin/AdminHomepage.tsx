import { resolveImage } from "@/lib/resolveImage";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/admin/ImageUploader";
import {
  Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Loader2, ChevronDown, ChevronRight,
  Image as ImageIcon, Package, Tag, Settings as SettingsIcon, X,
} from "lucide-react";
import { toast } from "sonner";
import { GroupImagesEditor, GroupImagesStrip } from "@/components/admin/GroupImagesEditor";

// ─────────────────────────────────────────────────────────────────────────────
// Types
type Section = {
  id: string; key: string; title: string; subtitle: string | null;
  type: string; layout: string; device: string;
  sort_order: number; visible: boolean;
  image_url: string | null; cta_label: string | null; cta_url: string | null;
  bg_color: string | null; config: any;
};
type Banner = {
  id: string; section_id: string | null; title: string | null; subtitle: string | null;
  image_desktop: string | null; image_mobile: string | null;
  cta_label: string | null; cta_url: string | null;
  sort_order: number; visible: boolean;
};

const SECTION_TYPES = [
  "hero", "marquee", "tiles", "categories", "occasions",
  "product_grid", "featured_grid", "collections", "recently_viewed", "trust_bar",
  "banner", "newsletter",
];
const LAYOUTS = ["carousel", "grid", "banner", "tiles"];
const DEVICES = ["all", "desktop", "mobile"];

// ─────────────────────────────────────────────────────────────────────────────
// Section editor dialog
const SectionDialog = ({
  open, onOpenChange, initial, onSaved,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  initial: Partial<Section> | null;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState<any>(() => initial ?? {});
  const isNew = !initial?.id;

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        key: form.key, title: form.title, subtitle: form.subtitle ?? null,
        type: form.type ?? "product_grid", layout: form.layout ?? "carousel",
        device: form.device ?? "all", sort_order: Number(form.sort_order ?? 0),
        visible: !!form.visible,
        image_url: form.image_url ?? null,
        cta_label: form.cta_label ?? null, cta_url: form.cta_url ?? null,
        bg_color: form.bg_color ?? null,
        config: form.config ?? {},
      };
      if (isNew) {
        const { error } = await supabase.from("homepage_sections").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("homepage_sections").update(payload).eq("id", initial!.id!);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(isNew ? "Section created" : "Section updated"); onSaved(); onOpenChange(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const setF = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isNew ? "Add new section" : "Edit section"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title *"><Input value={form.title ?? ""} onChange={(e) => setF("title", e.target.value)} /></Field>
            <Field label="Key (unique) *"><Input value={form.key ?? ""} onChange={(e) => setF("key", e.target.value)} placeholder="hero, party-wear, …" /></Field>
          </div>
          <Field label="Subtitle"><Input value={form.subtitle ?? ""} onChange={(e) => setF("subtitle", e.target.value)} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Type"><Select value={form.type ?? "product_grid"} onChange={(v) => setF("type", v)} options={SECTION_TYPES} /></Field>
            <Field label="Layout"><Select value={form.layout ?? "carousel"} onChange={(v) => setF("layout", v)} options={LAYOUTS} /></Field>
            <Field label="Device"><Select value={form.device ?? "all"} onChange={(v) => setF("device", v)} options={DEVICES} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sort order"><Input type="number" value={form.sort_order ?? 0} onChange={(e) => setF("sort_order", e.target.value)} /></Field>
            <Field label="Background color (hex/hsl)"><Input value={form.bg_color ?? ""} onChange={(e) => setF("bg_color", e.target.value)} placeholder="#fff or hsl(...)" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA label"><Input value={form.cta_label ?? ""} onChange={(e) => setF("cta_label", e.target.value)} /></Field>
            <Field label="CTA URL"><Input value={form.cta_url ?? ""} onChange={(e) => setF("cta_url", e.target.value)} placeholder="/shop?style=ethnic" /></Field>
          </div>
          <Field label="Hero / banner image">
            <ImageUploader
              value={form.image_url ? [form.image_url] : []}
              onChange={(arr) => setF("image_url", arr[0] ?? null)}
              bucket="homepage-media"
              multi={false}
            />
          </Field>
          {(form.key === "sale-banner" || form.type === "banner") && (
            <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Promo banner options</div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Eyebrow">
                  <Input
                    value={form.config?.eyebrow ?? ""}
                    onChange={(e) => setF("config", { ...(form.config ?? {}), eyebrow: e.target.value })}
                    placeholder="Special Offer"
                  />
                </Field>
                <Field label="Badge label">
                  <Input
                    value={form.config?.badge_label ?? ""}
                    onChange={(e) => setF("config", { ...(form.config ?? {}), badge_label: e.target.value })}
                    placeholder="Hot Deal"
                  />
                </Field>
                <Field label="Ends on (auto countdown)">
                  <Input
                    type="date"
                    value={form.config?.ends_at ?? ""}
                    onChange={(e) => setF("config", { ...(form.config ?? {}), ends_at: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          )}
          <label className="flex items-center gap-3 pt-2">
            <Switch checked={!!form.visible} onCheckedChange={(v) => setF("visible", v)} />
            <span className="text-sm font-medium">Visible on homepage</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Banners panel for a section
const BannersPanel = ({ sectionId }: { sectionId: string }) => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Banner> | null>(null);

  const { data: banners = [] } = useQuery({
    queryKey: ["section-banners", sectionId],
    queryFn: async () => {
      const { data, error } = await supabase.from("homepage_banners").select("*")
        .eq("section_id", sectionId).order("sort_order");
      if (error) throw error;
      return data as Banner[];
    },
  });

  const save = useMutation({
    mutationFn: async (b: Partial<Banner>) => {
      const payload = { ...b, section_id: sectionId };
      delete (payload as any).id;
      if (b.id) {
        const { error } = await supabase.from("homepage_banners").update(payload).eq("id", b.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("homepage_banners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["section-banners", sectionId] }); qc.invalidateQueries({ queryKey: ["public-banners"] }); setEditing(null); toast.success("Banner saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homepage_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["section-banners", sectionId] }); toast.success("Deleted"); },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Banners ({banners.length})</div>
        <Button size="sm" onClick={() => setEditing({ visible: true, sort_order: banners.length })}>
          <Plus className="w-3 h-3 mr-1" /> Add banner
        </Button>
      </div>
      {banners.length === 0 ? (
        <div className="text-xs text-muted-foreground p-3 border border-dashed rounded">No banners yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {banners.map((b) => (
            <Card key={b.id} className="p-3 flex gap-3">
              <div className="w-24 h-16 rounded overflow-hidden bg-muted shrink-0">
                {b.image_desktop ? <img src={resolveImage(b.image_desktop)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon className="w-4 h-4" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{b.title || "Untitled"}</div>
                <div className="text-xs text-muted-foreground truncate">{b.cta_url || "—"}</div>
                <div className="flex gap-1 mt-1.5">
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(b)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { if (confirm("Delete banner?")) del.mutate(b.id); }}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing.id ? "Edit banner" : "New banner"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Field label="Title"><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
              <Field label="Subtitle"><Input value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></Field>
              <Field label="Desktop image">
                <ImageUploader value={editing.image_desktop ? [editing.image_desktop] : []} onChange={(a) => setEditing({ ...editing, image_desktop: a[0] ?? null })} bucket="homepage-media" multi={false} />
              </Field>
              <Field label="Mobile image (optional)">
                <ImageUploader value={editing.image_mobile ? [editing.image_mobile] : []} onChange={(a) => setEditing({ ...editing, image_mobile: a[0] ?? null })} bucket="homepage-media" multi={false} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CTA label"><Input value={editing.cta_label ?? ""} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} /></Field>
                <Field label="CTA URL"><Input value={editing.cta_url ?? ""} onChange={(e) => setEditing({ ...editing, cta_url: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sort order"><Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field>
                <label className="flex items-center gap-2 pt-7">
                  <Switch checked={!!editing.visible} onCheckedChange={(v) => setEditing({ ...editing, visible: v })} />
                  <span className="text-sm">Visible</span>
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => save.mutate(editing)} disabled={save.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Products panel
const ProductsPanel = ({ sectionId }: { sectionId: string }) => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: linked = [] } = useQuery({
    queryKey: ["section-products-admin", sectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("section_products")
        .select("id, sort_order, product:products(id,name,images,price)")
        .eq("section_id", sectionId)
        .order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: results = [] } = useQuery({
    queryKey: ["product-search", search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const { data, error } = await supabase.from("products").select("id,name,images,price")
        .ilike("name", `%${search}%`).limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: search.length > 1,
  });

  const linkedIds = new Set(linked.map((l) => l.product?.id));

  const add = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from("section_products").insert({
        section_id: sectionId, product_id: productId, sort_order: linked.length,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["section-products-admin", sectionId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("section_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["section-products-admin", sectionId] }),
  });

  const move = useMutation({
    mutationFn: async ({ id, sort_order }: { id: string; sort_order: number }) => {
      const { error } = await supabase.from("section_products").update({ sort_order }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["section-products-admin", sectionId] }),
  });

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">Products in this section ({linked.length})</div>
      <div className="relative">
        <Input placeholder="Search to add product…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && results.length > 0 && (
          <Card className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto">
            {results.map((p: any) => (
              <button
                key={p.id}
                disabled={linkedIds.has(p.id)}
                onClick={() => { add.mutate(p.id); setSearch(""); }}
                className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left disabled:opacity-40"
              >
                {p.images?.[0] && <img src={resolveImage(p.images[0])} className="w-8 h-8 rounded object-cover" />}
                <span className="text-sm flex-1 truncate">{p.name}</span>
                {linkedIds.has(p.id) ? <span className="text-xs text-muted-foreground">added</span> : <Plus className="w-3 h-3" />}
              </button>
            ))}
          </Card>
        )}
      </div>
      {linked.length === 0 ? (
        <div className="text-xs text-muted-foreground p-3 border border-dashed rounded">
          No products manually linked. Section will fall back to its category/collection rules.
        </div>
      ) : (
        <div className="space-y-1.5">
          {linked.map((row: any, i: number) => (
            <div key={row.id} className="flex items-center gap-2 p-2 border rounded">
              {row.product?.images?.[0] && <img src={resolveImage(row.product.images[0])} onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }} className="w-10 h-10 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{row.product?.name}</div>
                <div className="text-xs text-muted-foreground">₹{row.product?.price}</div>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={i === 0}
                onClick={() => move.mutate({ id: row.id, sort_order: row.sort_order - 1 })}><ArrowUp className="w-3 h-3" /></Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={i === linked.length - 1}
                onClick={() => move.mutate({ id: row.id, sort_order: row.sort_order + 1 })}><ArrowDown className="w-3 h-3" /></Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => remove.mutate(row.id)}><X className="w-3 h-3 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Categories panel
const CategoriesPanel = ({ sectionId }: { sectionId: string }) => {
  const qc = useQueryClient();
  const { data: cats = [] } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name,slug").order("name");
      return data ?? [];
    },
  });
  const { data: linked = [] } = useQuery({
    queryKey: ["section-categories-admin", sectionId],
    queryFn: async () => {
      const { data } = await supabase.from("section_categories").select("id,category_id").eq("section_id", sectionId);
      return data ?? [];
    },
  });
  const linkedIds = new Set(linked.map((l: any) => l.category_id));
  const toggle = useMutation({
    mutationFn: async (catId: string) => {
      const existing = linked.find((l: any) => l.category_id === catId);
      if (existing) {
        const { error } = await supabase.from("section_categories").delete().eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("section_categories").insert({ section_id: sectionId, category_id: catId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["section-categories-admin", sectionId] }),
  });
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">Categories shown in this section</div>
      <div className="flex flex-wrap gap-1.5">
        {cats.length === 0 && <span className="text-xs text-muted-foreground">No categories yet.</span>}
        {cats.map((c: any) => {
          const on = linkedIds.has(c.id);
          return (
            <button key={c.id} onClick={() => toggle.mutate(c.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}>
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Section row
const SectionRow = ({ section, onEdit, onDelete, onMove, onToggle }: any) => {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className="flex flex-col">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onMove(-1)}><ArrowUp className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onMove(1)}><ArrowDown className="w-3 h-3" /></Button>
        </div>
        <div className="w-14 h-14 rounded bg-muted overflow-hidden shrink-0">
          {section.image_url ? <img src={resolveImage(section.image_url)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon className="w-5 h-5" /></div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{section.title}</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted">{section.type}</span>
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted">{section.device}</span>
          </div>
          <div className="text-xs text-muted-foreground">key: {section.key} · order: {section.sort_order}</div>
        </div>
        <GroupImagesStrip groupKey={section.key} />
        <Button size="sm" variant="ghost" onClick={() => onToggle(!section.visible)}>
          {section.visible ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(!open)}>
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="w-4 h-4" /></Button>
        <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="w-4 h-4 text-destructive" /></Button>
      </div>
      {open && (
        <div className="border-t p-4 bg-muted/30">
          <Tabs defaultValue="images">
            <TabsList>
              <TabsTrigger value="images"><ImageIcon className="w-3 h-3 mr-1" /> Images</TabsTrigger>
              <TabsTrigger value="banners">Banners (legacy)</TabsTrigger>
              <TabsTrigger value="products"><Package className="w-3 h-3 mr-1" /> Products</TabsTrigger>
              <TabsTrigger value="categories"><Tag className="w-3 h-3 mr-1" /> Categories</TabsTrigger>
            </TabsList>
            <TabsContent value="images"><GroupImagesEditor groupKey={section.key} label={section.title} /></TabsContent>
            <TabsContent value="banners"><BannersPanel sectionId={section.id} /></TabsContent>
            <TabsContent value="products"><ProductsPanel sectionId={section.id} /></TabsContent>
            <TabsContent value="categories"><CategoriesPanel sectionId={section.id} /></TabsContent>
          </Tabs>
        </div>
      )}
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Settings tab
const SettingsTab = () => {
  const qc = useQueryClient();
  const { data: row } = useQuery({
    queryKey: ["homepage-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("homepage_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });
  const [form, setForm] = useState<any>({});
  const merged = { ...(row ?? {}), ...form };
  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, updated_at: new Date().toISOString() };
      const { error } = row
        ? await supabase.from("homepage_settings").update(payload).eq("id", row.id)
        : await supabase.from("homepage_settings").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["homepage-settings"] }); toast.success("Settings saved"); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Card className="p-5 max-w-xl space-y-3">
      <Field label="Site title"><Input value={merged.site_title ?? ""} onChange={(e) => setForm({ ...form, site_title: e.target.value })} /></Field>
      <Field label="Hero autoplay (ms)"><Input type="number" value={merged.hero_autoplay_ms ?? 5000} onChange={(e) => setForm({ ...form, hero_autoplay_ms: Number(e.target.value) })} /></Field>
      <Field label="Mobile breakpoint (px)"><Input type="number" value={merged.mobile_breakpoint ?? 768} onChange={(e) => setForm({ ...form, mobile_breakpoint: Number(e.target.value) })} /></Field>
      <Field label="Default CTA color"><Input value={merged.default_cta_color ?? ""} onChange={(e) => setForm({ ...form, default_cta_color: e.target.value })} /></Field>
      <label className="flex items-center gap-3">
        <Switch checked={!!merged.maintenance_mode} onCheckedChange={(v) => setForm({ ...form, maintenance_mode: v })} />
        <span className="text-sm font-medium">Maintenance mode</span>
      </label>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>Save settings</Button>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
const AdminHomepage = () => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ open: boolean; section: Partial<Section> | null }>({ open: false, section: null });

  const { data: sections = [], refetch } = useQuery({
    queryKey: ["admin-homepage-sections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("homepage_sections").select("*").order("sort_order");
      if (error) throw error;
      return data as Section[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("homepage_sections").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-homepage-sections"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homepage_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-homepage-sections"] }); toast.success("Deleted"); },
  });

  const move = (idx: number, dir: -1 | 1) => {
    const a = sections[idx], b = sections[idx + dir];
    if (!a || !b) return;
    update.mutate({ id: a.id, patch: { sort_order: b.sort_order } });
    update.mutate({ id: b.id, patch: { sort_order: a.sort_order } });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Homepage Management</h1>
          <p className="text-sm text-muted-foreground">Add, reorder, hide, and edit every homepage section, banner, product link and category.</p>
        </div>
      </div>

      <Tabs defaultValue="sections">
        <TabsList>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="settings"><SettingsIcon className="w-3 h-3 mr-1" /> Settings</TabsTrigger>
          <TabsTrigger value="preview">Live preview</TabsTrigger>
        </TabsList>

        <TabsContent value="sections" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setDialog({ open: true, section: { visible: true, type: "product_grid", layout: "carousel", device: "all", sort_order: (sections.at(-1)?.sort_order ?? 0) + 10 } })}>
              <Plus className="w-4 h-4 mr-1" /> Add section
            </Button>
          </div>
          {sections.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">No sections yet — click <b>Add section</b> to start.</Card>
          ) : (
            <div className="space-y-2">
              {sections.map((s, i) => (
                <SectionRow
                  key={s.id}
                  section={s}
                  onEdit={() => setDialog({ open: true, section: s })}
                  onDelete={() => { if (confirm(`Delete "${s.title}"? This also removes its banners and product links.`)) del.mutate(s.id); }}
                  onMove={(dir: -1 | 1) => move(i, dir)}
                  onToggle={(v: boolean) => update.mutate({ id: s.id, patch: { visible: v } })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings"><SettingsTab /></TabsContent>

        <TabsContent value="preview">
          <Card className="overflow-hidden">
            <div className="bg-muted px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
              <span>Live preview · changes appear instantly</span>
              <Button size="sm" variant="ghost" onClick={() => refetch()}>Refresh</Button>
            </div>
            <iframe src={import.meta.env.BASE_URL} title="Homepage preview" className="w-full h-[80vh] bg-white" />
          </Card>
        </TabsContent>
      </Tabs>

      {dialog.open && (
        <SectionDialog
          open={dialog.open}
          onOpenChange={(b) => setDialog({ open: b, section: b ? dialog.section : null })}
          initial={dialog.section}
          onSaved={() => qc.invalidateQueries({ queryKey: ["admin-homepage-sections"] })}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Tiny helpers
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    {children}
  </div>
);
const Select = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm">
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

export default AdminHomepage;
