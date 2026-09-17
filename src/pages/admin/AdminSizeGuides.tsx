import { useMemo, useState } from "react";
import { site } from "@/config/site";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Ruler, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { ImageUploader } from "@/components/admin/ImageUploader";

type Row = Record<string, string | number>;

type Guide = {
  id: string;
  brand: string;
  title: string;
  notes: string | null;
  image_url: string | null;
  measurements: Row[];
};

const DEFAULT_COLS = ["size", "age", "height", "chest", "waist", "shoulder", "length", "sleeve", "hip", "weight"];

const emptyGuide = (): Guide => ({
  id: "",
  brand: "",
  title: "",
  notes: "",
  image_url: null,
  measurements: [{ size: "S" }, { size: "M" }, { size: "L" }],
});

const AdminSizeGuides = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Guide | null>(null);
  const [columns, setColumns] = useState<string[]>(DEFAULT_COLS);
  const [newCol, setNewCol] = useState("");
  const [search, setSearch] = useState("");

  const list = useQuery({
    queryKey: ["admin-size-guides"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("size_guides")
        .select("*")
        .order("brand");
      if (error) throw error;
      return (data ?? []) as Guide[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list.data ?? [];
    return (list.data ?? []).filter((g) =>
      [g.brand, g.title].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [list.data, search]);

  const openEdit = (g?: Guide) => {
    const target = g ? { ...g, measurements: g.measurements ?? [] } : emptyGuide();
    setEditing(target);
    const cols = new Set<string>(DEFAULT_COLS);
    target.measurements.forEach((r) => Object.keys(r).forEach((k) => cols.add(k)));
    // Preserve DEFAULT_COLS order and append extras
    const ordered = [...DEFAULT_COLS.filter((c) => cols.has(c)), ...Array.from(cols).filter((c) => !DEFAULT_COLS.includes(c))];
    setColumns(ordered);
  };

  const save = useMutation({
    mutationFn: async (g: Guide) => {
      if (!g.brand.trim()) throw new Error("Brand is required");
      if (!g.title.trim()) throw new Error("Title is required");
      const payload = {
        brand: g.brand.trim(),
        title: g.title.trim(),
        notes: g.notes?.trim() || null,
        image_url: g.image_url || null,
        measurements: g.measurements,
      };
      if (g.id) {
        const { error } = await (supabase as any).from("size_guides").update(payload).eq("id", g.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("size_guides").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Size guide saved");
      qc.invalidateQueries({ queryKey: ["admin-size-guides"] });
      qc.invalidateQueries({ queryKey: ["size-guide"] });
      qc.invalidateQueries({ queryKey: ["size-guides-picker"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("size_guides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-size-guides"] });
    },
    onError: (e: any) => toast.error(e.message || "Delete failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 grid place-items-center shadow-lg">
          <Ruler className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Brand Size Guides</h1>
          <p className="text-slate-500 text-sm">Create per-brand size charts and assign them to products.</p>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search brand or title…"
          className="w-64 bg-white"
        />
        <Button onClick={() => openEdit()} className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> New Size Guide
        </Button>
      </div>

      <Card className="rounded-2xl overflow-hidden">
        {list.isLoading ? (
          <div className="p-16 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-500">No size guides yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider">Brand</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider">Title</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider">Rows</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="border-t hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-semibold">{g.brand}</td>
                  <td className="px-5 py-3">{g.title}</td>
                  <td className="px-5 py-3 text-slate-500">{g.measurements?.length ?? 0} sizes</td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(g)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => confirm("Delete this size guide?") && del.mutate(g.id)} className="hover:bg-rose-100 hover:text-rose-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit size guide" : "New size guide"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Brand</label>
                  <Input value={editing.brand} onChange={(e) => setEditing({ ...editing, brand: e.target.value })} placeholder={`e.g. ${site.brand.name}`} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Title</label>
                  <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Readymade blouse size chart" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Notes / instructions</label>
                <textarea
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  className="w-full min-h-[70px] rounded-md border p-3 text-sm"
                  placeholder="How to measure, fit tips, etc."
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Optional size chart image</label>
                <ImageUploader
                  value={editing.image_url ? [editing.image_url] : []}
                  onChange={(urls) => setEditing({ ...editing, image_url: urls[0] ?? null })}
                />
              </div>

              <div className="rounded-xl border overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border-b">
                  <span className="text-xs font-semibold text-slate-700">Measurements table</span>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newCol}
                      onChange={(e) => setNewCol(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newCol.trim()) {
                          e.preventDefault();
                          const k = newCol.trim().toLowerCase().replace(/\s+/g, "_");
                          if (!columns.includes(k)) setColumns([...columns, k]);
                          setNewCol("");
                        }
                      }}
                      placeholder="Add column (e.g. sleeve)"
                      className="h-8 text-xs w-40 bg-white"
                    />
                    <Button
                      type="button" size="sm" variant="outline" className="h-8 text-xs"
                      onClick={() => setEditing({ ...editing, measurements: [...editing.measurements, { size: "" }] })}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add row
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        {columns.map((c) => (
                          <th key={c} className="px-2 py-2 text-left capitalize">{c.replace(/_/g, " ")}</th>
                        ))}
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {editing.measurements.map((row, i) => (
                        <tr key={i} className="border-t">
                          {columns.map((c) => (
                            <td key={c} className="px-2 py-1">
                              <Input
                                value={row[c] ?? ""}
                                onChange={(e) => {
                                  const next = [...editing.measurements];
                                  next[i] = { ...next[i], [c]: e.target.value };
                                  setEditing({ ...editing, measurements: next });
                                }}
                                className="h-8 text-sm"
                              />
                            </td>
                          ))}
                          <td className="px-1 py-1">
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-rose-50 text-rose-500"
                              onClick={() => setEditing({ ...editing, measurements: editing.measurements.filter((_, x) => x !== i) })}
                              title="Remove row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending} className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white">
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSizeGuides;
