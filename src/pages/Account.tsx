import { resolveImage } from "@/lib/resolveImage";
import { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/providers/AuthProvider";
import { useWishlist } from "@/providers/WishlistProvider";
import { supabase } from "@/lib/supabase";
import { formatINR, calcCancelRefund, CANCEL_FEE_PCT } from "@/lib/format";
import { toast } from "sonner";
import { site } from "@/config/site";
import { isPhonePlaceholderEmail } from "@/lib/authEmail";
import { z } from "zod";

const addressSchema = z.object({
  full_name: z.string().trim().min(2, "Enter full name").max(80, "Name too long"),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  line1: z.string().trim().min(3, "Enter address line 1").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  landmark: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter city").max(80),
  state: z.string().trim().min(2, "Enter state").max(80),
  country: z.string().trim().min(2).max(80).default("India"),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  label: z.string().trim().max(40).optional().or(z.literal("")),
});
import {
  LayoutDashboard,
  Package,
  Heart,
  User as UserIcon,
  MapPin,
  LogOut,
  ShoppingBag,
  Wallet,
  TrendingUp,
  Clock,
  ArrowRight,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  X,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Home,
  Briefcase,
  Star,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { CancelOrderDialog } from "@/components/CancelOrderDialog";
import { useWallet } from "@/hooks/useWallet";
import { useCart } from "@/providers/cart-context";
import { FreeDeliveryProgress } from "@/components/FreeDeliveryProgress";
import { OrderTracking } from "@/components/OrderTracking";

type Tab = "overview" | "orders" | "wallet" | "wishlist" | "profile" | "addresses";
const TABS: Tab[] = ["overview", "orders", "wallet", "wishlist", "profile", "addresses"];

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-sky-100 text-sky-800 border-sky-200",
  shipped: "bg-violet-100 text-violet-800 border-violet-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-800 border-rose-200",
};

const CANCELLABLE = new Set(["pending", "confirmed"]);

const variantKey = (productId?: string | null, color?: string | null) =>
  `${productId ?? ""}|${String(color ?? "").trim().toLowerCase()}`;

const Account = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { items: wishItems = [] } = useWishlist() as any;
  const { subtotal: cartSubtotal } = useCart();
  const [params, setParams] = useSearchParams();
  const { pathname } = useLocation();
  const urlTab = params.get("tab");
  // /orders ("My Orders", "Track Your Order", post-checkout redirect) opens the orders tab.
  const tabFromUrl: Tab = TABS.includes(urlTab as Tab)
    ? (urlTab as Tab)
    : pathname === "/orders" ? "orders" : "overview";
  const [tab, setTab] = useState<Tab>(tabFromUrl);
  // URL → tab: links like /account?tab=wallet or /orders while this page is already mounted.
  useEffect(() => { setTab(tabFromUrl); }, [tabFromUrl]);
  // tab → URL
  useEffect(() => { if (tab !== urlTab) setParams({ tab }, { replace: true }); }, [tab]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["account-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const ordersData = data ?? [];
      const productIds = Array.from(new Set(
        ordersData.flatMap((o: any) => (o.order_items ?? []).map((i: any) => i.product_id).filter(Boolean))
      ));
      if (productIds.length) {
        const [{ data: products }, { data: colorRows }] = await Promise.all([
          supabase
            .from("products")
            .select("id, name, images")
            .in("id", productIds),
          supabase
            .from("product_color_variants")
            .select("product_id, color_name, images")
            .in("product_id", productIds),
        ]);
        const map = new Map((products ?? []).map((p: any) => [p.id, p]));
        const colorMap = new Map(
          (colorRows ?? []).map((row: any) => [variantKey(row.product_id, row.color_name), row.images?.[0] ?? null])
        );
        ordersData.forEach((o: any) => {
          (o.order_items ?? []).forEach((it: any) => {
            it.product = map.get(it.product_id) ?? null;
            it.variant_image = colorMap.get(variantKey(it.product_id, it.color)) ?? null;
          });
        });
      }
      return ordersData;
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["account-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    // Per-item awareness: subtract cancelled items from each order
    let totalSpent = 0;
    let cancelledAmount = 0;
    let cancelledCount = 0;
    for (const o of orders as any[]) {
      const items = o.order_items ?? [];
      const cancelledItemTotal = items
        .filter((it: any) => it.status === "cancelled")
        .reduce((s: number, it: any) => s + Number(it.price ?? 0) * Number(it.quantity ?? 0), 0);
      if (o.status === "cancelled") {
        cancelledAmount += Number(o.total ?? 0);
        cancelledCount += 1;
      } else {
        totalSpent += Math.max(0, Number(o.total ?? 0) - cancelledItemTotal);
        if (cancelledItemTotal > 0) cancelledAmount += cancelledItemTotal;
      }
    }
    const inProgress = orders.filter((o: any) => ["pending", "confirmed", "shipped"].includes(o.status)).length;
    const delivered = orders.filter((o: any) => o.status === "delivered").length;
    return { totalSpent, totalOrders: orders.length, inProgress, delivered, cancelledAmount, cancelledCount };
  }, [orders]);


  if (!user) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Please sign in</h1>
          <Button asChild variant="pill" size="lg" className="mt-6">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const navItems: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "orders", label: "My Orders", icon: Package },
    { key: "wallet", label: "eWallet", icon: Wallet },
    { key: "wishlist", label: "Wishlist", icon: Heart },
    { key: "profile", label: "Profile", icon: UserIcon },
    { key: "addresses", label: "Addresses", icon: MapPin },
  ];

  const isPlaceholderEmail = (e?: string | null) =>
    isPhonePlaceholderEmail(e);
  const realEmail = isPlaceholderEmail(user.email) ? "" : (profile?.email && !isPlaceholderEmail(profile.email) ? profile.email : (user.email ?? ""));
  const initials = (profile?.full_name || realEmail || "U").slice(0, 2).toUpperCase();

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        {/* Hero strip */}
        <Card className="rounded-3xl p-6 md:p-8 mb-8 border-0 shadow-card bg-gradient-to-br from-sky/15 via-background to-primary/10">
          <div className="flex flex-wrap items-center gap-5">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-sky to-primary text-white grid place-items-center font-display text-2xl md:text-3xl font-bold shadow-md">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Welcome back</p>
              <h1 className="font-display text-2xl md:text-3xl font-bold truncate">
                {profile?.full_name || "Hello!"}
              </h1>
              <p className="text-sm text-muted-foreground truncate">{realEmail || user.phone || "Add your email"}</p>
            </div>
            <Button variant="outline" className="rounded-full" onClick={async () => { await signOut(); navigate("/"); }}>
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Sidebar */}
          <aside>
            <Card className="rounded-2xl p-2 sticky top-24 border-border/60">
              <nav className="grid grid-cols-3 sm:grid-cols-6 lg:flex lg:flex-col gap-1">
                {navItems.map((n) => {
                  const active = tab === n.key;
                  const Icon = n.icon;
                  return (
                    <button
                      key={n.key}
                      onClick={() => { if (n.key === "wishlist") { navigate("/wishlist"); } else { setTab(n.key); } }}
                      className={`flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 px-2 lg:px-4 py-2 lg:py-2.5 rounded-xl text-[11px] lg:text-sm font-medium text-center lg:text-left transition-all ${
                        active
                          ? "bg-gradient-to-r from-sky/20 to-primary/10 text-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-sky" : ""}`} />
                      <span className="leading-tight">{n.label}</span>
                    </button>
                  );
                })}
              </nav>
            </Card>
          </aside>

          {/* Main */}
          <div className="min-w-0">
            {tab === "overview" && (
              <div className="space-y-6 animate-fade-in">
                <FreeDeliveryProgress subtotal={cartSubtotal} />
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatCard label="Total Orders" value={String(stats.totalOrders)} icon={ShoppingBag} tint="from-sky/20 to-sky/5" iconClass="text-sky" />
                  <StatCard label="In Progress" value={String(stats.inProgress)} icon={Clock} tint="from-amber-300/30 to-amber-100/10" iconClass="text-amber-600" />
                  <StatCard label="Delivered" value={String(stats.delivered)} icon={TrendingUp} tint="from-emerald-300/30 to-emerald-100/10" iconClass="text-emerald-600" />
                  <StatCard label="Total Spent" value={formatINR(stats.totalSpent)} icon={Wallet} tint="from-primary/20 to-primary/5" iconClass="text-primary" />
                  <StatCard label="Cancelled" value={formatINR(stats.cancelledAmount)} sub={`${stats.cancelledCount} order${stats.cancelledCount === 1 ? "" : "s"}`} icon={XCircle} tint="from-rose-300/30 to-rose-100/10" iconClass="text-rose-600" />
                </div>


                <Card className="rounded-2xl p-6 border-border/60 shadow-card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-xl font-bold">Recent Orders</h2>
                    <Button variant="ghost" size="sm" onClick={() => setTab("orders")}>
                      View all <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  {orders.length === 0 ? (
                    <EmptyState icon={Package} title="No orders yet" cta="Start shopping" to="/shop" />
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 3).map((o: any) => (
                        <OrderRow key={o.id} order={o} />
                      ))}
                    </div>
                  )}
                </Card>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="rounded-2xl p-6 border-border/60 shadow-card">
                    <h3 className="font-bold mb-1">Wishlist</h3>
                    <p className="text-sm text-muted-foreground mb-4">{wishItems.length} saved items</p>
                    <Button variant="outline" className="rounded-full" onClick={() => navigate("/wishlist")}>
                      <Heart className="w-4 h-4 mr-2" /> View wishlist
                    </Button>
                  </Card>
                  <Card className="rounded-2xl p-6 border-border/60 shadow-card">
                    <h3 className="font-bold mb-1">Profile details</h3>
                    <p className="text-sm text-muted-foreground mb-4">Keep your contact info up to date.</p>
                    <Button variant="outline" className="rounded-full" onClick={() => setTab("profile")}>
                      <UserIcon className="w-4 h-4 mr-2" /> Edit profile
                    </Button>
                  </Card>
                </div>
              </div>
            )}

            {tab === "orders" && (
              <Card className="rounded-2xl p-6 border-border/60 shadow-card animate-fade-in">
                <h2 className="font-display text-xl font-bold mb-4">All Orders</h2>
                {isLoading ? (
                  <p className="text-muted-foreground">Loading…</p>
                ) : orders.length === 0 ? (
                  <EmptyState icon={Package} title="No orders yet" cta="Start shopping" to="/shop" />
                ) : (
                  <div className="space-y-4">
                    {orders.map((o: any) => <OrderRow key={o.id} order={o} expanded />)}
                  </div>
                )}
              </Card>
            )}

            {tab === "wallet" && <WalletPanel />}

            {tab === "wishlist" && (
              <Card className="rounded-2xl p-6 border-border/60 shadow-card animate-fade-in">
                <h2 className="font-display text-xl font-bold mb-4">My Wishlist</h2>
                <p className="text-sm text-muted-foreground mb-4">{wishItems.length} items saved.</p>
                <Button asChild className="rounded-full">
                  <Link to="/wishlist">Open full wishlist <ArrowRight className="w-4 h-4 ml-1" /></Link>
                </Button>
              </Card>
            )}

            {tab === "profile" && (
              <ProfileForm userId={user.id} email={realEmail} authEmail={user.email ?? ""} authPhone={user.phone ?? ""} authName={(user.user_metadata as any)?.full_name ?? ""} initial={profile} />
            )}

            {tab === "addresses" && (
              <AddressForm userId={user.id} initial={profile} />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

const StatCard = ({ label, value, sub, icon: Icon, tint, iconClass }: any) => (
  <Card className={`rounded-2xl p-5 border-border/60 shadow-card bg-gradient-to-br ${tint}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="font-display text-2xl font-bold mt-1">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className="w-10 h-10 rounded-xl bg-background/70 grid place-items-center">
        <Icon className={`w-5 h-5 ${iconClass}`} />
      </div>
    </div>
  </Card>
);


const OrderRow = ({ order, expanded }: { order: any; expanded?: boolean }) => {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [itemTarget, setItemTarget] = useState<{ id: string; name: string; size: string; color: string } | null>(null);
  const [itemReason, setItemReason] = useState("");
  const [itemBusy, setItemBusy] = useState(false);

  const qc = useQueryClient();
  const navigate = useNavigate();
  const { add } = useCart();
  const canCancel = CANCELLABLE.has(order.status);
  const walletUsed = Number(order.wallet_amount_used ?? 0);
  const isCancelled = order.status === "cancelled";

  const handleBuyAgain = async () => {
    if (reordering) return;
    setReordering(true);
    try {
      const items = order.order_items ?? [];
      if (!items.length) { toast.error("No items to reorder"); return; }
      const productIds = Array.from(new Set(items.map((it: any) => it.product_id).filter(Boolean))) as string[];
      const { data: prods } = await supabase.from("products").select("*").in("id", productIds);
      const byId = new Map((prods ?? []).map((p: any) => [p.id, p]));
      let added = 0;
      for (const it of items) {
        const p = byId.get(it.product_id);
        if (!p) continue;
        if (await add(p as any, it.size, it.color, it.quantity, { silent: true })) added++;
      }
      if (added === 0) { toast.error("These products are no longer available"); return; }
      toast.success(`Added ${added} item${added > 1 ? "s" : ""} to cart`, { description: "You can edit size, colour and quantity in the cart." });
      navigate("/cart");
    } catch (e: any) {
      toast.error("Couldn't reorder: " + (e?.message ?? "unknown"));
    } finally {
      setReordering(false);
    }
  };

  const previewItems = (order.order_items ?? []).slice(0, 4);
  const extraCount = Math.max(0, (order.order_items?.length ?? 0) - previewItems.length);
  const totalUnits = (order.order_items ?? []).reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0);

  return (
    <div className="rounded-xl border border-border/60 p-4 bg-background/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <Badge variant="outline" className={`${statusColor[order.status] ?? "bg-muted"} rounded-full capitalize`}>
          {order.status}
        </Badge>
        <p className="font-display font-bold">{formatINR(order.total)}</p>
      </div>





      {order.status === "cancelled" && (() => {
        const isCod = (order.payment_method ?? "").toLowerCase() === "cod" && (order.payment_status ?? "") !== "refunded";
        if (isCod) {
          return (
            <div className="mt-3 flex items-center gap-2 text-xs rounded-lg bg-amber-50 text-amber-900 border border-amber-200 px-3 py-2">
              <Wallet className="w-3.5 h-3.5" />
              Wallet refund not applicable for COD orders
              {order.cancellation_reason ? <span className="opacity-70">· {order.cancellation_reason}</span> : null}
            </div>
          );
        }
        // Same fee the cancel_order_with_refund DB function charges (2%).
        const { fee, net: refund } = calcCancelRefund(Number(order.total));
        return (
          <div className="mt-3 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-2 text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <Wallet className="w-3.5 h-3.5" /> Refunded {formatINR(refund)} to your wallet
            </div>
            <div className="flex justify-between opacity-80"><span>Order amount</span><span>{formatINR(Number(order.total))}</span></div>
            <div className="flex justify-between opacity-80"><span>Processing fee ({CANCEL_FEE_PCT * 100}%)</span><span>− {formatINR(fee)}</span></div>
            {order.cancellation_reason ? <div className="opacity-70">· {order.cancellation_reason}</div> : null}
          </div>
        );
      })()}
      {walletUsed > 0 && order.status !== "cancelled" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Paid with wallet (incl. 7% processing fee): <span className="font-semibold text-foreground">{formatINR(walletUsed)}</span>
        </p>
      )}

      {expanded && order.status !== "cancelled" && <OrderTracking orderId={order.id} />}

      <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
        {order.order_items?.map((item: any) => {
          const name = item.product_name ?? item.product?.name ?? "Product no longer available";
          const img = resolveImage(item.variant_image ?? item.product_image ?? item.product?.images?.[0]);
          const itemCancelled = item.status === "cancelled";
          const canCancelItem = canCancel && !itemCancelled;
          return (
            <div key={item.id} className={`flex items-center gap-3 text-sm rounded-xl p-2.5 border ${itemCancelled ? "opacity-70 bg-muted/30 border-border/60" : "bg-background/60 border-border/60 hover:shadow-sm transition-shadow"}`}>
              <img src={img} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }} className={`w-14 h-14 rounded-lg object-cover bg-muted shrink-0 ${itemCancelled ? "grayscale" : ""}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-semibold truncate ${itemCancelled ? "line-through" : ""}`}>{name}</p>
                  {itemCancelled ? (
                    <Badge variant="destructive" className="rounded-full text-[10px]">Cancelled</Badge>
                  ) : (
                    <Badge variant="outline" className={`${statusColor[order.status] ?? "bg-muted"} rounded-full text-[10px] capitalize`}>{order.status}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-medium text-foreground/80">Size {item.size || "—"}</span>
                  {" · "}
                  <span className="font-medium text-foreground/80 capitalize">{item.color || "—"}</span>
                  {" · Qty "}{item.quantity}
                </p>
                {itemCancelled && item.cancellation_reason && (
                  <p className="text-[11px] text-rose-700/80 mt-0.5">Reason: {item.cancellation_reason}</p>
                )}
                {itemCancelled && (() => {
                  const gross = Number(item.price) * Number(item.quantity);
                  const isCod = (order.payment_method ?? "").toLowerCase() === "cod" && (order.payment_status ?? "") !== "paid";
                  if (isCod) return <p className="text-[11px] text-amber-700 mt-0.5">COD — no wallet refund</p>;
                  const fee = Math.round(gross * 0.02 * 100) / 100;
                  return <p className="text-[11px] text-emerald-700 mt-0.5 inline-flex items-center gap-1"><Wallet className="w-3 h-3" />Refunded {formatINR(gross - fee)} to wallet</p>;
                })()}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`font-semibold ${itemCancelled ? "line-through text-muted-foreground" : ""}`}>{formatINR(item.price * item.quantity)}</span>
                {canCancelItem && (
                  <button
                    type="button"
                    onClick={() => setItemTarget({ id: item.id, name, size: item.size, color: item.color })}
                    className="group inline-flex items-center gap-1.5 text-[11px] font-semibold text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/30 hover:border-destructive rounded-full px-2.5 py-1 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
                  >
                    <X className="w-3 h-3 transition-transform group-hover:rotate-90" />
                    Cancel item
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>


      <AlertDialog open={!!itemTarget} onOpenChange={(open) => { if (!open) { setItemTarget(null); setItemReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this item?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">{itemTarget?.name}</p>
                <p className="text-xs">
                  Size {itemTarget?.size || "—"} · Color {itemTarget?.color || "—"}
                </p>
                <p className="text-xs">
                  Stock will be restored and the item amount (minus 2% processing fee) refunded to your {site.brand.name} wallet. Other items in this order stay active.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <Label htmlFor="item-reason" className="text-xs">Reason (optional)</Label>
            <Textarea
              id="item-reason"
              rows={2}
              value={itemReason}
              onChange={(e) => setItemReason(e.target.value)}
              placeholder="Let us know why you're cancelling…"
              className="mt-1 rounded-xl resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={itemBusy}>Keep item</AlertDialogCancel>
            <AlertDialogAction
              disabled={itemBusy}
              onClick={async (e) => {
                e.preventDefault();
                if (!itemTarget) return;
                setItemBusy(true);
                const { data, error } = await (supabase as any).rpc("cancel_order_item_with_refund", {
                  p_item_id: itemTarget.id,
                  p_reason: itemReason || null,
                });
                setItemBusy(false);
                if (error) {
                  toast.error(error.message || "Couldn't cancel item");
                  return;
                }
                const refunded = Number(data?.refunded ?? 0);
                toast.success(
                  refunded > 0
                    ? `Item cancelled. ${formatINR(refunded)} refunded to your wallet.`
                    : "Item cancelled and stock restored."
                );
                setItemTarget(null);
                setItemReason("");
                qc.invalidateQueries({ queryKey: ["account-orders"] });
                qc.invalidateQueries({ queryKey: ["orders", order.user_id] });
                qc.invalidateQueries({ queryKey: ["wallet"] });
                qc.invalidateQueries({ queryKey: ["wallet-tx"] });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {itemBusy ? (<><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Cancelling…</>) : (<><X className="w-4 h-4 mr-1.5" /> Cancel item</>)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {canCancel && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setCancelOpen(true)}
            >
              <XCircle className="w-4 h-4 mr-1.5" /> Cancel Order
            </Button>
            <CancelOrderDialog
              open={cancelOpen}
              onOpenChange={setCancelOpen}
              orderId={order.id}
              amount={Number(order.total)}
              paymentMethod={order.payment_method}
              paymentStatus={order.payment_status}
              onCancelled={() => {
                qc.invalidateQueries({ queryKey: ["account-orders"] });
                qc.invalidateQueries({ queryKey: ["wallet"] });
                qc.invalidateQueries({ queryKey: ["wallet-tx"] });
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};


const WalletPanel = () => {
  const { balance, transactions, isLoading } = useWallet();
  const totalRefunded = useMemo(
    () => transactions.filter((t) => t.source === "refund" && t.type === "credit")
      .reduce((s, t) => s + Number(t.amount), 0),
    [transactions]
  );
  const totalSpent = useMemo(
    () => transactions.filter((t) => t.type === "debit")
      .reduce((s, t) => s + Number(t.amount), 0),
    [transactions]
  );

  // Fetch first product per referenced order so we can show name + image.
  const orderIds = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.reference_id).filter(Boolean) as string[])),
    [transactions]
  );

  const { data: orderProducts = {} } = useQuery({
    queryKey: ["wallet-tx-products", orderIds.join(",")],
    enabled: orderIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("order_items")
        .select("order_id, quantity, product:products(id, name, images)")
        .in("order_id", orderIds);
      const map: Record<string, { name: string; image: string | null; count: number }> = {};
      (data ?? []).forEach((row: any) => {
        if (!row?.order_id) return;
        const existing = map[row.order_id];
        const name = row.product?.name ?? "Product";
        const image = row.product?.images?.[0] ?? null;
        if (!existing) {
          map[row.order_id] = { name, image, count: 1 };
        } else {
          existing.count += 1;
        }
      });
      return map;
    },
  });

  const sourceLabel = (s: string) =>
    ({
      refund: "Order refund",
      purchase: "Wallet payment",
      admin_adjustment: "Admin adjustment",
      signup_bonus: "Signup bonus",
      other: "Other",
    } as any)[s] ?? s;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero balance card */}
      <Card className="rounded-2xl p-6 md:p-7 border-0 shadow-card bg-gradient-to-br from-primary via-primary to-sky text-primary-foreground relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -right-20 -bottom-20 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90">
              <Wallet className="w-4 h-4" /> {site.brand.name} eWallet
            </div>
            <p className="font-display text-4xl md:text-5xl font-bold mt-2">{formatINR(balance)}</p>
            <p className="text-xs mt-1 opacity-90 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Usable for purchases only · Non-withdrawable
            </p>
          </div>
          <Button asChild size="lg" className="rounded-full bg-white text-primary hover:bg-white/90">
            <Link to="/shop">Shop Now with Wallet <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
          </Button>
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl p-5 border-border/60 shadow-card bg-gradient-to-br from-emerald-100/60 to-emerald-50/30">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Refunded</p>
          <p className="font-display text-2xl font-bold mt-1 text-emerald-700">{formatINR(totalRefunded)}</p>
        </Card>
        <Card className="rounded-2xl p-5 border-border/60 shadow-card bg-gradient-to-br from-rose-100/60 to-rose-50/30">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Spent (Wallet)</p>
          <p className="font-display text-2xl font-bold mt-1 text-rose-700">{formatINR(totalSpent)}</p>
        </Card>
        <Card className="rounded-2xl p-5 border-border/60 shadow-card bg-gradient-to-br from-sky/20 to-sky/5 col-span-2 md:col-span-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Transactions</p>
          <p className="font-display text-2xl font-bold mt-1">{transactions.length}</p>
        </Card>
      </div>

      {/* Transaction history */}
      <Card className="rounded-2xl p-0 border-border/60 shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 md:px-6 pt-5 md:pt-6 pb-4">
          <h3 className="font-display text-lg font-bold">Transaction History</h3>
          <span className="text-xs text-muted-foreground">{transactions.length} entries</span>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground px-6 pb-6">Loading…</p>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Wallet className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No transactions yet. Cancel an order or shop to see entries.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3 w-[180px]">Date</th>
                    <th className="text-left font-semibold px-4 py-3">Product / Reason</th>
                    <th className="text-left font-semibold px-4 py-3 w-[120px]">Type</th>
                    <th className="text-right font-semibold px-4 py-3 w-[120px]">Amount</th>
                    <th className="text-right font-semibold px-4 py-3 w-[120px]">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {transactions.map((t) => {
                    const credit = t.type === "credit";
                    const op = t.reference_id ? orderProducts[t.reference_id] : null;
                    return (
                      <tr key={t.id} className="hover:bg-muted/30 transition-colors align-middle">
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleString("en-IN", {
                            day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-xl overflow-hidden bg-muted shrink-0 ring-1 ring-border/60">
                              {op?.image ? (
                                <img src={resolveImage(op.image)} alt={op.name} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full grid place-items-center text-muted-foreground">
                                  <Wallet className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">
                                {op?.name ?? sourceLabel(t.source)}
                                {op && op.count > 1 && (
                                  <span className="ml-1 text-xs text-muted-foreground font-normal">+{op.count - 1} more</span>
                                )}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {t.reference_id ? `Order #${t.reference_id.slice(0, 8)} · ` : ""}
                                {t.description ?? sourceLabel(t.source)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              credit ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {credit ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {credit ? "Credit" : "Debit"}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-display font-bold whitespace-nowrap tabular-nums ${credit ? "text-emerald-700" : "text-rose-700"}`}>
                          {credit ? "+" : "−"}{formatINR(t.amount)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                          {formatINR(t.balance_after)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <ul className="md:hidden divide-y divide-border/60">
              {transactions.map((t) => {
                const credit = t.type === "credit";
                const op = t.reference_id ? orderProducts[t.reference_id] : null;
                return (
                  <li key={t.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0 ring-1 ring-border/60">
                      {op?.image ? (
                        <img src={resolveImage(op.image)} alt={op.name} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-muted-foreground">
                          <Wallet className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm truncate">
                          {op?.name ?? sourceLabel(t.source)}
                          {op && op.count > 1 && (
                            <span className="ml-1 text-xs text-muted-foreground font-normal">+{op.count - 1}</span>
                          )}
                        </p>
                        <p className={`text-sm font-display font-bold whitespace-nowrap tabular-nums ${credit ? "text-emerald-700" : "text-rose-700"}`}>
                          {credit ? "+" : "−"}{formatINR(t.amount)}
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {t.description ?? sourceLabel(t.source)}
                      </p>
                      <div className="flex items-center justify-between mt-1.5 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              credit ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {credit ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {credit ? "Credit" : "Debit"}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {new Date(t.created_at).toLocaleString("en-IN", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          Bal {formatINR(t.balance_after)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {/* Shop with refund amount */}
      <WalletShopSection balance={balance} />
    </div>
  );
};


const WalletShopSection = ({ balance }: { balance: number }) => {
  const [onlyAffordable, setOnlyAffordable] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["wallet-shop-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, images")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(24);
      return data ?? [];
    },
  });

  const filtered = useMemo(
    () => onlyAffordable ? products.filter((p: any) => Number(p.price) <= balance) : products,
    [products, onlyAffordable, balance]
  );

  return (
    <Card className="rounded-2xl border-border/60 shadow-card overflow-hidden">
      <div className="px-6 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" /> Shop with Refund Amount
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            See exactly how your wallet maps to each product · Wallet balance{" "}
            <span className="font-semibold text-foreground">{formatINR(balance)}</span>
          </p>
        </div>
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-20 z-10 bg-background/95 backdrop-blur border-y border-border/60 px-6 py-3 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            className="accent-primary w-4 h-4"
            checked={onlyAffordable}
            onChange={(e) => setOnlyAffordable(e.target.checked)}
          />
          <span className="font-medium">Show products I can fully buy with wallet</span>
        </label>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} items</span>
      </div>

      <div className="p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading products…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {onlyAffordable
                ? "No products fully covered by your wallet. Untick the filter to see more."
                : "No products available."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p: any) => (
              <WalletProductCard key={p.id} product={p} balance={balance} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

const WalletProductCard = ({ product, balance }: { product: any; balance: number }) => {
  const price = Number(product.price);
  const walletCovers = Math.min(price, balance);
  const extra = Math.max(0, price - balance);
  const fully = balance >= price && price > 0;
  const pct = price === 0 ? 0 : Math.min(100, Math.round((balance / price) * 100));
  const canBuy = balance > 0;

  return (
    <div className="group rounded-2xl border border-border/60 bg-background overflow-hidden flex flex-col hover:shadow-card transition-all">
      <Link
        to={`/product/${product.id}`}
        className="block aspect-square bg-gradient-to-br from-muted/60 to-muted/20 overflow-hidden p-2"
      >
        <img
          src={resolveImage(product.images?.[0])}
          alt={product.name}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </Link>
      <div className="p-3 flex flex-col flex-1 gap-2">
        <p className="text-sm font-semibold line-clamp-2 min-h-[2.5rem]">{product.name}</p>
        <p className="font-display font-bold">{formatINR(price)}</p>

        <Badge
          variant="outline"
          className={`rounded-full text-[10px] font-semibold border w-fit ${
            fully
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : canBuy
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-muted text-muted-foreground border-border"
          }`}
        >
          {fully
            ? `Pay ${formatINR(price)} using Wallet`
            : canBuy
            ? `Pay ${formatINR(walletCovers)} + ${formatINR(extra)} extra`
            : `Wallet empty`}
        </Badge>

        {/* Live coverage indicator */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>
              Wallet covers: <span className="font-semibold text-foreground">{pct}%</span>
              {!fully && canBuy && <> — pay {formatINR(extra)} extra</>}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all ${fully ? "bg-emerald-500" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <Button
          asChild={canBuy}
          size="sm"
          disabled={!canBuy}
          className="rounded-full mt-1 w-full px-2 bg-gradient-to-r from-primary to-sky text-primary-foreground hover:opacity-95 whitespace-nowrap"
        >
          {canBuy ? (
            <Link to={`/checkout/express?product=${product.id}&useWallet=1`} className="inline-flex items-center justify-center gap-1.5 min-w-0">
              <Wallet className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">Buy Now</span>
                <span className="hidden sm:inline">Use Wallet &amp; Buy</span>
              </span>
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center gap-1.5 min-w-0">
              <Wallet className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">Buy Now</span>
                <span className="hidden sm:inline">Use Wallet &amp; Buy</span>
              </span>
            </span>
          )}
        </Button>


      </div>
    </div>
  );
};




const EmptyState = ({ icon: Icon, title, cta, to }: any) => (
  <div className="text-center py-10">
    <Icon className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
    <p className="text-muted-foreground mb-4">{title}</p>
    <Button asChild className="rounded-full"><Link to={to}>{cta}</Link></Button>
  </div>
);

const ProfileForm = ({ userId, email, authEmail = "", authPhone = "", authName = "", initial }: any) => {
  const isPlaceholderEmail = (e?: string | null) =>
    isPhonePlaceholderEmail(e);
  const cleanInitialEmail = () => {
    const p = initial?.email;
    if (p && !isPlaceholderEmail(p)) return p;
    if (email && !isPlaceholderEmail(email)) return email;
    return "";
  };
  const [name, setName] = useState(initial?.full_name || authName || "");
  const [phone, setPhone] = useState(initial?.phone || authPhone || "");
  const [emailValue, setEmailValue] = useState(cleanInitialEmail());
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  useEffect(() => {
    setName(initial?.full_name || authName || "");
    setPhone(initial?.phone || authPhone || "");
    setEmailValue(cleanInitialEmail());
  }, [initial, email, authPhone, authName]);

  const save = async () => {
    const trimmedEmail = emailValue.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSaving(true);
    try {
      const currentRealAuthEmail = isPlaceholderEmail(authEmail) ? "" : authEmail;
      if (trimmedEmail && trimmedEmail !== currentRealAuthEmail) {
        const { error: authErr } = await supabase.auth.updateUser({ email: trimmedEmail });
        if (authErr) throw authErr;
        toast.message("Confirmation email sent", {
          description: "Please verify your new email to complete the change.",
        });
      }
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, full_name: name, phone, email: trimmedEmail || null });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["account-profile", userId] });
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e.message ?? "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const currentRealAuthEmail = isPlaceholderEmail(authEmail) ? "" : authEmail;

  return (
    <Card className="rounded-2xl p-6 border-border/60 shadow-card animate-fade-in">
      <h2 className="font-display text-xl font-bold mb-4">Profile details</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={emailValue} onChange={(e) => setEmailValue(e.target.value)} placeholder="Add Email" />
          {emailValue.trim() && emailValue.trim() !== currentRealAuthEmail && (
            <p className="text-xs text-muted-foreground">You'll receive a confirmation link at the new address.</p>
          )}
        </div>
        <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      </div>
      <Button className="mt-5 rounded-full" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </Card>
  );
};


type SavedAddress = {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  alt_phone: string | null;
  email: string | null;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  country: string;
  pincode: string;
  is_default: boolean;
};

const emptyAddr = {
  label: "home",
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
};

const AddressForm = ({ userId }: any) => {
  const qc = useQueryClient();
  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ["user-addresses", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavedAddress[];
    },
    enabled: !!userId,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyAddr);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm(emptyAddr); setEditingId(null); setShowForm(true); };
  const openEdit = (a: SavedAddress) => {
    setForm({
      label: a.label, full_name: a.full_name, phone: a.phone,
      line1: a.line1, line2: a.line2 ?? "", landmark: a.landmark ?? "",
      city: a.city, state: a.state, country: a.country, pincode: a.pincode,
    });
    setEditingId(a.id); setShowForm(true);
  };
  const cancel = () => { setShowForm(false); setEditingId(null); setForm(emptyAddr); };

  const save = async () => {
    const parsed = addressSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please fix the address");
      return;
    }
    setSaving(true);
    try {
      const v = parsed.data;
      const payload: any = {
        user_id: userId,
        label: v.label || null,
        full_name: v.full_name,
        phone: v.phone,
        line1: v.line1,
        line2: v.line2 || null,
        landmark: v.landmark || null,
        city: v.city,
        state: v.state,
        country: v.country || "India",
        pincode: v.pincode,
      };
      if (editingId) {
        const { error } = await supabase.from("user_addresses").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Address updated");
      } else {
        const { error } = await supabase.from("user_addresses").insert({ ...payload, is_default: addresses.length === 0 });
        if (error) throw error;
        toast.success("Address added");
      }
      await qc.invalidateQueries({ queryKey: ["user-addresses", userId] });
      cancel();
    } catch (e: any) {
      toast.error(e.message ?? "Could not save address");
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    const { error } = await supabase.from("user_addresses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Address deleted");
    qc.invalidateQueries({ queryKey: ["user-addresses", userId] });
  };

  const setDefault = async (id: string) => {
    const { error } = await supabase.from("user_addresses").update({ is_default: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Default address updated");
    qc.invalidateQueries({ queryKey: ["user-addresses", userId] });
  };

  const labelIcon = (l: string) => l === "work" ? <Briefcase className="w-3.5 h-3.5" /> : l === "home" ? <Home className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />;

  return (
    <Card className="rounded-2xl p-6 border-border/60 shadow-card animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-xl font-bold">Shipping addresses</h2>
          <p className="text-sm text-muted-foreground">Manage where we deliver your orders</p>
        </div>
        {!showForm && (
          <Button onClick={openNew} className="rounded-full" size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add new
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading…</div>
      ) : !showForm ? (
        addresses.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed rounded-xl border-border/60">
            <MapPin className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground mb-3">No saved addresses yet</p>
            <Button onClick={openNew} className="rounded-full"><Plus className="w-4 h-4 mr-1.5" />Add your first address</Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {addresses.map((a) => (
              <div key={a.id} className={`relative rounded-2xl border p-4 transition-all hover:shadow-md ${a.is_default ? "border-primary/50 bg-primary/5" : "border-border/60"}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-background rounded-full px-2.5 py-1 border">
                    {labelIcon(a.label)}{a.label}
                  </div>
                  {a.is_default && (
                    <Badge className="rounded-full text-[10px]"><Star className="w-3 h-3 mr-1" />Default</Badge>
                  )}
                </div>
                <p className="font-semibold text-sm">{a.full_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.phone}</p>
                <p className="text-sm mt-2 leading-relaxed">
                  {a.line1}{a.line2 ? `, ${a.line2}` : ""}{a.landmark ? `, ${a.landmark}` : ""}
                  <br />{a.city}, {a.state} {a.pincode}
                </p>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/60">
                  <Button size="sm" variant="ghost" className="rounded-full h-8 px-3 text-xs" onClick={() => openEdit(a)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" />Edit
                  </Button>
                  {!a.is_default && (
                    <Button size="sm" variant="ghost" className="rounded-full h-8 px-3 text-xs" onClick={() => setDefault(a.id)}>
                      <Star className="w-3.5 h-3.5 mr-1" />Set default
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="rounded-full h-8 px-3 text-xs text-destructive hover:text-destructive ml-auto" onClick={() => remove(a.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4 animate-fade-in">
          <div className="flex gap-2">
            {["home", "work", "other"].map((l) => (
              <button key={l} type="button" onClick={() => setForm({ ...form, label: l })}
                className={`inline-flex items-center gap-1.5 capitalize rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${form.label === l ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"}`}>
                {labelIcon(l)}{l}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Address line 1</Label><Input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} placeholder="House no, Street" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Address line 2</Label><Input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} placeholder="Area / Locality (optional)" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Landmark</Label><Input value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} placeholder="Optional" /></div>
            <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Pincode</Label><Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={saving} className="rounded-full">
              {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Saving…</> : (editingId ? "Update address" : "Save address")}
            </Button>
            <Button variant="outline" onClick={cancel} className="rounded-full">Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  );
};


export default Account;
