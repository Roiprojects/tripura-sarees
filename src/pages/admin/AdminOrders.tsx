import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck, ChevronDown, ChevronUp, Save, ExternalLink, Package, IndianRupee, ShoppingBag, Clock, Sparkles, CreditCard, Smartphone, Banknote, Wallet, Landmark } from "lucide-react";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";
import { TRACK_STAGES } from "@/components/OrderTracking";
import { computeEta, isLocalDeliveryAddress, toDateInput } from "@/lib/delivery";
import { site } from "@/config/site";

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  confirmed: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  shipped: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

const variantKey = (productId?: string | null, color?: string | null) =>
  `${productId ?? ""}|${String(color ?? "").trim().toLowerCase()}`;

const AdminOrders = () => {
  const qc = useQueryClient();
  const [openRow, setOpenRow] = useState<string | null>(null);

  const orders = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total, status, cancelled_at, cancellation_reason, created_at, user_id, shipping_address, payment_method, payment_status, razorpay_payment_id, order_items(id, product_id, product_name, product_image, quantity, size, color, price, status, cancelled_at, cancellation_reason, products(name, images))")
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

  const upd = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
      if (status === "delivered") {
        supabase.functions
          .invoke("send-delivery-sms", { body: { order_id: id } })
          .then(({ error }) => error && console.error("delivery sms failed", error));
      }
    },
    onSuccess: () => { toast.success("Order updated"); qc.invalidateQueries({ queryKey: ["admin", "orders"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const data = orders.data ?? [];
  const totalRevenue = data.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
  const pendingCount = data.filter((o: any) => o.status === "pending").length;
  const deliveredCount = data.filter((o: any) => o.status === "delivered").length;

  return (
    <div className="space-y-6">
      {/* Premium header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-sky-100/40 p-6 md:p-8 shadow-sm">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-sky-200/30 blur-3xl pointer-events-none" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary bg-white/70 backdrop-blur px-2.5 py-1 rounded-full ring-1 ring-primary/20">
              <Sparkles className="w-3 h-3" /> Operations
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-display font-bold tracking-tight">Orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage live tracking, update status & notify customers in real time.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
            <KpiPill icon={<ShoppingBag className="w-4 h-4" />} label="Total" value={String(data.length)} tint="bg-white/80 text-foreground" />
            <KpiPill icon={<IndianRupee className="w-4 h-4" />} label="Revenue" value={formatINR(totalRevenue)} tint="bg-emerald-50 text-emerald-700" />
            <KpiPill icon={<Clock className="w-4 h-4" />} label="Pending" value={String(pendingCount)} tint="bg-amber-50 text-amber-700" />
            <KpiPill icon={<Package className="w-4 h-4" />} label="Delivered" value={String(deliveredCount)} tint="bg-sky-50 text-sky-700" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl overflow-hidden border-border/60 shadow-sm">
        {orders.isLoading ? (
          <div className="p-12 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-muted/60 to-muted/30 text-left">
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3.5 font-semibold">Order</th>
                  <th className="px-5 py-3.5 font-semibold">Items</th>
                  <th className="px-5 py-3.5 font-semibold">Customer</th>
                  <th className="px-5 py-3.5 font-semibold">Payment</th>
                  <th className="px-5 py-3.5 font-semibold">Total</th>
                  <th className="px-5 py-3.5 font-semibold">Date</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Tracking</th>
                </tr>
              </thead>
              <tbody>
                {data.map((o: any) => (
                  <FragmentRow
                    key={o.id}
                    o={o}
                    isOpen={openRow === o.id}
                    onToggle={() => setOpenRow(openRow === o.id ? null : o.id)}
                    onStatus={(status) => upd.mutate({ id: o.id, status })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

const KpiPill = ({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: string }) => (
  <div className={`rounded-2xl px-3.5 py-2.5 backdrop-blur ring-1 ring-border/60 shadow-sm ${tint}`}>
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">
      {icon} {label}
    </div>
    <div className="mt-0.5 text-lg font-display font-bold leading-none">{value}</div>
  </div>
);

const PaymentBadge = ({ method, status, paymentId }: { method?: string; status?: string; paymentId?: string | null }) => {
  const m = (method || "").toLowerCase();
  const pid = (paymentId || "").toLowerCase();

  // Resolve label + icon + tint
  let label = "Unknown";
  let sub = "";
  let Icon: any = CreditCard;
  let tint = "bg-slate-50 text-slate-700 ring-slate-200";

  if (m === "cod" || m.includes("cash")) {
    label = "Cash on Delivery";
    sub = "Pay at door";
    Icon = Banknote;
    tint = "bg-amber-50 text-amber-700 ring-amber-200";
  } else if (m === "wallet") {
    label = "Wallet";
    sub = `${site.brand.name} balance`;
    Icon = Wallet;
    tint = "bg-violet-50 text-violet-700 ring-violet-200";
  } else if (m === "upi" || pid.includes("upi")) {
    label = "UPI";
    sub = "GPay · PhonePe · Paytm";
    Icon = Smartphone;
    tint = "bg-emerald-50 text-emerald-700 ring-emerald-200";
  } else if (m === "card" || m === "credit_card" || m === "debit_card") {
    label = "Card";
    sub = "Credit / Debit";
    Icon = CreditCard;
    tint = "bg-sky-50 text-sky-700 ring-sky-200";
  } else if (m === "netbanking" || m === "net_banking") {
    label = "Net Banking";
    Icon = Landmark;
    tint = "bg-indigo-50 text-indigo-700 ring-indigo-200";
  } else if (m === "razorpay" || m === "online" || paymentId) {
    label = "Online";
    sub = "Card · UPI · NetBanking";
    Icon = CreditCard;
    tint = "bg-sky-50 text-sky-700 ring-sky-200";
  } else if (m) {
    label = method!;
  }

  const paid = status === "paid";
  const refunded = status === "refunded";

  return (
    <div className="space-y-1">
      <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ${tint}`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[11px] font-semibold">{label}</span>
      </div>
      {sub && <div className="text-[10px] text-muted-foreground leading-tight">{sub}</div>}
      {status && (
        <div className={`text-[10px] font-semibold uppercase tracking-wider ${paid ? "text-emerald-600" : refunded ? "text-rose-600" : "text-muted-foreground"}`}>
          {status}
        </div>
      )}
    </div>
  );
};


const FragmentRow = ({ o, isOpen, onToggle, onStatus }: any) => {
  const addr = o.shipping_address || {};
  const customerName = addr.full_name || addr.name || "—";
  const phone = addr.phone || addr.mobile || "";
  const items = o.order_items ?? [];
  const firstItem = items[0];
  const productName = firstItem?.product_name || firstItem?.products?.name || "Product";
  const productImg = firstItem?.variant_image || firstItem?.product_image || firstItem?.products?.images?.[0];
  const extraCount = items.length - 1;
  const totalQty = items.reduce((s: number, it: any) => s + (it.quantity || 0), 0);

  return (
    <>
      <tr className="border-t border-border/60 hover:bg-muted/30 transition-colors align-top">
        <td className="px-5 py-4">
          <div className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</div>
        </td>
        <td className="px-5 py-4">
          <div className="space-y-1.5 max-w-[320px]">
            {items.map((it: any) => {
              const img = it.variant_image || it.product_image || it.products?.images?.[0];
              const name = it.product_name || it.products?.name || "Product";
              const cancelled = it.status === "cancelled";
              return (
                <div key={it.id} className="flex items-center gap-2.5">
                  {img ? (
                    <img src={img} alt={name} onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }} className={`w-9 h-9 rounded-md object-cover ring-1 ring-border/60 shrink-0 ${cancelled ? "grayscale opacity-60" : ""}`} />
                  ) : (
                    <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Package className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium truncate leading-tight ${cancelled ? "line-through text-muted-foreground" : ""}`}>{name}</div>
                    <div className="text-[10.5px] text-muted-foreground leading-tight flex items-center gap-1.5 flex-wrap">
                      <span>{it.size && `Size ${it.size}`}{it.color ? ` · ${it.color}` : ""} · Qty {it.quantity}</span>
                      {cancelled && <span className="text-[9px] font-bold uppercase text-rose-700 bg-rose-100 rounded px-1 py-px">Cancelled</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </td>

        <td className="px-5 py-4">
          <div className="font-medium text-sm">{customerName}</div>
          {phone && (
            <a href={`tel:${phone}`} className="text-[11px] text-muted-foreground hover:text-primary font-mono">
              📱 {phone}
            </a>
          )}
        </td>
        <td className="px-5 py-4">
          <PaymentBadge method={o.payment_method} status={o.payment_status} paymentId={o.razorpay_payment_id} />
        </td>
        <td className="px-5 py-4 font-display font-bold">{formatINR(Number(o.total))}</td>
        <td className="px-5 py-4 text-muted-foreground text-xs">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
        <td className="px-5 py-4">
          <div className={`inline-flex items-center gap-2 rounded-full pl-1.5 pr-1 py-1 ${STATUS_STYLE[o.status] ?? "bg-muted text-foreground ring-1 ring-border"}`}>
            <span className="text-[11px] font-semibold capitalize px-1.5">{o.status}</span>
            <select
              value={o.status}
              onChange={(e) => onStatus(e.target.value)}
              className="bg-white/70 hover:bg-white rounded-full text-[11px] font-medium px-2 py-0.5 border-0 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              aria-label="Change status"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </td>
        <td className="px-5 py-4 text-right">
          <Button size="sm" variant={isOpen ? "default" : "outline"} className="rounded-full shadow-sm" onClick={onToggle}>
            <Truck className="w-3.5 h-3.5 mr-1.5" /> {isOpen ? "Close" : "Manage"}
            {isOpen ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </Button>
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-gradient-to-br from-muted/30 to-transparent">
          <td colSpan={8} className="p-5">
            {o.status === "cancelled" && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-rose-500" /> Order cancelled
                  {o.cancelled_at && <span className="font-normal opacity-80">· {new Date(o.cancelled_at).toLocaleString("en-IN")}</span>}
                </div>
                {o.cancellation_reason && <div className="text-sm mt-1">Reason: {o.cancellation_reason}</div>}
              </div>
            )}
            {items.length > 0 && (() => {
              const cancelledItems = items.filter((it: any) => it.status === "cancelled");
              const activeItems = items.filter((it: any) => it.status !== "cancelled");
              return (
                <div className="mb-4 rounded-xl border border-border/60 bg-background p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Order items</div>
                    {cancelledItems.length > 0 && (
                      <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-full px-2 py-0.5">
                        {cancelledItems.length} cancelled · {activeItems.length} active
                      </span>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {items.map((it: any) => {
                      const itemCancelled = it.status === "cancelled";
                      return (
                        <div key={it.id} className={`flex items-center gap-3 p-2 rounded-lg ${itemCancelled ? "bg-rose-50/60 ring-1 ring-rose-200" : "hover:bg-muted/40"}`}>
                          {(it.variant_image || it.product_image || it.products?.images?.[0]) ? (
                            <img src={it.variant_image || it.product_image || it.products.images[0]} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }} className={`w-10 h-10 rounded-md object-cover ring-1 ring-border/60 ${itemCancelled ? "grayscale opacity-70" : ""}`} />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground" /></div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <div className={`text-sm font-medium truncate ${itemCancelled ? "line-through text-muted-foreground" : ""}`}>{it.product_name || it.products?.name || "Product"}</div>
                              {itemCancelled && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 rounded px-1.5 py-0.5 shrink-0">Cancelled</span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {it.size && `Size ${it.size}`}{it.color ? ` · ${it.color}` : ""} · Qty {it.quantity}
                            </div>
                            {itemCancelled && it.cancellation_reason && (
                              <div className="text-[11px] text-rose-700/80 truncate mt-0.5">Reason: {it.cancellation_reason}</div>
                            )}
                          </div>
                          <div className={`text-sm font-semibold ${itemCancelled ? "line-through text-muted-foreground" : ""}`}>{formatINR(Number(it.price) * it.quantity)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            <TrackingEditor orderId={o.id} shippingAddress={o.shipping_address} createdAt={o.created_at} />
          </td>
        </tr>
      )}

    </>
  );
};

const TrackingEditor = ({ orderId, shippingAddress, createdAt }: { orderId: string; shippingAddress?: any; createdAt?: string }) => {
  const qc = useQueryClient();

  const tracking = useQuery({
    queryKey: ["admin-tracking", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("order_tracking").select("*").eq("order_id", orderId).maybeSingle();
      return data;
    },
  });

  const couriers = useQuery({
    queryKey: ["couriers"],
    queryFn: async () => {
      const { data } = await supabase.from("courier_details").select("*").eq("active", true).order("name");
      return data ?? [];
    },
  });

  const updates = useQuery({
    queryKey: ["admin-updates", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("delivery_updates").select("*").eq("order_id", orderId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [form, setForm] = useState<any>(null);
  const [updateForm, setUpdateForm] = useState({ status: "shipped", note: "", location: "" });
  const [showAddCourier, setShowAddCourier] = useState(false);
  const [newCourier, setNewCourier] = useState({ name: "", website: "", tracking_url_template: "" });

  const addCourier = useMutation({
    mutationFn: async () => {
      const name = newCourier.name.trim();
      if (!name) throw new Error("Courier name is required");
      const { data, error } = await supabase.from("courier_details").insert({
        name,
        website: newCourier.website.trim() || null,
        tracking_url_template: newCourier.tracking_url_template.trim() || null,
        active: true,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success("Courier added");
      setNewCourier({ name: "", website: "", tracking_url_template: "" });
      setShowAddCourier(false);
      qc.invalidateQueries({ queryKey: ["couriers"] });
      setForm({ ...current, courier_name: data.name });
    },
    onError: (e: any) => toast.error(e.message || "Failed to add courier"),
  });


  const current = form ?? tracking.data ?? {
    current_status: "placed",
    courier_name: "",
    tracking_id: "",
    tracking_url: "",
    delivery_partner_phone: "",
    expected_delivery_date: "",
    dispatch_notes: "",
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        order_id: orderId,
        current_status: current.current_status,
        courier_name: current.courier_name || null,
        tracking_id: current.tracking_id || null,
        tracking_url: current.tracking_url || null,
        delivery_partner_phone: current.delivery_partner_phone || null,
        expected_delivery_date: current.expected_delivery_date || null,
        dispatch_notes: current.dispatch_notes || null,
      };
      const { error } = await supabase.from("order_tracking").upsert(payload, { onConflict: "order_id" });
      if (error) throw error;
      if (current.current_status === "delivered") {
        // keep orders.status in sync and trigger the customer SMS
        await supabase.from("orders").update({ status: "delivered" }).eq("id", orderId);
        supabase.functions
          .invoke("send-delivery-sms", { body: { order_id: orderId } })
          .then(({ error }) => error && console.error("delivery sms failed", error));
      }
    },
    onSuccess: () => {
      toast.success("Tracking saved & customer notified");
      qc.invalidateQueries({ queryKey: ["admin-tracking", orderId] });
      qc.invalidateQueries({ queryKey: ["admin-updates", orderId] });
      setForm(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pushUpdate = useMutation({
    mutationFn: async () => {
      if (!updateForm.status) throw new Error("Status required");
      const { error } = await supabase.from("delivery_updates").insert({
        order_id: orderId,
        status: updateForm.status,
        note: updateForm.note || null,
        location: updateForm.location || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Update pushed to customer");
      setUpdateForm({ status: updateForm.status, note: "", location: "" });
      qc.invalidateQueries({ queryKey: ["admin-updates", orderId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const quickAdvance = (status: string) => {
    setForm({ ...current, current_status: status });
    setTimeout(() => save.mutate(), 0);
  };

  if (tracking.isLoading || couriers.isLoading) {
    return <div className="text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading tracking…</div>;
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* Editor */}
      <div className="space-y-4 rounded-xl border border-border bg-background p-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Quick advance</p>
          <div className="flex flex-wrap gap-1.5">
            {TRACK_STAGES.map((s) => (
              <Button
                key={s.key}
                size="sm"
                variant={current.current_status === s.key ? "default" : "outline"}
                className="rounded-full text-xs h-7"
                onClick={() => quickAdvance(s.key)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Courier</Label>
              <button
                type="button"
                onClick={() => setShowAddCourier((v) => !v)}
                className="text-xs text-primary hover:underline"
              >
                {showAddCourier ? "Cancel" : "+ Add new"}
              </button>
            </div>
            <select
              value={current.courier_name ?? ""}
              onChange={(e) => {
                const c = couriers.data?.find((x: any) => x.name === e.target.value);
                setForm({
                  ...current,
                  courier_name: e.target.value,
                  tracking_url: c?.tracking_url_template && current.tracking_id
                    ? c.tracking_url_template.replace("{tracking_id}", current.tracking_id)
                    : current.tracking_url,
                });
              }}
              className="w-full mt-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">Select courier</option>
              {couriers.data?.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            {showAddCourier && (
              <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/30 p-2">
                <Input
                  placeholder="Courier name (e.g. Delhivery)"
                  value={newCourier.name}
                  onChange={(e) => setNewCourier({ ...newCourier, name: e.target.value })}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="Website (optional)"
                  value={newCourier.website}
                  onChange={(e) => setNewCourier({ ...newCourier, website: e.target.value })}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="Tracking URL template — use {tracking_id}"
                  value={newCourier.tracking_url_template}
                  onChange={(e) => setNewCourier({ ...newCourier, tracking_url_template: e.target.value })}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  className="w-full h-8"
                  disabled={addCourier.isPending || !newCourier.name.trim()}
                  onClick={() => addCourier.mutate()}
                >
                  {addCourier.isPending ? "Adding..." : "Save courier"}
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Tracking ID / AWB</Label>
            <Input
              value={current.tracking_id ?? ""}
              onChange={(e) => {
                const c = couriers.data?.find((x: any) => x.name === current.courier_name);
                setForm({
                  ...current,
                  tracking_id: e.target.value,
                  tracking_url: c?.tracking_url_template
                    ? c.tracking_url_template.replace("{tracking_id}", e.target.value)
                    : current.tracking_url,
                });
              }}
              className="mt-1"
              placeholder="e.g. DLV123456789"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Tracking URL</Label>
            <Input
              value={current.tracking_url ?? ""}
              onChange={(e) => setForm({ ...current, tracking_url: e.target.value })}
              className="mt-1"
              placeholder="https://..."
            />
          </div>
          <div>
            <Label className="text-xs">Delivery partner phone</Label>
            <Input
              value={current.delivery_partner_phone ?? ""}
              onChange={(e) => setForm({ ...current, delivery_partner_phone: e.target.value })}
              className="mt-1"
              placeholder="+91…"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Expected delivery date</Label>
              {shippingAddress && (
                <button
                  type="button"
                  onClick={() => {
                    const eta = computeEta(shippingAddress, createdAt ? new Date(createdAt) : new Date());
                    setForm({ ...current, expected_delivery_date: toDateInput(eta.expectedDate) });
                    toast.success(`Auto-filled (${eta.isLocal ? `${site.delivery.local.label} ${eta.minDays}–${eta.maxDays}d` : `Outside ${site.delivery.local.label} ${eta.maxDays}d`})`);
                  }}
                  className="text-[11px] text-primary hover:underline"
                >
                  Auto-fill ({isLocalDeliveryAddress(shippingAddress) ? `${site.delivery.local.shortLabel} · ${site.delivery.local.minDays}–${site.delivery.local.maxDays}d` : `Outside · ${site.delivery.standardDays}d`})
                </button>
              )}
            </div>
            <Input
              type="date"
              value={current.expected_delivery_date ?? ""}
              onChange={(e) => setForm({ ...current, expected_delivery_date: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Dispatch notes (visible to customer)</Label>
            <Textarea
              rows={2}
              value={current.dispatch_notes ?? ""}
              onChange={(e) => setForm({ ...current, dispatch_notes: e.target.value })}
              className="mt-1"
              placeholder="e.g. Dispatched from Mumbai warehouse"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {form && <Button variant="ghost" size="sm" onClick={() => setForm(null)}>Reset</Button>}
          <Button size="sm" className="rounded-full" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Save & notify customer
          </Button>
        </div>
      </div>

      {/* Timeline & push update */}
      <div className="space-y-4 rounded-xl border border-border bg-background p-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Push location update</p>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={updateForm.status}
              onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              {TRACK_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <Input
              placeholder="Location"
              value={updateForm.location}
              onChange={(e) => setUpdateForm({ ...updateForm, location: e.target.value })}
              className="text-sm"
            />
            <Button size="sm" onClick={() => pushUpdate.mutate()} disabled={pushUpdate.isPending}>
              {pushUpdate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Push"}
            </Button>
          </div>
          <Input
            placeholder="Note for customer (optional)"
            value={updateForm.note}
            onChange={(e) => setUpdateForm({ ...updateForm, note: e.target.value })}
            className="mt-2 text-sm"
          />
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Activity timeline</p>
          {updates.data?.length === 0 ? (
            <p className="text-xs text-muted-foreground">No updates yet</p>
          ) : (
            <ol className="space-y-2 max-h-64 overflow-auto pr-2">
              {updates.data?.map((u: any) => (
                <li key={u.id} className="flex gap-2 text-xs">
                  <Badge variant="outline" className="rounded-full shrink-0 capitalize">{u.status.replace(/_/g, " ")}</Badge>
                  <div className="flex-1 min-w-0">
                    {u.note && <p className="text-foreground">{u.note}</p>}
                    <p className="text-muted-foreground">
                      {u.location ? `${u.location} · ` : ""}
                      {new Date(u.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {current.tracking_url && (
          <a href={current.tracking_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
            Open courier tracking <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
