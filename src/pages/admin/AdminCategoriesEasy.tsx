import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { ImageUploader } from "@/components/admin/ImageUploader";
import {
  Plus, Pencil, Trash2, ChevronRight, Search, Image as ImageIcon,
  Loader2, Eye, EyeOff, FolderTree, Layers, Tag, Sparkles, Baby, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

// Virtual nodes that surface the "Shop by Age" structure inside the category browser.
const SBA_ROOT_ID = "__sba_root__";
const SBA_GIRLS_ID = "__sba_girls__";
const SBA_BOYS_ID  = "__sba_boys__";
const SBA_GROUP_BY_NODE: Record<string, "girls" | "boys"> = {
  [SBA_GIRLS_ID]: "girls",
  [SBA_BOYS_ID]:  "boys",
};
const isVirtualId = (id: string | null | undefined) =>
  !!id && (id === SBA_ROOT_ID || id === SBA_GIRLS_ID || id === SBA_BOYS_ID || id.startsWith("__sba_age_"));

type Cat = {
  id: string; name: string; slug: string; parent_id: string | null;
  sort_order: number; description: string | null; image_url: string | null;
  gender: string | null; banner_url: string | null; visible: boolean; section_key: string | null;
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const LEVEL_META = [
  { label: "Main Category", hint: "e.g. Silk Sarees, Cotton & Handloom", icon: FolderTree, color: "from-violet-500 to-fuchsia-500" },
  { label: "Subcategory",   hint: "e.g. Banarasi Silk, Tripura Handloom", icon: Layers,     color: "from-sky-500 to-cyan-500" },
  { label: "Sub-subcategory", hint: "e.g. Katan, Organza Banarasi",       icon: Tag,        color: "from-emerald-500 to-teal-500" },
];

const AdminCategoriesEasy = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<(string | null)[]>([null, null, null]);
  const [editing, setEditing] = useState<Partial<Cat> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-categories-tree"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Cat[];
    },
  });

  // Legacy virtual nodes (kept so the column renderer below stays unchanged);
  // this store has no separate shop-by-age table entries to surface.
  const sbaRows: Array<{
    id: string; group_key: "girls" | "boys"; label: string;
    image_url: string | null; sort_order: number; visible: boolean;
  }> = [];

  const childrenOf = (parentId: string | null) =>
    rows
      .filter((r) => r.parent_id === parentId)
      .filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  // Build the virtual "Shop by Age" entries so they appear inside the Miller columns.
  const sbaVirtual = useMemo(() => {
    const matchSearch = (s: string) => !search || s.toLowerCase().includes(search.toLowerCase());
    const root: any = {
      id: SBA_ROOT_ID, name: "Shop by Age", slug: "shop-by-age", parent_id: null,
      sort_order: -1, description: null, image_url: null, gender: null,
      banner_url: null, visible: true, section_key: null,
      _virtual: true, _link: "/shop-by-age", _editTo: "/admin/shop-by-age",
      _icon: "baby" as const,
    };
    const girls: any = {
      id: SBA_GIRLS_ID, name: "Girls", slug: "girls", parent_id: SBA_ROOT_ID,
      sort_order: 0, description: null, image_url: null, gender: "girls",
      banner_url: null, visible: true, section_key: null,
      _virtual: true, _link: "/shop-by-age?gender=girls", _editTo: "/admin/shop-by-age",
    };
    const boys: any = {
      id: SBA_BOYS_ID, name: "Boys", slug: "boys", parent_id: SBA_ROOT_ID,
      sort_order: 1, description: null, image_url: null, gender: "boys",
      banner_url: null, visible: true, section_key: null,
      _virtual: true, _link: "/shop-by-age?gender=boys", _editTo: "/admin/shop-by-age",
    };
    const ageNode = (r: typeof sbaRows[number]) => ({
      id: `__sba_age_${r.id}`,
      name: r.label,
      slug: r.label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      parent_id: r.group_key === "girls" ? SBA_GIRLS_ID : SBA_BOYS_ID,
      sort_order: r.sort_order ?? 0,
      description: null,
      image_url: r.image_url ?? null,
      gender: r.group_key,
      banner_url: null,
      visible: r.visible,
      section_key: null,
      _virtual: true,
      _link: `/shop-by-age?gender=${r.group_key}&age=${encodeURIComponent(r.label)}`,
      _editTo: "/admin/shop-by-age",
    });
    const ages = sbaRows.map(ageNode);
    const girlsAges = ages.filter((a) => a.parent_id === SBA_GIRLS_ID && matchSearch(a.name));
    const boysAges  = ages.filter((a) => a.parent_id === SBA_BOYS_ID  && matchSearch(a.name));
    return { root, girls, boys, girlsAges, boysAges, allAges: ages };
  }, [sbaRows, search]);

  const virtualChildrenOf = (parentId: string | null): any[] => {
    if (parentId === SBA_ROOT_ID) {
      const out: any[] = [];
      if (!search || "girls".includes(search.toLowerCase())) out.push(sbaVirtual.girls);
      if (!search || "boys".includes(search.toLowerCase()))  out.push(sbaVirtual.boys);
      return out;
    }
    if (parentId === SBA_GIRLS_ID) return sbaVirtual.girlsAges;
    if (parentId === SBA_BOYS_ID)  return sbaVirtual.boysAges;
    return [];
  };

  const columns = useMemo(() => {
    // Real "Shop by Age" now lives in the categories table, so we no longer
    // prepend the virtual SBA root (it was showing as a duplicate entry).
    const level0 = childrenOf(null);
    const level1 = sel[0]
      ? (isVirtualId(sel[0]) ? virtualChildrenOf(sel[0]) : childrenOf(sel[0]))
      : [];
    const level2 = sel[1]
      ? (isVirtualId(sel[1]) ? virtualChildrenOf(sel[1]) : childrenOf(sel[1]))
      : [];
    return [level0, level1, level2];
  }, [rows, sel, search, sbaVirtual]);

  const save = useMutation({
    mutationFn: async (c: Partial<Cat>) => {
      let gender = c.gender ?? null;
      if (!gender && c.parent_id) {
        const parent = rows.find((r) => r.id === c.parent_id);
        gender = parent?.gender ?? null;
      }
      const payload: any = {
        name: c.name,
        slug: c.slug || slugify(c.name ?? ""),
        parent_id: c.parent_id || null,
        sort_order: Number(c.sort_order ?? 0),
        description: c.description ?? null,
        image_url: c.image_url ?? null,
        banner_url: c.banner_url ?? null,
        gender,
        visible: c.visible ?? true,
        section_key: c.section_key || null,
      };
      if (c.id) {
        const { error } = await supabase.from("categories").update(payload).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-categories-tree"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["nav-categories"] });
      qc.invalidateQueries({ queryKey: ["dynamic-nav-cats"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      // Collect this id + all descendants (sub & sub-sub)
      const collect = (rootId: string): string[] => {
        const out = [rootId];
        const kids = rows.filter((r) => r.parent_id === rootId);
        for (const k of kids) out.push(...collect(k.id));
        return out;
      };
      const ids = collect(id);
      const { error } = await supabase.from("categories").delete().in("id", ids);
      if (error) throw error;
      return ids;
    },
    onSuccess: (ids, id) => {
      toast.success(ids.length > 1 ? `Deleted ${ids.length} categories` : "Deleted");
      setSel((s) => s.map((v) => (v && ids.includes(v) ? null : v)));
      qc.invalidateQueries({ queryKey: ["admin-categories-tree"] });
      qc.invalidateQueries({ queryKey: ["nav-categories"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleVisible = useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const { error } = await supabase.from("categories").update({ visible }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-categories-tree"] }),
  });

  const pick = (level: number, id: string) => {
    const next = [...sel];
    next[level] = id;
    for (let i = level + 1; i < 3; i++) next[i] = null;
    setSel(next);
  };

  const openAdd = (level: number) => {
    const parent_id = level === 0 ? null : sel[level - 1];
    if (level > 0 && !parent_id) {
      toast.error(`Pick a ${LEVEL_META[level - 1].label} first`);
      return;
    }
    const parent = parent_id ? rows.find((r) => r.id === parent_id) : null;
    const siblings = childrenOf(parent_id);
    setEditing({
      parent_id,
      gender: parent?.gender ?? null,
      sort_order: (siblings.at(-1)?.sort_order ?? 0) + 10,
      visible: true,
    });
  };

  const total = rows.length;
  const roots = rows.filter((r) => !r.parent_id).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" /> Categories
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} total · {roots} main · Tap a card to drill into its sub-items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9 w-56" />
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <Card className="rounded-2xl p-3 flex items-center gap-2 flex-wrap text-sm bg-gradient-to-r from-muted/40 to-background">
        <span className="text-muted-foreground">You are here:</span>
        <Badge variant="secondary" className="font-semibold">All</Badge>
        {sel.map((id, i) =>
          id ? (
            <span key={i} className="flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              <Badge variant="secondary" className="font-semibold">
                {(() => {
                  if (id === SBA_ROOT_ID) return "Shop by Age";
                  if (id === SBA_GIRLS_ID) return "Girls";
                  if (id === SBA_BOYS_ID) return "Boys";
                  if (id?.startsWith("__sba_age_")) {
                    const raw = id.replace("__sba_age_", "");
                    return sbaRows.find((r) => r.id === raw)?.label ?? "Age";
                  }
                  return rows.find((r) => r.id === id)?.name ?? "?";
                })()}
              </Badge>
            </span>
          ) : null,
        )}
      </Card>

      {/* 3-column Miller view */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {LEVEL_META.map((meta, level) => {
          const items = columns[level];
          const Icon = meta.icon;
          const disabled = level > 0 && !sel[level - 1];
          const parentIsVirtual = level > 0 && isVirtualId(sel[level - 1]);
          const addDisabled = disabled || parentIsVirtual;
          return (
            <Card key={level} className="rounded-2xl overflow-hidden flex flex-col min-h-[460px]">
              <div className={`p-3 bg-gradient-to-br ${meta.color} text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">{meta.label}</div>
                      <div className="text-[11px] opacity-90">{meta.hint}</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 px-2 bg-white text-foreground hover:bg-white/90"
                    onClick={() => openAdd(level)}
                    disabled={addDisabled}
                    title={parentIsVirtual ? "Manage in Admin → Shop by Age" : undefined}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </Button>
                </div>
              </div>

              <div className="flex-1 p-2 space-y-1.5 bg-muted/20">
                {isLoading ? (
                  <div className="p-6 text-center text-muted-foreground"><Loader2 className="w-4 h-4 inline animate-spin mr-2" />Loading…</div>
                ) : disabled ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Select a {LEVEL_META[level - 1].label.toLowerCase()} on the left to see its items.
                  </div>
                ) : items.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Nothing here yet. Click <b>Add</b> to create one.
                  </div>
                ) : (
                  items.map((c: any) => {
                    const isSelected = sel[level] === c.id;
                    const virtual = !!c._virtual;
                    const childCount = virtual
                      ? (c.id === SBA_ROOT_ID ? 2
                          : c.id === SBA_GIRLS_ID ? sbaVirtual.girlsAges.length
                          : c.id === SBA_BOYS_ID  ? sbaVirtual.boysAges.length
                          : 0)
                      : rows.filter((r) => r.parent_id === c.id).length;
                    const subline = virtual
                      ? (c.id === SBA_ROOT_ID
                          ? "Live · synced from Shop by Age"
                          : childCount > 0
                            ? `${childCount} age${childCount > 1 ? "s" : ""}`
                            : "Open frontend page")
                      : (childCount > 0 ? `${childCount} sub-item${childCount > 1 ? "s" : ""}` : "No sub-items");
                    return (
                      <div
                        key={c.id}
                        onClick={() => pick(level, c.id)}
                        className={`group flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all
                          ${isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                            : "bg-background hover:border-primary/40 hover:shadow-sm"}
                          ${virtual && !isSelected ? "ring-1 ring-violet-300/60" : ""}`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                          {c.image_url
                            ? <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                            : virtual
                              ? <Baby className="w-5 h-5 text-violet-500" />
                              : <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold truncate flex items-center gap-1.5 ${!c.visible ? "opacity-50 line-through" : ""}`}>
                            {c.name}
                            {virtual && (
                              <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${isSelected ? "border-primary-foreground/40 text-primary-foreground" : "border-violet-400 text-violet-600"}`}>
                                Shop by Age
                              </Badge>
                            )}
                          </div>
                          <div className={`text-[11px] truncate ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            {subline}
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
                          {virtual ? (
                            <>
                              <RouterLink
                                to={c._link}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className={`h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted ${isSelected ? "hover:bg-white/20 text-primary-foreground" : ""}`}
                                title="Open on the website"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </RouterLink>
                              <RouterLink
                                to={c._editTo}
                                onClick={(e) => e.stopPropagation()}
                                className={`h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted ${isSelected ? "hover:bg-white/20 text-primary-foreground" : ""}`}
                                title="Manage in Shop by Age admin"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </RouterLink>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" className={`h-7 w-7 p-0 ${isSelected ? "hover:bg-white/20 text-primary-foreground" : ""}`}
                                onClick={(e) => { e.stopPropagation(); toggleVisible.mutate({ id: c.id, visible: !c.visible }); }}
                                title={c.visible ? "Hide" : "Show"}>
                                {c.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              </Button>
                              <Button size="sm" variant="ghost" className={`h-7 w-7 p-0 ${isSelected ? "hover:bg-white/20 text-primary-foreground" : ""}`}
                                onClick={(e) => { e.stopPropagation(); setEditing(c); }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className={`h-7 w-7 p-0 ${isSelected ? "hover:bg-white/20 text-primary-foreground" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const msg = childCount > 0
                                    ? `Delete "${c.name}" AND its ${childCount} sub-item${childCount > 1 ? "s" : ""} (and any nested items)?\n\nThis cannot be undone.`
                                    : `Delete "${c.name}"?`;
                                  if (confirm(msg)) del.mutate(c.id);
                                }}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                        {level < 2 && childCount > 0 && (
                          <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary-foreground" : "text-muted-foreground"}`} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit / Add dialog */}
      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit category" : "Add new category"}</DialogTitle>
              <DialogDescription>
                {editing.parent_id
                  ? <>Inside: <b>{rows.find((r) => r.id === editing.parent_id)?.name}</b></>
                  : "This will be a top-level main category."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Field label="Name *">
                <Input autoFocus value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })}
                  placeholder="e.g. Ethnic Wear" />
              </Field>
              <Field label="URL slug *">
                <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="ethnic-wear" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sort order">
                  <Input type="number" value={editing.sort_order ?? 0}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
                </Field>
              </div>
              <Field label="Description">
                <Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </Field>
              <Field label="Visibility">
                <select
                  value={editing.visible === false ? "0" : "1"}
                  onChange={(e) => setEditing({ ...editing, visible: e.target.value === "1" })}
                  className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="1">Published (visible to customers)</option>
                  <option value="0">Hidden</option>
                </select>
              </Field>
              <Field label="Thumbnail image">
                <ImageUploader value={editing.image_url ? [editing.image_url] : []}
                  onChange={(a) => setEditing({ ...editing, image_url: a[0] ?? null })}
                  bucket="homepage-media" multi={false}
                  defaultAspect={1}
                  hint="Square thumb • recommended 800×800 • PNG / JPG / WEBP" />
              </Field>
              <Field label="Banner image (category page hero)">
                <ImageUploader value={editing.banner_url ? [editing.banner_url] : []}
                  onChange={(a) => setEditing({ ...editing, banner_url: a[0] ?? null })}
                  bucket="homepage-media" multi={false}
                  defaultAspect={21 / 9}
                  autoOpenCrop
                  hint="Wide hero • recommended 2400×1000 (21:9) • will auto-open crop after upload" />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => save.mutate(editing)} disabled={save.isPending || !editing.name}>
                {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const Field = ({ label, children }: any) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    {children}
  </div>
);

export default AdminCategoriesEasy;
