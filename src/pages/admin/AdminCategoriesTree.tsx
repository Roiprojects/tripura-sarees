import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/admin/ImageUploader";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, ArrowUp, ArrowDown,
  Search, Image as ImageIcon, Loader2,
} from "lucide-react";
import { toast } from "sonner";

type Cat = {
  id: string; name: string; slug: string; parent_id: string | null;
  sort_order: number; description: string | null; image_url: string | null;
  gender: string | null; banner_url: string | null; visible: boolean; section_key: string | null;
};

type Node = Cat & { children: Node[] };

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const buildTree = (rows: Cat[]): Node[] => {
  const byId = new Map<string, Node>();
  rows.forEach((r) => byId.set(r.id, { ...r, children: [] }));
  const roots: Node[] = [];
  byId.forEach((n) => {
    if (n.parent_id && byId.has(n.parent_id)) byId.get(n.parent_id)!.children.push(n);
    else roots.push(n);
  });
  const sortRec = (arr: Node[]) => {
    arr.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
};

const flatLabel = (id: string | null, rows: Cat[]): string => {
  if (!id) return "—";
  const r = rows.find((x) => x.id === id);
  if (!r) return "?";
  return r.parent_id ? `${flatLabel(r.parent_id, rows)} → ${r.name}` : r.name;
};

const AdminCategoriesTree = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Partial<Cat> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-categories-tree"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Cat[];
    },
  });

  const tree = useMemo(() => buildTree(rows), [rows]);

  // Auto-expand search hits
  const matches = (n: Node): boolean => {
    if (!search) return true;
    const s = search.toLowerCase();
    return n.name.toLowerCase().includes(s) || n.slug.toLowerCase().includes(s) || n.children.some(matches);
  };

  const save = useMutation({
    mutationFn: async (c: Partial<Cat>) => {
      // Inherit gender from parent if not explicitly set
      let gender = c.gender ?? null;
      if (!gender && c.parent_id) {
        const parent = rows.find(r => r.id === c.parent_id);
        gender = parent?.gender ?? null;
      }
      const payload: any = {
        name: c.name, slug: c.slug || slugify(c.name ?? ""),
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
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-categories-tree"] }); qc.invalidateQueries({ queryKey: ["nav-categories"] }); qc.invalidateQueries({ queryKey: ["dynamic-nav-cats"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const hasChildren = rows.some((r) => r.parent_id === id);
      if (hasChildren) throw new Error("Delete or move children first.");
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-categories-tree"] }); qc.invalidateQueries({ queryKey: ["nav-categories"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: async ({ id, sort_order }: { id: string; sort_order: number }) => {
      const { error } = await supabase.from("categories").update({ sort_order }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-categories-tree"] }),
  });

  const toggleVisible = useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const { error } = await supabase.from("categories").update({ visible }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-categories-tree"] }); qc.invalidateQueries({ queryKey: ["dynamic-nav-cats"] }); },
  });

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const renderNode = (n: Node, depth: number, siblings: Node[], idx: number) => {
    if (!matches(n)) return null;
    const open = !!search || expanded.has(n.id);
    return (
      <div key={n.id}>
        <div
          className="flex items-center gap-2 py-2 px-2 rounded hover:bg-muted/50 group"
          style={{ paddingLeft: depth * 18 + 8 }}
        >
          {n.children.length > 0 ? (
            <button onClick={() => toggle(n.id)} className="w-5 h-5 flex items-center justify-center">
              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : <span className="w-5" />}
          <div className="w-8 h-8 rounded bg-muted overflow-hidden shrink-0">
            {n.image_url
              ? <img src={n.image_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon className="w-3 h-3" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium truncate ${!n.visible ? "opacity-50 line-through" : ""}`}>{n.name}</span>
              {n.gender && <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">{n.gender}</span>}
              {!n.visible && <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">hidden</span>}
            </div>
            <div className="text-[11px] text-muted-foreground truncate font-mono">/{n.slug}</div>
          </div>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]"
            onClick={() => toggleVisible.mutate({ id: n.id, visible: !n.visible })}
            title={n.visible ? "Hide" : "Show"}>
            {n.visible ? "👁" : "🚫"}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={idx === 0}
            onClick={() => move.mutate({ id: n.id, sort_order: (siblings[idx - 1]?.sort_order ?? 0) - 1 })}><ArrowUp className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={idx === siblings.length - 1}
            onClick={() => move.mutate({ id: n.id, sort_order: (siblings[idx + 1]?.sort_order ?? 0) + 1 })}><ArrowDown className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
            onClick={() => setEditing({ parent_id: n.id, gender: n.gender, sort_order: (n.children.at(-1)?.sort_order ?? 0) + 1 })}
            title="Add subcategory"><Plus className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(n)}><Pencil className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
            onClick={() => { if (confirm(`Delete "${n.name}"?`)) del.mutate(n.id); }}><Trash2 className="w-3 h-3 text-destructive" /></Button>
        </div>
        {open && n.children.map((c, i) => renderNode(c, depth + 1, n.children, i))}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Category Tree</h1>
          <p className="text-sm text-muted-foreground">{rows.length} categories · drag-free reorder via arrows · supports unlimited nesting</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories…" className="pl-9 w-64" />
          </div>
          <Button onClick={() => setExpanded(new Set(rows.map((r) => r.id)))}>Expand all</Button>
          <Button variant="outline" onClick={() => setExpanded(new Set())}>Collapse all</Button>
          <Button onClick={() => setEditing({ sort_order: (tree.at(-1)?.sort_order ?? 0) + 10 })}>
            <Plus className="w-4 h-4 mr-1" /> Add root
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…</div>
        ) : tree.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No categories yet.</div>
        ) : (
          <div className="p-2">{tree.map((n, i) => renderNode(n, 0, tree, i))}</div>
        )}
      </Card>

      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing.id ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Field label="Name *">
                <Input value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.slug || slugify(e.target.value) })} />
              </Field>
              <Field label="Slug *">
                <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="banarasi-silk" />
              </Field>
              <Field label="Parent category">
                <select
                  value={editing.parent_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, parent_id: e.target.value || null })}
                  className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">— None (root) —</option>
                  {rows.filter((r) => r.id !== editing.id).map((r) => (
                    <option key={r.id} value={r.id}>{flatLabel(r.id, rows)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Sort order">
                <Input type="number" value={editing.sort_order ?? 0}
                  onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
              </Field>
              <Field label="Description">
                <Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Visibility">
                  <select
                    value={editing.visible === false ? "0" : "1"}
                    onChange={(e) => setEditing({ ...editing, visible: e.target.value === "1" })}
                    className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="1">Published (visible)</option>
                    <option value="0">Hidden</option>
                  </select>
                </Field>
              </div>
              <Field label="Homepage section key (optional)">
                <Input value={editing.section_key ?? ""}
                  onChange={(e) => setEditing({ ...editing, section_key: e.target.value })}
                  placeholder="e.g. ethnic-store, party-wear" />
              </Field>
              <Field label="Thumbnail / card image">
                <ImageUploader value={editing.image_url ? [editing.image_url] : []}
                  onChange={(a) => setEditing({ ...editing, image_url: a[0] ?? null })}
                  bucket="homepage-media" multi={false} />
              </Field>
              <Field label="Banner image (category page hero)">
                <ImageUploader value={editing.banner_url ? [editing.banner_url] : []}
                  onChange={(a) => setEditing({ ...editing, banner_url: a[0] ?? null })}
                  bucket="homepage-media" multi={false} />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => save.mutate(editing)} disabled={save.isPending}>
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

export default AdminCategoriesTree;
