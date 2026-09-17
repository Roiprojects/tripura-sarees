import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Mail, Phone, MapPin, Calendar, Package, IndianRupee,
  User as UserIcon, Search, Sparkles, Users as UsersIcon, TrendingUp, ChevronRight,
} from "lucide-react";
import { formatINR } from "@/lib/format";

const initials = (name: string, email: string) => {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || src[0]?.toUpperCase() || "?";
};

const gradientFor = (seed: string) => {
  const palettes = [
    "from-indigo-500 to-violet-500",
    "from-rose-500 to-orange-500",
    "from-emerald-500 to-teal-500",
    "from-sky-500 to-cyan-500",
    "from-amber-500 to-pink-500",
    "from-fuchsia-500 to-purple-500",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
};

const variantKey = (productId?: string | null, color?: string | null) =>
  `${productId ?? ""}|${String(color ?? "").trim().toLowerCase()}`;

const AdminUsers = () => {
  const [selected, setSelected] = useState<any | null>(null);
  const [q, setQ] = useState("");

  const users = useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Order counts per user (for stats + per-row badge)
  const orderStats = useQuery({
    queryKey: ["admin", "user-order-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("user_id, total");
      if (error) throw error;
      const map = new Map<string, { count: number; spent: number }>();
      (data ?? []).forEach((o: any) => {
        const cur = map.get(o.user_id) || { count: 0, spent: 0 };
        cur.count += 1;
        cur.spent += Number(o.total || 0);
        map.set(o.user_id, cur);
      });
      return map;
    },
  });

  const detail = useQuery({
    queryKey: ["admin", "user-detail", selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(name, images))")
        .eq("user_id", selected.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ordersData = data ?? [];
      const productIds = Array.from(new Set(
        ordersData.flatMap((o: any) => (o.order_items ?? []).map((it: any) => it.product_id).filter(Boolean))
      ));
      if (productIds.length) {
        const { data: colorRows } = await supabase
          .from("product_color_variants")
          .select("product_id, color_name, images")
          .in("product_id", productIds);
        const colorMap = new Map(
          (colorRows ?? []).map((row: any) => [variantKey(row.product_id, row.color_name), row.images?.[0] ?? null])
        );
        ordersData.forEach((o: any) => {
          (o.order_items ?? []).forEach((it: any) => {
            it.variant_image = colorMap.get(variantKey(it.product_id, it.color)) ?? null;
          });
        });
      }
      return ordersData;
    },
  });

  const list = users.data ?? [];
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((u: any) =>
      [u.full_name, u.email, u.phone].some((v) => (v || "").toLowerCase().includes(t)),
    );
  }, [list, q]);

  const totalCustomers = list.length;
  const activeBuyers = orderStats.data ? Array.from(orderStats.data.values()).filter((s) => s.count > 0).length : 0;
  const lifetimeRevenue = orderStats.data ? Array.from(orderStats.data.values()).reduce((s, x) => s + x.spent, 0) : 0;
  const newThisMonth = list.filter((u: any) => {
    const d = new Date(u.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const totalSpent = (detail.data ?? []).reduce((s: number, o: any) => s + Number(o.total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Premium header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-violet-100/60 via-background to-rose-100/40 p-6 md:p-8 shadow-sm">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-violet-300/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-rose-300/30 blur-3xl pointer-events-none" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 bg-white/70 backdrop-blur px-2.5 py-1 rounded-full ring-1 ring-violet-200">
              <Sparkles className="w-3 h-3" /> Customer Intelligence
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-display font-bold tracking-tight">Customers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap any customer to see their full profile, addresses & order history.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
            <Kpi icon={<UsersIcon className="w-4 h-4" />} label="Total" value={String(totalCustomers)} tint="bg-white/80 text-foreground" />
            <Kpi icon={<TrendingUp className="w-4 h-4" />} label="Buyers" value={String(activeBuyers)} tint="bg-emerald-50 text-emerald-700" />
            <Kpi icon={<IndianRupee className="w-4 h-4" />} label="LTV" value={formatINR(lifetimeRevenue)} tint="bg-violet-50 text-violet-700" />
            <Kpi icon={<Sparkles className="w-4 h-4" />} label="New" value={String(newThisMonth)} tint="bg-rose-50 text-rose-700" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="pl-9 rounded-full bg-background/80 backdrop-blur border-border/70"
        />
      </div>

      {/* Customers grid */}
      {users.isLoading ? (
        <Card className="p-12 text-center text-muted-foreground rounded-3xl">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading customers…
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground rounded-3xl">No customers found</Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((u: any) => {
            const stat = orderStats.data?.get(u.id);
            const name = u.full_name || (u.email?.split("@")[0]) || "Customer";
            const grad = gradientFor(u.id);
            return (
              <button
                key={u.id}
                onClick={() => setSelected(u)}
                className="group text-left relative overflow-hidden rounded-2xl border border-border/60 bg-card hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all duration-200 p-5"
              >
                <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-br ${grad} opacity-90`} />
                <div className="relative flex items-start gap-3">
                  <div className={`w-14 h-14 rounded-2xl ring-4 ring-card bg-gradient-to-br ${grad} text-white font-display font-bold text-lg flex items-center justify-center shadow-md shrink-0`}>
                    {initials(u.full_name, u.email)}
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="font-display font-semibold text-base text-white drop-shadow truncate">{name}</div>
                    <div className="text-[11px] text-white/90 truncate">{u.email || "no email"}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition" />
                </div>

                <div className="mt-14 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {u.phone || "—"}</div>
                  <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Joined {new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                </div>

                <div className="mt-4 flex items-center gap-2 pt-3 border-t border-dashed border-border/60">
                  <Badge variant="secondary" className="rounded-full text-[10px] font-semibold">
                    <Package className="w-3 h-3 mr-1" /> {stat?.count ?? 0} orders
                  </Badge>
                  <Badge className="rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    {formatINR(stat?.spent ?? 0)}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="sr-only">{selected.full_name || "Customer"}</DialogTitle>
              </DialogHeader>

              {/* Hero */}
              <div className={`relative -mx-6 -mt-6 px-6 pt-8 pb-6 bg-gradient-to-br ${gradientFor(selected.id)}`}>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl ring-4 ring-white/30 bg-white/20 backdrop-blur text-white font-display font-bold text-2xl flex items-center justify-center">
                    {initials(selected.full_name, selected.email)}
                  </div>
                  <div className="min-w-0 text-white">
                    <div className="text-xs uppercase tracking-wider text-white/80">Customer profile</div>
                    <div className="font-display font-bold text-2xl truncate">{selected.full_name || "—"}</div>
                    <div className="text-sm text-white/90 truncate">{selected.email}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-5 mt-2">
                {/* Profile */}
                <Card className="p-4 rounded-2xl">
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <Info icon={<Mail className="w-4 h-4" />} label="Email" value={selected.email || "—"} />
                    <Info icon={<Phone className="w-4 h-4" />} label="Phone" value={selected.phone || "—"} />
                    <Info icon={<Calendar className="w-4 h-4" />} label="Joined" value={new Date(selected.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
                    {selected.address && (
                      <div className="sm:col-span-2 flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Default address</div>
                          <div className="text-sm">{selected.address}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-transparent">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1"><Package className="w-3 h-3" /> Total Orders</div>
                    <div className="text-3xl font-bold font-display mt-1">{detail.data?.length ?? 0}</div>
                  </Card>
                  <Card className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-transparent">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Lifetime Value</div>
                    <div className="text-3xl font-bold font-display mt-1">{formatINR(totalSpent)}</div>
                  </Card>
                </div>

                {/* Orders */}
                <div>
                  <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Order History
                  </h3>
                  {detail.isLoading ? (
                    <div className="p-6 text-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…</div>
                  ) : (detail.data ?? []).length === 0 ? (
                    <Card className="p-6 text-center text-sm text-muted-foreground rounded-2xl">No orders yet</Card>
                  ) : (
                    <div className="space-y-3">
                      {(detail.data ?? []).map((o: any) => {
                        const addr = o.shipping_address || {};
                        return (
                          <Card key={o.id} className="p-4 rounded-2xl border-border/60">
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                              <div>
                                <div className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</div>
                                <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="capitalize rounded-full">{o.payment_method || "—"}</Badge>
                                <Badge className="capitalize rounded-full">{o.status}</Badge>
                                <div className="font-display font-bold">{formatINR(Number(o.total))}</div>
                              </div>
                            </div>

                            {(addr.name || addr.full_name || addr.line1 || addr.phone) && (
                              <div className="text-xs bg-muted/40 rounded-xl p-3 mb-3">
                                <div className="font-semibold text-foreground mb-1 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> Delivery Address
                                </div>
                                <div className="text-muted-foreground leading-relaxed">
                                  {(addr.full_name || addr.name) && <div>{addr.full_name || addr.name}{addr.phone ? ` · ${addr.phone}` : ""}</div>}
                                  {addr.line1 && <div>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</div>}
                                  {(addr.city || addr.state || addr.pincode) && (
                                    <div>{[addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}</div>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="space-y-2">
                              {(o.order_items ?? []).map((it: any) => (
                                <div key={it.id} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-muted/40">
                                  {(it.variant_image || it.product_image || it.products?.images?.[0]) ? (
                                    <img src={it.variant_image || it.product_image || it.products.images[0]} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }} className="w-12 h-12 rounded-lg object-cover ring-1 ring-border/60" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                      <Package className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="truncate font-medium">{it.product_name || it.products?.name || "Product"}</div>
                                    <div className="text-[11px] text-muted-foreground">
                                      {it.size && `Size ${it.size}`}{it.color ? ` · ${it.color}` : ""} · Qty {it.quantity}
                                    </div>
                                  </div>
                                  <div className="font-semibold">{formatINR(Number(it.price) * it.quantity)}</div>
                                </div>
                              ))}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Kpi = ({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: string }) => (
  <div className={`rounded-2xl px-3.5 py-2.5 backdrop-blur ring-1 ring-border/60 shadow-sm ${tint}`}>
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">{icon} {label}</div>
    <div className="mt-0.5 text-lg font-display font-bold leading-none">{value}</div>
  </div>
);

const Info = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <div className="text-muted-foreground mt-0.5">{icon}</div>
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-sm truncate">{value}</div>
    </div>
  </div>
);

export default AdminUsers;
