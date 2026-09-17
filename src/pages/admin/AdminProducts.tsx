import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Plus, Pencil, Trash2, Search, Loader2, Package, Star, TrendingUp,
  Sparkles, Boxes, Layers, AlertTriangle, Download, ImageOff,
} from "lucide-react";
import { toast } from "sonner";
import { resolveImage } from "@/lib/resolveImage";
import { formatINR } from "@/lib/format";

const AdminProducts = () => {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "low" | "out">("all");

  const list = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, category:categories(id,name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const all = list.data ?? [];

  const stats = useMemo(() => {
    const total = all.length;
    const inStock = all.filter((r: any) => (r.stock ?? 0) > 5).length;
    const low = all.filter((r: any) => (r.stock ?? 0) > 0 && (r.stock ?? 0) <= 5).length;
    const out = all.filter((r: any) => (r.stock ?? 0) === 0).length;
    const featured = all.filter((r: any) => r.is_featured).length;
    const value = all.reduce((s: number, r: any) => s + Number(r.price ?? 0) * Number(r.stock ?? 0), 0);
    return { total, inStock, low, out, featured, value };
  }, [all]);

  const filtered = useMemo(() => {
    let rows = all;
    if (stockFilter === "in") rows = rows.filter((r: any) => (r.stock ?? 0) > 5);
    else if (stockFilter === "low") rows = rows.filter((r: any) => (r.stock ?? 0) > 0 && (r.stock ?? 0) <= 5);
    else if (stockFilter === "out") rows = rows.filter((r: any) => (r.stock ?? 0) === 0);
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r: any) =>
      [r.name, r.sku, r.sku_id, r.design_number, r.brand, r.collection, r.gender, r.category?.name]
        .filter(Boolean)
        .some((x: string) => String(x).toLowerCase().includes(q)),
    );
  }, [all, search, stockFilter]);

  const del = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const toggleSel = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const stockBadge = (n: number) => {
    if (n === 0) return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    if (n <= 5) return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  };

  const tabs: { key: typeof stockFilter; label: string; count: number; tint: string }[] = [
    { key: "all", label: "All", count: stats.total, tint: "from-violet-500 to-fuchsia-500" },
    { key: "in", label: "In stock", count: stats.inStock, tint: "from-emerald-500 to-teal-500" },
    { key: "low", label: "Low stock", count: stats.low, tint: "from-amber-500 to-orange-500" },
    { key: "out", label: "Out", count: stats.out, tint: "from-rose-500 to-red-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Premium header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-6 shadow-sm">
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-gradient-to-br from-fuchsia-300/40 to-violet-300/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-gradient-to-br from-sky-200/40 to-emerald-200/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
            <Package className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/70 backdrop-blur px-2.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200">
              <Sparkles className="w-3 h-3" /> Catalog
            </div>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900">Products</h1>
            <p className="text-slate-500 text-sm">{stats.total} products · {stats.featured} featured · catalog value {formatINR(stats.value)}</p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, SKU, design #, brand, category…"
              className="pl-9 w-80 bg-white/80 backdrop-blur border-slate-200"
            />
          </div>
          {selected.size > 0 && (
            <Button variant="destructive" onClick={() => { if (confirm(`Delete ${selected.size} products?`)) del.mutate([...selected]); }}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete ({selected.size})
            </Button>
          )}
          <Button variant="outline" className="bg-white/70 backdrop-blur border-slate-200">
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <Button onClick={() => nav("/admin/products/new")} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-95 text-white shadow-lg shadow-fuchsia-500/30">
            <Plus className="w-4 h-4 mr-1" /> Add Product
          </Button>
        </div>

        {/* KPI pills */}
        <div className="relative mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi icon={<Boxes className="w-4 h-4" />} label="Total" value={stats.total} tint="from-violet-500 to-fuchsia-500" />
          <Kpi icon={<Layers className="w-4 h-4" />} label="In stock" value={stats.inStock} tint="from-emerald-500 to-teal-500" />
          <Kpi icon={<AlertTriangle className="w-4 h-4" />} label="Low stock" value={stats.low} tint="from-amber-500 to-orange-500" />
          <Kpi icon={<Star className="w-4 h-4" />} label="Featured" value={stats.featured} tint="from-sky-500 to-indigo-500" />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = stockFilter === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setStockFilter(t.key)}
              className={`group inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                active
                  ? `border-transparent text-white bg-gradient-to-r ${t.tint} shadow-md`
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.label}
              <span className={`text-[11px] rounded-full px-1.5 py-0.5 ${active ? "bg-white/25" : "bg-slate-100 text-slate-600"}`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      <Card className="rounded-3xl overflow-hidden border-slate-200/70 shadow-sm">
        {list.isLoading ? (
          <div className="p-16 text-center text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading catalog…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <ImageOff className="w-6 h-6 text-slate-400" />
            </div>
            No products match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-50/40 text-left text-slate-600">
                <tr>
                  <th className="px-5 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((r: any) => r.id)) : new Set())}
                    />
                  </th>
                  <th className="px-5 py-3.5 font-semibold uppercase text-[11px] tracking-wider">Product</th>
                  <th className="px-5 py-3.5 font-semibold uppercase text-[11px] tracking-wider">SKU / Design</th>
                  <th className="px-5 py-3.5 font-semibold uppercase text-[11px] tracking-wider">Brand</th>
                  <th className="px-5 py-3.5 font-semibold uppercase text-[11px] tracking-wider">Category</th>
                  <th className="px-5 py-3.5 font-semibold uppercase text-[11px] tracking-wider">Price</th>
                  <th className="px-5 py-3.5 font-semibold uppercase text-[11px] tracking-wider">Stock</th>
                  <th className="px-5 py-3.5 font-semibold uppercase text-[11px] tracking-wider">Flags</th>
                  <th className="px-5 py-3.5 w-32 text-right font-semibold uppercase text-[11px] tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row: any) => {
                  const stock = Number(row.stock ?? 0);
                  return (
                    <tr key={row.id} className="border-t border-slate-100 hover:bg-violet-50/30 transition-colors">
                      <td className="px-5 py-3">
                        <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSel(row.id)} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={resolveImage(row.images?.[0])}
                              alt=""
                              className="w-12 h-12 rounded-xl object-cover bg-slate-100 ring-1 ring-slate-200"
                            />
                            {row.is_featured && (
                              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-400 ring-2 ring-white flex items-center justify-center">
                                <Star className="w-2.5 h-2.5 text-white fill-white" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate max-w-[220px]">{row.name}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[220px]">
                              {row.collection || row.gender || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[12px] text-slate-600 bg-slate-100 rounded px-1.5 py-0.5 w-fit">
                            {row.sku_id ?? row.sku ?? "—"}
                          </span>
                          {row.design_number && (
                            <span className="text-[10px] text-slate-500">
                              Design: <span className="font-mono">{row.design_number}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600 text-xs">{row.brand ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-600">{row.category?.name ?? "—"}</td>
                      <td className="px-5 py-3 font-semibold text-slate-900">{formatINR(Number(row.price))}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${stockBadge(stock)}`}>
                          {stock === 0 ? "Out" : stock} {stock > 0 && <span className="opacity-60 ml-1">units</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          {row.is_featured && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded-full px-2 py-0.5">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Featured
                            </span>
                          )}
                          {row.is_trending && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-full px-2 py-0.5">
                              <TrendingUp className="w-3 h-3" /> Trending
                            </span>
                          )}
                          {!row.is_featured && !row.is_trending && <span className="text-slate-300 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => nav(`/admin/products/${row.id}`)} className="hover:bg-violet-100 hover:text-violet-700">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this product?")) del.mutate([row.id]); }} className="hover:bg-rose-100 hover:text-rose-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

const Kpi = ({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: number | string; tint: string }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur px-3.5 py-2.5 shadow-sm">
    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${tint} text-white flex items-center justify-center shadow`}>
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-900 leading-tight">{value}</div>
    </div>
  </div>
);

export default AdminProducts;
