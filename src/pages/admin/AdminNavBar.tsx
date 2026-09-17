import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, ArrowUp, ArrowDown, Link2, Loader2, Menu, FolderPlus, Search,
} from "lucide-react";
import { toast } from "sonner";

// Known storefront pages — admin can pick from this list instead of typing a URL
const BUILTIN_PAGES: { label: string; url: string }[] = [
  { label: "Home", url: "/" },
  { label: "All Sarees", url: "/shop" },
  { label: "New Arrivals", url: "/new" },
  { label: "Trending", url: "/trending" },
  { label: "Featured", url: "/featured" },
  { label: "Silk Sarees", url: "/category/silk-sarees" },
  { label: "Cotton & Handloom", url: "/category/handloom-sarees" },
  { label: "Designer Sarees", url: "/category/designer-sarees" },
  { label: "Wedding Sarees", url: "/occasion/wedding" },
  { label: "Festive Sarees", url: "/occasion/festive" },
  { label: "Party Wear", url: "/occasion/party" },
  { label: "Office Wear", url: "/occasion/office-wear" },
  { label: "Daily Wear", url: "/occasion/daily-wear" },
  { label: "Blog", url: "/blog" },
  { label: "About", url: "/about" },
  { label: "Contact", url: "/contact" },
];

type NavLinkRow = {
  id: string;
  label: string;
  url: string;
  sort_order: number;
  visible: boolean;
};

type MainCat = { name: string; slug: string; sort_order: number | null };

const AdminNavBar = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<NavLinkRow> | null>(null);

  // bulk-select state for nav rows
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleRow = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const clearSelection = () => setSelected(new Set());

  // import-categories dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [importPicked, setImportPicked] = useState<Set<string>>(new Set());
  const [importSearch, setImportSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-nav-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nav_links" as any)
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return ((data ?? []) as unknown) as NavLinkRow[];
    },
  });

  // Load main (root) categories — used in both edit-dialog and import-dialog
  const { data: mainCats = [] } = useQuery({
    queryKey: ["nav-main-cats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("name,slug,sort_order")
        .is("parent_id", null)
        .eq("visible", true)
        .order("sort_order");
      return (data ?? []) as MainCat[];
    },
    staleTime: 60_000,
  });

  const [linkMode, setLinkMode] = useState<"category" | "page" | "custom">("page");

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-nav-links"] });

  const upsert = useMutation({
    mutationFn: async (row: Partial<NavLinkRow>) => {
      const payload = {
        label: (row.label ?? "").trim(),
        url: (row.url ?? "").trim(),
        sort_order: Number(row.sort_order ?? rows.length * 10),
        visible: row.visible ?? true,
      };
      if (!payload.label || !payload.url) throw new Error("Label and URL are required");
      if (row.id) {
        const { error } = await supabase.from("nav_links" as any).update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("nav_links" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); setEditing(null); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nav_links" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkRemove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("nav_links" as any).delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      toast.success(`Removed ${ids.length} link${ids.length === 1 ? "" : "s"}`);
      clearSelection();
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setVisible = useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const { error } = await supabase.from("nav_links" as any).update({ visible }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  // Import selected categories from the picker dialog
  const importSelected = useMutation({
    mutationFn: async (slugs: string[]) => {
      if (!slugs.length) throw new Error("Pick at least one category");
      const picked = mainCats.filter((c) => slugs.includes(c.slug));
      let base = (rows[rows.length - 1]?.sort_order ?? 0) + 10;
      const toInsert = picked.map((c, i) => ({
        label: c.name.toUpperCase(),
        url: `/category/${c.slug}`,
        visible: true,
        sort_order: base + i * 10,
      }));
      const { error } = await supabase.from("nav_links" as any).insert(toInsert);
      if (error) throw error;
      return toInsert.length;
    },
    onSuccess: (added) => {
      toast.success(`Added ${added} categor${added === 1 ? "y" : "ies"} to nav bar`);
      setImportOpen(false);
      setImportPicked(new Set());
      setImportSearch("");
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const swap = useMutation({
    mutationFn: async ({ a, b }: { a: NavLinkRow; b: NavLinkRow }) => {
      const { error: e1 } = await supabase.from("nav_links" as any).update({ sort_order: b.sort_order }).eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("nav_links" as any).update({ sort_order: a.sort_order }).eq("id", b.id);
      if (e2) throw e2;
    },
    onSuccess: refresh,
  });

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    swap.mutate({ a: rows[i], b: rows[j] });
  };

  // URLs already in nav bar — used to mark categories as "Already added" in the import dialog
  const existingUrlSet = useMemo(
    () => new Set(rows.map((r) => r.url.trim().toLowerCase())),
    [rows],
  );

  const filteredCats = useMemo(() => {
    const q = importSearch.trim().toLowerCase();
    if (!q) return mainCats;
    return mainCats.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    );
  }, [mainCats, importSearch]);

  // Reset picker selection whenever the dialog opens
  useEffect(() => {
    if (importOpen) {
      setImportPicked(new Set());
      setImportSearch("");
    }
  }, [importOpen]);

  const openImport = () => setImportOpen(true);

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Menu className="w-6 h-6 text-primary" /> Nav Bar
          </h1>
          <p className="text-sm text-muted-foreground">
            Add, edit, reorder or hide the top navigation links shown on the storefront.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={openImport}>
            <FolderPlus className="w-4 h-4 mr-1" />
            Import main categories
          </Button>
          <Button
            onClick={() => {
              setLinkMode("page");
              setEditing({ visible: true, sort_order: rows.length * 10 });
            }}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1" /> Add nav link
          </Button>
        </div>
      </div>

      {/* bulk action bar */}
      {rows.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-md border bg-muted/40">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleAll}
            aria-label="Select all"
          />
          <span className="text-xs text-muted-foreground">
            {selected.size > 0
              ? `${selected.size} selected`
              : "Select links to remove in bulk"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && (
              <>
                <Button size="sm" variant="ghost" onClick={clearSelection}>
                  Clear
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Remove ${selected.size} selected link(s)?`))
                      bulkRemove.mutate(Array.from(selected));
                  }}
                  disabled={bulkRemove.isPending}
                >
                  {bulkRemove.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-1" />
                  )}
                  Remove selected
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <Card className="p-2 sm:p-3">
        {isLoading ? (
          <div className="py-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No nav links yet. Click <b>Add nav link</b> to create one.
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((r, i) => (
              <div
                key={r.id}
                className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 ${
                  selected.has(r.id) ? "bg-primary/5" : ""
                }`}
              >
                <Checkbox
                  checked={selected.has(r.id)}
                  onCheckedChange={() => toggleRow(r.id)}
                  aria-label={`Select ${r.label}`}
                />
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground w-7 text-center shrink-0">
                  #{i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{r.label}</div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Link2 className="w-3 h-3 shrink-0" /> {r.url}
                  </div>
                </div>
                <Switch
                  checked={r.visible}
                  onCheckedChange={(v) => setVisible.mutate({ id: r.id, visible: v })}
                  aria-label="Visible"
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => {
                  setLinkMode(
                    r.url.startsWith("/category/")
                      ? "category"
                      : BUILTIN_PAGES.some((p) => p.url === r.url)
                        ? "page"
                        : "custom",
                  );
                  setEditing(r);
                }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => { if (confirm(`Delete "${r.label}"?`)) remove.mutate(r.id); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ----- Import categories picker dialog ----- */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import main categories</DialogTitle>
            <DialogDescription>
              Pick the categories you want as nav-bar links. Already-added ones are disabled.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={importSearch}
              onChange={(e) => setImportSearch(e.target.value)}
              placeholder="Search categories…"
              className="pl-8"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{importPicked.size} selected</span>
            <button
              type="button"
              className="hover:underline"
              onClick={() => {
                const selectable = filteredCats
                  .filter((c) => !existingUrlSet.has(`/category/${c.slug}`))
                  .map((c) => c.slug);
                const allPicked = selectable.every((s) => importPicked.has(s));
                setImportPicked(allPicked ? new Set() : new Set(selectable));
              }}
            >
              {filteredCats.length &&
              filteredCats
                .filter((c) => !existingUrlSet.has(`/category/${c.slug}`))
                .every((c) => importPicked.has(c.slug))
                ? "Deselect all"
                : "Select all"}
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-md border divide-y">
            {filteredCats.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No matching categories.
              </div>
            ) : (
              filteredCats.map((c) => {
                const already = existingUrlSet.has(`/category/${c.slug}`);
                const checked = importPicked.has(c.slug);
                return (
                  <label
                    key={c.slug}
                    className={`flex items-center gap-3 px-3 py-2 text-sm ${
                      already ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={already}
                      onCheckedChange={() =>
                        setImportPicked((s) => {
                          const n = new Set(s);
                          n.has(c.slug) ? n.delete(c.slug) : n.add(c.slug);
                          return n;
                        })
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        /category/{c.slug}
                      </div>
                    </div>
                    {already && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Added
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button
              onClick={() => importSelected.mutate(Array.from(importPicked))}
              disabled={importPicked.size === 0 || importSelected.isPending}
            >
              {importSelected.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Import {importPicked.size > 0 ? `(${importPicked.size})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----- Add / edit nav link dialog ----- */}
      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit nav link" : "Add nav link"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Step 1 · Where should this link go?
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-muted">
                  {([
                    { k: "category", t: "Main category" },
                    { k: "page", t: "Site page" },
                    { k: "custom", t: "Custom URL" },
                  ] as const).map((m) => (
                    <button
                      key={m.k}
                      type="button"
                      onClick={() => setLinkMode(m.k)}
                      className={`text-xs font-medium py-1.5 rounded-md transition ${
                        linkMode === m.k
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m.t}
                    </button>
                  ))}
                </div>

                {linkMode === "category" && (
                  <Select
                    value={
                      editing.url?.startsWith("/category/")
                        ? editing.url.replace("/category/", "")
                        : ""
                    }
                    onValueChange={(slug) => {
                      const cat = mainCats.find((c) => c.slug === slug);
                      setEditing({
                        ...editing,
                        url: `/category/${slug}`,
                        label: editing.label || (cat?.name.toUpperCase() ?? ""),
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={mainCats.length ? "Pick a main category" : "No main categories found"} />
                    </SelectTrigger>
                    <SelectContent>
                      {mainCats.map((c) => (
                        <SelectItem key={c.slug} value={c.slug}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {linkMode === "page" && (
                  <Select
                    value={BUILTIN_PAGES.some((p) => p.url === editing.url) ? editing.url : ""}
                    onValueChange={(url) => {
                      const page = BUILTIN_PAGES.find((p) => p.url === url);
                      setEditing({
                        ...editing,
                        url,
                        label: editing.label || (page?.label.toUpperCase() ?? ""),
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a page" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUILTIN_PAGES.map((p) => (
                        <SelectItem key={p.url} value={p.url}>
                          {p.label} <span className="text-muted-foreground text-xs">— {p.url}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {linkMode === "custom" && (
                  <div className="space-y-2">
                    <Input
                      value={editing.url ?? ""}
                      onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                      placeholder="/my-page  or  https://example.com"
                    />
                    <div className="rounded-md border bg-muted/30 p-2.5 space-y-1.5 text-[11px] leading-relaxed">
                      <div className="font-semibold text-foreground">
                        Use this only if your link isn't a main category or a site page.
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Inside your store</span> — type a path that starts with <code className="px-1 rounded bg-background">/</code>
                        <div className="text-muted-foreground">e.g. <code>/sale</code>, <code>/blog/summer-guide</code></div>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">External website</span> — paste the full link starting with <code className="px-1 rounded bg-background">https://</code>
                        <div className="text-muted-foreground">e.g. <code>https://instagram.com/yourstore</code></div>
                      </div>
                      <div className="flex gap-1.5 pt-1 flex-wrap">
                        {["/sale", "/blog", "https://wa.me/919999999999"].map((ex) => (
                          <button
                            key={ex}
                            type="button"
                            onClick={() => setEditing({ ...editing, url: ex })}
                            className="px-2 py-0.5 rounded border bg-background hover:bg-accent text-[10px] font-mono"
                          >
                            {ex}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Step 2 · Label shown on the nav bar
                </label>
                <Input
                  value={editing.label ?? ""}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  placeholder="e.g. NEW ARRIVALS"
                />
              </div>

              {(editing.label || editing.url) && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1.5">Preview</div>
                  <div className="inline-flex items-center gap-1.5 text-sm font-bold tracking-wide text-foreground">
                    {editing.label || <span className="text-muted-foreground italic">add a label…</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                    <Link2 className="w-3 h-3" /> {editing.url || "(no URL yet)"}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <label className="text-sm">Visible on site</label>
                <Switch
                  checked={editing.visible ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, visible: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => upsert.mutate(editing)} disabled={upsert.isPending}>
                {upsert.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminNavBar;
