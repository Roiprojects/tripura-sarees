import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Loader2, Tag, Percent, IndianRupee, Truck, Package, Layers, Award, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { COUPON_TYPE_LABEL, type CouponType } from "@/lib/coupon";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  coupon_type: CouponType;
  discount_type: string;
  discount_value: number;
  max_discount: number | null;
  min_order: number;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  per_user_limit: number | null;
  times_used: number;
  applicable_product_ids: string[];
  applicable_category_ids: string[];
  applicable_brands: string[];
  preorder_only: boolean;
  first_order_only: boolean;
  active: boolean;
};

const TYPE_ICON: Record<CouponType, any> = {
  percentage: Percent,
  fixed: IndianRupee,
  free_shipping: Truck,
  product: Package,
  category: Layers,
  brand: Award,
  min_order: Tag,
  first_order: Sparkles,
  preorder: Package,
};

const emptyForm: Partial<Coupon> = {
  code: "",
  description: "",
  coupon_type: "percentage",
  discount_type: "percent",
  discount_value: 10,
  max_discount: null,
  min_order: 0,
  starts_at: null,
  expires_at: null,
  usage_limit: null,
  per_user_limit: null,
  applicable_product_ids: [],
  applicable_category_ids: [],
  applicable_brands: [],
  preorder_only: false,
  first_order_only: false,
  active: true,
};

const toISO = (v: string | null | undefined) => (v ? v : null);
const fromISO = (v: string | null | undefined) => (v ? v.slice(0, 16) : "");

const AdminCoupons = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<Coupon>>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons" as any).select("*").order("created_at" as any, { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Coupon[];
    },
  });

  const { data: usageStats } = useQuery({
    queryKey: ["coupon-usage"],
    queryFn: async () => {
      const { data } = await supabase
        .from("coupon_redemptions" as any)
        .select("coupon_id, discount_amount");
      const map: Record<string, { count: number; total: number }> = {};
      (data ?? []).forEach((r: any) => {
        const cur = map[r.coupon_id] ?? { count: 0, total: 0 };
        cur.count += 1;
        cur.total += Number(r.discount_amount ?? 0);
        map[r.coupon_id] = cur;
      });
      return map;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["coupons-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, brand, category_id").order("name");
      return (data ?? []) as any[];
    },
  });
  const { data: categories } = useQuery({
    queryKey: ["coupons-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      return (data ?? []) as any[];
    },
  });
  const brands = useMemo(() => {
    const set = new Set<string>();
    (products ?? []).forEach((p: any) => p.brand && set.add(p.brand));
    return [...set].sort();
  }, [products]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        code: (form.code ?? "").toUpperCase().trim(),
        description: form.description || null,
        coupon_type: form.coupon_type,
        // Legacy column kept in sync: percentage-like → 'percent', else 'flat'
        discount_type: form.coupon_type === "percentage" ? "percent" : (form.coupon_type === "fixed" ? "flat" : "percent"),
        discount_value: Number(form.discount_value ?? 0),
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        min_order: Number(form.min_order ?? 0),
        starts_at: toISO(form.starts_at as any),
        expires_at: toISO(form.expires_at as any),
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        per_user_limit: form.per_user_limit ? Number(form.per_user_limit) : null,
        applicable_product_ids: form.applicable_product_ids ?? [],
        applicable_category_ids: form.applicable_category_ids ?? [],
        applicable_brands: form.applicable_brands ?? [],
        preorder_only: !!form.preorder_only,
        first_order_only: !!form.first_order_only,
        active: !!form.active,
      };
      if (!payload.code) throw new Error("Code is required");
      if (editingId) {
        const { error } = await supabase.from("coupons" as any).update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      setDialogOpen(false); setEditingId(null); setForm(emptyForm);
      toast.success("Coupon saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["coupons"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const filtered = (coupons ?? []).filter((c) =>
    !search.trim() || c.code.toLowerCase().includes(search.trim().toLowerCase())
  );

  const openNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c: Coupon) => {
    setEditingId(c.id);
    setForm({
      ...c,
      starts_at: fromISO(c.starts_at) as any,
      expires_at: fromISO(c.expires_at) as any,
    });
    setDialogOpen(true);
  };

  const now = Date.now();
  const statusOf = (c: Coupon): { label: string; color: string } => {
    if (!c.active) return { label: "Inactive", color: "bg-muted text-muted-foreground" };
    if (c.expires_at && new Date(c.expires_at).getTime() < now) return { label: "Expired", color: "bg-destructive/10 text-destructive" };
    if (c.usage_limit != null && c.times_used >= c.usage_limit) return { label: "Used up", color: "bg-destructive/10 text-destructive" };
    return { label: "Active", color: "bg-green-100 text-green-700" };
  };

  const t = form.coupon_type as CouponType;
  const showPct = t === "percentage" || t === "product" || t === "category" || t === "brand" || t === "preorder" || t === "first_order" || t === "min_order";
  const showValue = t !== "free_shipping";
  const showProducts = t === "product";
  const showCategories = t === "category";
  const showBrands = t === "brand";

  // Live example
  const exampleText = useMemo(() => {
    if (!showValue) return "Shipping charge will be waived at checkout.";
    const val = Number(form.discount_value ?? 0);
    const cap = form.max_discount ? Number(form.max_discount) : 0;
    const isPct = t === "percentage" || form.discount_type === "percent";
    if (isPct) {
      const on1000 = Math.min(1000 * val / 100, cap || Infinity);
      const on5000 = Math.min(5000 * val / 100, cap || Infinity);
      return `${val}% off${cap ? `, max ₹${cap}` : ""} → ₹1,000 cart = ₹${on1000} off · ₹5,000 cart = ₹${on5000} off`;
    }
    return `Flat ₹${val} off on eligible items (cart must be ≥ ₹${form.min_order ?? 0}).`;
  }, [t, form.discount_value, form.max_discount, form.min_order, form.discount_type, showValue]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Coupons</h1>
          <p className="text-sm text-muted-foreground">Create discounts, free shipping, product-, category-, and brand-specific offers.</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1.5" /> New coupon</Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by code…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 max-w-sm" />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-3">Code</th>
                <th className="p-3">Type</th>
                <th className="p-3">Value</th>
                <th className="p-3">Min order</th>
                <th className="p-3">Used</th>
                <th className="p-3">Total discount</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="p-6 text-center"><Loader2 className="w-4 h-4 animate-spin inline" /></td></tr>
              )}
              {filtered.map((c) => {
                const Icon = TYPE_ICON[c.coupon_type] ?? Tag;
                const stat = statusOf(c);
                const usage = usageStats?.[c.id] ?? { count: 0, total: 0 };
                const valueLabel = c.coupon_type === "free_shipping"
                  ? "Free shipping"
                  : c.coupon_type === "fixed" || c.discount_type !== "percent"
                    ? `₹${c.discount_value}`
                    : `${c.discount_value}%${c.max_discount ? ` (max ₹${c.max_discount})` : ""}`;
                return (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-mono font-semibold">{c.code}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <Icon className="w-3.5 h-3.5" /> {COUPON_TYPE_LABEL[c.coupon_type] ?? c.coupon_type}
                      </span>
                    </td>
                    <td className="p-3">{valueLabel}</td>
                    <td className="p-3">₹{c.min_order}</td>
                    <td className="p-3">{c.times_used}{c.usage_limit != null ? ` / ${c.usage_limit}` : ""}</td>
                    <td className="p-3">₹{Math.round(usage.total)}</td>
                    <td className="p-3"><Badge className={stat.color + " font-semibold"} variant="outline">{stat.label}</Badge></td>
                    <td className="p-3 text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete coupon?")) del.mutate(c.id); }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No coupons yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit coupon" : "New coupon"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <Label>Coupon code</Label>
                <Input
                  value={form.code ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="SAVE10"
                  className="uppercase font-mono"
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={!!form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
                <Label className="!m-0">Active</Label>
              </div>
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Shown to admins only" />
            </div>

            <div>
              <Label>Coupon type</Label>
              <Select value={t} onValueChange={(v) => setForm((f) => ({ ...f, coupon_type: v as CouponType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(COUPON_TYPE_LABEL) as CouponType[]).map((k) => (
                    <SelectItem key={k} value={k}>{COUPON_TYPE_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showValue && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Discount value {showPct ? "(%)" : "(₹)"}</Label>
                  <Input type="number" min="0" value={form.discount_value ?? ""} onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))} />
                </div>
                {showPct && (
                  <div>
                    <Label>Max discount (₹, optional)</Label>
                    <Input type="number" min="0" value={form.max_discount ?? ""} onChange={(e) => setForm((f) => ({ ...f, max_discount: e.target.value ? Number(e.target.value) : null }))} placeholder="No cap" />
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg bg-muted/40 border p-3 text-xs text-muted-foreground">
              <strong>Example:</strong> {exampleText}
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>Min order value (₹)</Label>
                <Input type="number" min="0" value={form.min_order ?? 0} onChange={(e) => setForm((f) => ({ ...f, min_order: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Usage limit (total)</Label>
                <Input type="number" min="0" value={form.usage_limit ?? ""} onChange={(e) => setForm((f) => ({ ...f, usage_limit: e.target.value ? Number(e.target.value) : null }))} placeholder="Unlimited" />
              </div>
              <div>
                <Label>Per-user limit</Label>
                <Input type="number" min="0" value={form.per_user_limit ?? ""} onChange={(e) => setForm((f) => ({ ...f, per_user_limit: e.target.value ? Number(e.target.value) : null }))} placeholder="Unlimited" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Starts at</Label>
                <Input type="datetime-local" value={(form.starts_at as any) ?? ""} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value as any }))} />
              </div>
              <div>
                <Label>Expires at</Label>
                <Input type="datetime-local" value={(form.expires_at as any) ?? ""} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value as any }))} />
              </div>
            </div>

            {showProducts && (
              <div>
                <Label>Applicable products</Label>
                <MultiSelect
                  options={(products ?? []).map((p: any) => ({ value: p.id, label: p.name }))}
                  value={form.applicable_product_ids ?? []}
                  onChange={(v) => setForm((f) => ({ ...f, applicable_product_ids: v }))}
                />
              </div>
            )}
            {showCategories && (
              <div>
                <Label>Applicable categories</Label>
                <MultiSelect
                  options={(categories ?? []).map((c: any) => ({ value: c.id, label: c.name }))}
                  value={form.applicable_category_ids ?? []}
                  onChange={(v) => setForm((f) => ({ ...f, applicable_category_ids: v }))}
                />
              </div>
            )}
            {showBrands && (
              <div>
                <Label>Applicable brands</Label>
                <MultiSelect
                  options={brands.map((b) => ({ value: b, label: b }))}
                  value={form.applicable_brands ?? []}
                  onChange={(v) => setForm((f) => ({ ...f, applicable_brands: v }))}
                />
              </div>
            )}

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={!!form.first_order_only} onCheckedChange={(v) => setForm((f) => ({ ...f, first_order_only: v }))} />
                First order only
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={!!form.preorder_only} onCheckedChange={(v) => setForm((f) => ({ ...f, preorder_only: v }))} />
                Preorder items only
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Small multi-select using checkboxes in a scrollable box (keeps admin dep-free)
const MultiSelect = ({
  options, value, onChange,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) => {
  const [q, setQ] = useState("");
  const filtered = options.filter((o) => !q.trim() || o.label.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };
  return (
    <div className="border rounded-lg">
      <div className="p-2 border-b flex items-center gap-2">
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8" />
        <span className="text-xs text-muted-foreground shrink-0">{value.length} selected</span>
      </div>
      <div className="max-h-52 overflow-y-auto p-2 space-y-1">
        {filtered.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm hover:bg-muted/40 px-2 py-1 rounded cursor-pointer">
            <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />
            <span className="truncate">{o.label}</span>
          </label>
        ))}
        {filtered.length === 0 && <div className="text-xs text-muted-foreground p-2">No matches.</div>}
      </div>
    </div>
  );
};

export default AdminCoupons;
