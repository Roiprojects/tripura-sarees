import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  Plus, Pencil, Trash2, Loader2, Image as ImageIcon, FolderTree, Layers, Tag, Sparkles, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { resolveImage } from "@/lib/resolveImage";

type Cat = {
  id: string; name: string; slug: string; parent_id: string | null;
  sort_order: number; description: string | null; image_url: string | null;
  gender: string | null; banner_url: string | null; visible: boolean; section_key: string | null;
};

type CatPayload = Omit<Cat, "id">;

const errorMessage = (e: unknown) => e instanceof Error ? e.message : "Something went wrong";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const LEVELS = [
  { key: 0, label: "Main Categories", hint: "The top tabs in your menu — e.g. Silk Sarees, Cotton & Handloom. The banner here shows on the main category landing page.", Icon: FolderTree, color: "from-violet-500 to-fuchsia-500" },
  { key: 1, label: "Subcategories", hint: "One level deeper — e.g. Silk Sarees → Banarasi Silk, Kanjeevaram Silk. Banner shows at the top of that subcategory page.", Icon: Layers, color: "from-sky-500 to-cyan-500" },
  { key: 2, label: "Sub-subcategories", hint: "The deepest level — e.g. Banarasi Silk → Katan Silk. Banner shows at the top of that listing.", Icon: Tag, color: "from-emerald-500 to-teal-500" },
];

const NAV_CATEGORY_SLUG_BY_URL: Record<string, string> = {
  "/silk-sarees": "silk-sarees",
  "/handloom-sarees": "handloom-sarees",
  "/designer-sarees": "designer-sarees",
  "/new": "new-arrivals",
  "/category/sale": "sale",
};

const freshImage = (src: string | null | undefined, version: number) => {
  const resolved = resolveImage(src);
  if (!src || resolved.includes("placeholder.svg") || resolved.startsWith("data:") || resolved.startsWith("blob:")) {
    return resolved;
  }
  return `${resolved}${resolved.includes("?") ? "&" : "?"}v=${version}`;
};

const AdminCategoryBanners = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Cat> & { _level?: number } | null>(null);
  const [imageVersion, setImageVersion] = useState(() => Date.now());

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-categories-tree"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Cat[];
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { data: navRows = [] } = useQuery({
    queryKey: ["admin-category-banner-nav-links"],
    queryFn: async () => {
      const { data } = await supabase
        .from("nav_links")
        .select("label,url,sort_order,visible")
        .eq("visible", true)
        .order("sort_order");
      return ((data ?? []) as unknown) as { label: string; url: string; sort_order: number }[];
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Realtime: instantly mirror any category change made elsewhere (storefront,
  // other admin tabs, other browsers) by invalidating every cache that reads
  // from the `categories` table.
  useEffect(() => {
    const channel = supabase
      .channel("admin-category-banners-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          setImageVersion(Date.now());
          qc.invalidateQueries({ queryKey: ["admin-categories-tree"] });
          qc.invalidateQueries({ queryKey: ["store-category-banner"] });
          qc.invalidateQueries({ queryKey: ["categories"] });
          qc.invalidateQueries({ queryKey: ["categories-flat"] });
          qc.invalidateQueries({ queryKey: ["nav-categories"] });
          qc.invalidateQueries({ queryKey: ["public-nav-categories"] });
          qc.invalidateQueries({ queryKey: ["sba-categories"] });
          qc.invalidateQueries({ queryKey: ["dynamic-nav-cats"] });
          qc.invalidateQueries({ queryKey: ["section-categories-admin"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "nav_links" },
        () => {
          qc.invalidateQueries({ queryKey: ["admin-category-banner-nav-links"] });
          qc.invalidateQueries({ queryKey: ["public-nav-links"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // Compute depth (level) of each row
  const levelOf = useMemo(() => {
    const m = new Map<string, number>();
    const get = (id: string | null): number => {
      if (!id) return -1;
      if (m.has(id)) return m.get(id)!;
      const r = rows.find((x) => x.id === id);
      if (!r) return 0;
      const lv = r.parent_id ? get(r.parent_id) + 1 : 0;
      m.set(id, lv);
      return lv;
    };
    rows.forEach((r) => get(r.id));
    return m;
  }, [rows]);

  const grouped = useMemo(() => {
    const out: Cat[][] = [[], [], []];
    for (const r of rows) {
      const lv = levelOf.get(r.id) ?? 0;
      if (lv >= 0 && lv <= 2) out[lv].push(r);
    }
    out.forEach((arr) =>
      arr.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    );
    return out;
  }, [rows, levelOf]);

  const mainCategories = useMemo(() => {
    const roots = grouped[0];
    const bySlug = new Map(roots.map((r) => [r.slug, r]));
    const picked = new Set<string>();
    const orderedFromNavbar = navRows
      .map((nav) => {
        const url = nav.url.trim();
        const slug = NAV_CATEGORY_SLUG_BY_URL[url]
          ?? (url.startsWith("/category/") ? url.replace(/^\/category\//, "") : null);
        const cat = slug ? bySlug.get(slug) : undefined;
        if (!cat || picked.has(cat.id)) return null;
        picked.add(cat.id);
        return cat;
      })
      .filter(Boolean) as Cat[];

    return [...orderedFromNavbar, ...roots.filter((r) => !picked.has(r.id))];
  }, [grouped, navRows]);

  const parentName = (id: string | null) =>
    id ? rows.find((r) => r.id === id)?.name ?? "—" : "—";

  // Full breadcrumb path: "Silk Sarees › Banarasi Silk"
  const pathOf = (c: Cat): string => {
    const parts: string[] = [c.name];
    let cur = c.parent_id;
    let safety = 0;
    while (cur && safety < 5) {
      const p = rows.find((r) => r.id === cur);
      if (!p) break;
      parts.unshift(p.name);
      cur = p.parent_id;
      safety++;
    }
    return parts.join(" › ");
  };

  const save = useMutation({
    mutationFn: async (c: Partial<Cat>) => {
      const payload: CatPayload = {
        name: c.name,
        slug: c.slug || slugify(c.name ?? ""),
        parent_id: c.parent_id || null,
        sort_order: Number(c.sort_order ?? 0),
        description: c.description ?? null,
        image_url: c.image_url ?? null,
        banner_url: c.banner_url ?? null,
        gender: c.gender ?? null,
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
      setImageVersion(Date.now());
      qc.invalidateQueries({ queryKey: ["admin-categories-tree"] });
      qc.invalidateQueries({ queryKey: ["store-category-banner"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["categories-flat"] });
      qc.invalidateQueries({ queryKey: ["nav-categories"] });
      qc.invalidateQueries({ queryKey: ["public-nav-categories"] });
      setEditing(null);
    },
    onError: (e: unknown) => toast.error(errorMessage(e)),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
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
    onSuccess: (ids) => {
      toast.success(ids.length > 1 ? `Deleted ${ids.length} categories` : "Deleted");
      qc.invalidateQueries({ queryKey: ["admin-categories-tree"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: unknown) => toast.error(errorMessage(e)),
  });

  const openAdd = (level: number) => {
    setEditing({
      _level: level,
      parent_id: level === 0 ? null : "",
      sort_order: 0,
      visible: true,
    });
  };

  // Possible parents for the level being added/edited
  const parentOptions = (level: number) => {
    if (level === 0) return [];
    return rows
      .filter((r) => (levelOf.get(r.id) ?? 0) === level - 1)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const editingLevel =
    editing?._level ??
    (editing?.id ? levelOf.get(editing.id) ?? 0 : 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" /> Category Banners
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage banner image and name for every Main, Sub, and Sub-sub category. Add new ones or remove existing ones here.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setImageVersion(Date.now()); refetch(); }} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Quick add bar */}
      <Card className="rounded-2xl p-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground mr-2">Quick add:</span>
        {LEVELS.map(({ key, label, Icon }) => (
          <Button key={key} size="sm" variant="outline" onClick={() => openAdd(key)}>
            <Icon className="w-3.5 h-3.5 mr-1" /> <Plus className="w-3 h-3 mr-1" /> {label.replace(/ies$/, "y").replace(/s$/, "")}
          </Button>
        ))}
      </Card>

      {isLoading ? (
        <div className="text-sm text-muted-foreground"><Loader2 className="w-4 h-4 inline animate-spin mr-2" />Loading…</div>
      ) : mainCategories.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No main categories yet. Click <b>Add Main Categor</b> above to create the first one.
        </Card>
      ) : (
        <div className="space-y-6">
          {mainCategories.map((main) => {
            const subs = rows.filter((r) => r.parent_id === main.id)
              .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
            return (
              <Card key={main.id} className="rounded-2xl overflow-hidden border-2">
                {/* Main category header with banner */}
                <div className="relative">
                  <div className="aspect-[16/4] bg-muted relative">
                    {main.banner_url ? (
                      <img src={freshImage(main.banner_url, imageVersion)} alt={main.name} loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = resolveImage(); }}
                        className="absolute inset-0 w-full h-full object-cover" />
                    ) : main.image_url ? (
                      <img src={freshImage(main.image_url, imageVersion)} alt={main.name} loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = resolveImage(); }}
                        className="absolute inset-0 w-full h-full object-cover opacity-70" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between gap-3">
                      <div className="text-white">
                        <div className="flex items-center gap-2">
                          <FolderTree className="w-5 h-5" />
                          <h2 className="text-2xl font-display font-bold drop-shadow">{main.name}</h2>
                          <Badge variant="secondary" className="text-foreground">Main</Badge>
                          {!main.visible && <Badge variant="destructive">Hidden</Badge>}
                        </div>
                        <div className="text-xs opacity-90">/{main.slug} · {subs.length} sub-categor{subs.length === 1 ? "y" : "ies"}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-white text-foreground hover:bg-white/90"
                          onClick={() => setEditing({ ...main, _level: 0 })}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="destructive"
                          onClick={() => {
                            const kids = rows.filter((r) => r.parent_id === main.id).length;
                            const msg = kids > 0
                              ? `Delete "${main.name}" AND its ${kids} sub-item${kids > 1 ? "s" : ""}?\n\nThis cannot be undone.`
                              : `Delete "${main.name}"?`;
                            if (confirm(msg)) del.mutate(main.id);
                          }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subcategories */}
                <div className="p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-600" />
                      <h3 className="font-semibold text-sm">Sub-categories of {main.name}</h3>
                      <Badge variant="outline">{subs.length}</Badge>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setEditing({ _level: 1, parent_id: main.id, sort_order: 0, visible: true })}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add sub-category
                    </Button>
                  </div>

                  {subs.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                      No sub-categories yet. Click <b>Add sub-category</b> to create one.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {subs.map((c) => {
                        const subSubs = rows.filter((r) => r.parent_id === c.id)
                          .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
                        return (
                          <Card key={c.id} className="overflow-hidden">
                            <div className="relative aspect-[16/8] bg-muted">
                              {c.banner_url ? (
                                <img src={freshImage(c.banner_url, imageVersion)} alt={c.name} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = resolveImage(); }} className="absolute inset-0 w-full h-full object-cover" />
                              ) : c.image_url ? (
                                <img src={freshImage(c.image_url, imageVersion)} alt={c.name} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = resolveImage(); }} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-1">
                                  <ImageIcon className="w-7 h-7" />
                                  <span className="text-[10px]">No banner</span>
                                </div>
                              )}
                              <span className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.banner_url ? "bg-emerald-500/90 text-white" : "bg-amber-500/90 text-white"}`}>
                                {c.banner_url ? "Banner set" : "No banner"}
                              </span>
                              {!c.visible && (
                                <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider bg-black/60 text-white px-2 py-0.5 rounded">Hidden</span>
                              )}
                            </div>
                            <div className="p-3">
                              <div className="font-semibold truncate">{c.name}</div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {main.name} › {c.name}
                                {subSubs.length > 0 && <> · {subSubs.length} item{subSubs.length > 1 ? "s" : ""}</>}
                              </div>

                              {subSubs.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {subSubs.map((s) => (
                                    <button key={s.id}
                                      onClick={() => setEditing({ ...s, _level: 2 })}
                                      className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200">
                                      {s.banner_url ? "🖼 " : ""}{s.name}
                                    </button>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center gap-2 mt-2">
                                <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing({ ...c, _level: 1 })}>
                                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditing({ _level: 2, parent_id: c.id, sort_order: 0, visible: true })} title="Add sub-sub-category">
                                  <Plus className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-destructive"
                                  onClick={() => {
                                    const kids = rows.filter((r) => r.parent_id === c.id).length;
                                    const msg = kids > 0
                                      ? `Delete "${c.name}" AND its ${kids} sub-item${kids > 1 ? "s" : ""}?\n\nThis cannot be undone.`
                                      : `Delete "${c.name}"?`;
                                    if (confirm(msg)) del.mutate(c.id);
                                  }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Orphans: level-1+ items whose parent no longer exists */}
      {(() => {
        const orphans = rows.filter(
          (r) => r.parent_id && !rows.find((p) => p.id === r.parent_id),
        );
        if (orphans.length === 0) return null;
        return (
          <Card className="rounded-2xl p-4 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <div className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">
              ⚠ Orphaned categories (parent missing)
            </div>
            <div className="flex flex-wrap gap-2">
              {orphans.map((o) => (
                <button key={o.id} onClick={() => setEditing({ ...o, _level: levelOf.get(o.id) ?? 1 })}
                  className="text-xs px-2 py-1 rounded bg-white border hover:bg-amber-100">
                  {o.name}
                </button>
              ))}
            </div>
          </Card>
        );
      })()}

      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit category" : `Add new ${LEVELS[editingLevel].label.replace(/ies$/, "y").replace(/s$/, "")}`}</DialogTitle>
              <DialogDescription>
                {editingLevel === 0
                  ? "Top-level category visible across the storefront."
                  : <>Inside a <b>{LEVELS[editingLevel - 1].label.replace(/ies$/, "y").replace(/s$/, "")}</b>.</>}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {editingLevel > 0 && (
                <Field label="Parent *">
                  <select
                    value={editing.parent_id ?? ""}
                    onChange={(e) => setEditing({ ...editing, parent_id: e.target.value || null })}
                    className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">— Select parent —</option>
                    {parentOptions(editingLevel).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="Name *">
                <Input
                  autoFocus value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })}
                  placeholder="e.g. Ethnic Wear"
                />
              </Field>

              <Field label="URL slug *">
                <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="ethnic-wear" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Sort order">
                  <Input type="number" value={editing.sort_order ?? 0}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
                </Field>
                <Field label="Visibility">
                  <select
                    value={editing.visible === false ? "0" : "1"}
                    onChange={(e) => setEditing({ ...editing, visible: e.target.value === "1" })}
                    className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="1">Published</option>
                    <option value="0">Hidden</option>
                  </select>
                </Field>
              </div>

              <Field label="Banner image (wide hero shown on category page — recommended 1600×400, ratio 16:4)">
                <ImageUploader value={editing.banner_url ? [editing.banner_url] : []}
                  onChange={(a) => setEditing({ ...editing, banner_url: a[0] ?? null })}
                  bucket="homepage-media" multi={false} />
                <p className="text-xs text-muted-foreground mt-1">
                  Tip: upload a wide image (e.g. 1600×400 or 1920×500). The full image is always shown on the collection page — empty areas are filled with a soft blur of the same image.
                </p>
              </Field>

              <Field label="Thumbnail image (square tile shown in menus / grids)">
                <ImageUploader value={editing.image_url ? [editing.image_url] : []}
                  onChange={(a) => setEditing({ ...editing, image_url: a[0] ?? null })}
                  bucket="homepage-media" multi={false} />
              </Field>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button
                onClick={() => save.mutate(editing)}
                disabled={save.isPending || !editing.name || (editingLevel > 0 && !editing.parent_id)}
              >
                {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    {children}
  </div>
);

export default AdminCategoryBanners;
