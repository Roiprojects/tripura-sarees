import { resolveImage } from "@/lib/resolveImage";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Wallet, CheckCircle2, Smartphone, CreditCard, Banknote, Zap, PartyPopper, Package, ArrowRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { formatINR, calcShipping, calcWalletDebit } from "@/lib/format";
import { site } from "@/config/site";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";
import { startRazorpayPayment } from "@/lib/razorpay";

const addressSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^\d{10}$/, "10-digit phone number"),
  line1: z.string().trim().min(5).max(200),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, "6-digit pincode"),
});

type PayMethod = "upi" | "card" | "cod";

const ExpressCheckout = () => {
  const [params] = useSearchParams();
  const productId = params.get("product") ?? "";
  const initialUseWallet = params.get("useWallet") !== "0";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance: walletBalance, refresh: refreshWallet } = useWallet();
  const [useWalletPay, setUseWalletPay] = useState(initialUseWallet);
  const [pay, setPay] = useState<PayMethod>("upi");
  const [upi, setUpi] = useState("");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", line1: "", city: "", state: "", pincode: "" });
  const [thanksOpen, setThanksOpen] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ["express-product", productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
      return data;
    },
    enabled: !!productId,
  });

  // Prefill address from profile
  const { data: profile } = useQuery({
    queryKey: ["express-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        full_name: f.full_name || profile.full_name || "",
        phone: f.phone || profile.phone || "",
      }));
    }
  }, [profile]);

  const price = Number(product?.price ?? 0);
  const subtotal = price;
  const shipping = calcShipping(subtotal, 1);
  const grandTotal = subtotal + shipping;
  const maxApplyByBalance = Math.floor((walletBalance / 1.07) * 100) / 100;
  const walletApplied = useWalletPay ? Math.min(maxApplyByBalance, grandTotal) : 0;
  const walletFee = calcWalletDebit(walletApplied).fee;
  const walletDebit = walletApplied + walletFee;
  const payable = Math.max(0, grandTotal - walletApplied);
  const fullyCovered = walletApplied >= grandTotal && walletApplied > 0;
  const coverPct = useMemo(() => grandTotal === 0 ? 0 : Math.min(100, Math.round((walletBalance / grandTotal) * 100)), [walletBalance, grandTotal]);

  if (!user) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Please sign in</h1>
          <Button asChild variant="pill" size="lg" className="mt-6"><Link to="/auth">Sign in</Link></Button>
        </div>
      </Layout>
    );
  }
  if (!productId || (!isLoading && !product)) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Product not found</h1>
          <Button asChild variant="pill" size="lg" className="mt-6"><Link to="/account?tab=wallet">Back to wallet</Link></Button>
        </div>
      </Layout>
    );
  }

  const validatePayment = () => true;

  const placeOrder = async () => {
    const parsed = addressSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (!validatePayment()) return;
    setSubmitting(true);

    const needsGateway = !fullyCovered && pay !== "cod" && payable > 0;
    const orderStatus = (pay === "cod" && !fullyCovered) ? "pending" : (needsGateway ? "pending" : "confirmed");
    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id,
      status: orderStatus,
      total: grandTotal,
      shipping_address: parsed.data,
      payment_status: payable === 0 ? "paid" : "pending",
      payment_method: needsGateway ? "razorpay" : (pay === "cod" ? "cod" : "wallet"),
    }).select().single();
    if (error || !order) { setSubmitting(false); toast.error("Couldn't place order"); return; }

    const sizeChoice = product!.sizes?.[0] ?? "M";
    const colorChoice = product!.colors?.[0] ?? "Default";
    // SKU + color-variant image snapshot
    let skuSnap: string | null = (product as any)?.sku ?? null;
    let variantImg: string | null = null;
    {
      const [{ data: vRows }, { data: cRows }] = await Promise.all([
        supabase
          .from("product_variants")
          .select("size, color_name, sku_code")
          .eq("product_id", product!.id),
        supabase
          .from("product_color_variants")
          .select("color_name, images")
          .eq("product_id", product!.id),
      ]);
      const exact = vRows?.find((v: any) => v.size === sizeChoice && (v.color_name ?? "") === colorChoice);
      const sizeOnly = vRows?.find((v: any) => v.size === sizeChoice);
      skuSnap = (exact as any)?.sku_code ?? (sizeOnly as any)?.sku_code ?? skuSnap;
      const colorMatch = cRows?.find((c: any) => (c.color_name ?? "").toLowerCase() === colorChoice.toLowerCase());
      variantImg = (colorMatch as any)?.images?.[0] ?? null;
    }
    const { error: itemsErr } = await supabase.from("order_items").insert([{
      order_id: order.id, product_id: product!.id, quantity: 1,
      size: sizeChoice, color: colorChoice, price,
      sku: skuSnap,
      product_name: product!.name,
      product_image: variantImg ?? product!.images?.[0] ?? null,
    }]);

    if (itemsErr) {
      await supabase.from("orders").delete().eq("id", order.id);
      setSubmitting(false); toast.error("Order failed"); return;
    }

    if (needsGateway) {
      const res = await startRazorpayPayment({
        orderId: order.id,
        amount: payable,
        description: product?.name ?? `${site.brand.name} order`,
        prefill: { name: form.full_name, contact: form.phone },
      });
      if (!res.ok) {
        const failed = res as { ok: false; reason: "dismissed" | "failed" | "verify_failed"; message?: string; paymentId?: string };
        if (failed.reason === "verify_failed") {
          setSubmitting(false);
          toast.error(
            failed.message || "Payment received, but order confirmation is pending. Please contact support.",
            { duration: 8000 },
          );
          navigate("/orders");
          return;
        }
        await supabase.from("orders").delete().eq("id", order.id);
        setSubmitting(false);
        if (failed.reason === "dismissed") toast.info("Payment cancelled. Your cart is still saved.");
        else toast.error(failed.message || "Payment failed. Please try again.");
        return;
      }


    }

    if (walletApplied > 0) {
      const { error: wErr } = await (supabase as any).rpc("debit_wallet_for_order", {
        p_order_id: order.id, p_amount: walletApplied,
      });
      if (wErr) {
        setSubmitting(false);
        toast.error("Payment received but wallet debit failed: " + wErr.message);
        navigate("/account?tab=wallet");
        return;
      }
      refreshWallet();
    }

    await (supabase as any).rpc("decrement_stock_for_order", { p_order_id: order.id });
    supabase.functions.invoke("send-order-confirmation-sms", { body: { order_id: order.id } }).catch(() => {});
    setSubmitting(false);
    setPlacedOrderId(order.id);
    setThanksOpen(true);
    toast.success(
      needsGateway
        ? "Payment successful! Your order has been placed."
        : pay === "cod"
        ? "Order placed! Pay on delivery 💝"
        : "Order placed using wallet balance 💝"
    );
  };


  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-primary font-semibold">
          <Zap className="w-4 h-4" /> Express Checkout · Wallet
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-8">One-Page Checkout</h1>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            {/* Product summary */}
            <Card className="rounded-2xl p-5 shadow-card border-border/60">
              <h2 className="font-display text-lg font-bold mb-4">Product</h2>
              <div className="flex gap-4">
                <img src={resolveImage(product?.images?.[0] )} alt="" className="w-24 h-24 rounded-xl object-cover bg-muted" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{product?.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Qty 1 · {product?.sizes?.[0] ?? "M"} · {product?.colors?.[0] ?? "Default"}</p>
                  <p className="font-display font-bold mt-2">{formatINR(price)}</p>
                </div>
              </div>
            </Card>

            {/* Address */}
            <Card className="rounded-2xl p-6 shadow-card border-border/60">
              <h2 className="font-display text-lg font-bold mb-4">Shipping address</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><Label>Full name</Label>
                  <Input value={form.full_name} maxLength={100} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded-full mt-1" /></div>
                <div><Label>Phone</Label>
                  <Input value={form.phone} maxLength={10} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-full mt-1" /></div>
                <div><Label>Pincode</Label>
                  <Input value={form.pincode} maxLength={6} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="rounded-full mt-1" /></div>
                <div className="sm:col-span-2"><Label>Address</Label>
                  <Input value={form.line1} maxLength={200} onChange={(e) => setForm({ ...form, line1: e.target.value })} className="rounded-full mt-1" /></div>
                <div><Label>City</Label>
                  <Input value={form.city} maxLength={80} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-full mt-1" /></div>
                <div><Label>State</Label>
                  <Input value={form.state} maxLength={80} onChange={(e) => setForm({ ...form, state: e.target.value })} className="rounded-full mt-1" /></div>
              </div>
            </Card>

            {/* Payment */}
            <Card className="rounded-2xl p-6 shadow-card border-border/60">
              <h2 className="font-display text-lg font-bold mb-4">Payment</h2>
              {walletBalance > 0 && (
                <label className={`mb-4 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all bg-gradient-to-r from-primary/5 to-sky/5 ${useWalletPay ? "border-primary" : "border-border"}`}>
                  <Checkbox checked={useWalletPay} onCheckedChange={(v) => setUseWalletPay(!!v)} />
                  <Wallet className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-semibold">Use {site.brand.walletName}</p>
                    <p className="text-xs text-muted-foreground">
                      Balance <span className="font-semibold text-foreground">{formatINR(walletBalance)}</span>
                      {useWalletPay && walletApplied > 0 && <> · Applying <span className="font-semibold text-primary">{formatINR(walletApplied)}</span></>}
                      {" · "}Wallet covers {coverPct}%
                    </p>
                  </div>
                </label>
              )}

              {fullyCovered ? (
                <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 text-sm">
                  <p className="font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Fully covered by wallet</p>
                  <p className="text-xs text-muted-foreground mt-1">No additional payment needed.</p>
                </div>
              ) : (
                <RadioGroup value={pay} onValueChange={(v) => setPay(v as PayMethod)} className="space-y-3">
                  <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${pay === "upi" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <RadioGroupItem value="upi" id="e-upi" /><Smartphone className="w-5 h-5 text-primary" />
                    <div className="flex-1"><p className="font-semibold">UPI</p></div>
                  </label>
                  <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${pay === "card" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <RadioGroupItem value="card" id="e-card" /><CreditCard className="w-5 h-5 text-primary" />
                    <div className="flex-1"><p className="font-semibold">Card</p></div>
                  </label>
                  {pay === "card" && (
                    <div className="ml-12 grid sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2"><Input placeholder="Card number" maxLength={19} value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} className="rounded-full" /></div>
                      <div className="sm:col-span-2"><Input placeholder="Card holder" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} className="rounded-full" /></div>
                      <Input placeholder="MM/YY" maxLength={5} value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} className="rounded-full" />
                      <Input placeholder="CVV" maxLength={3} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} className="rounded-full" />
                    </div>
                  )}
                  <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${pay === "cod" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <RadioGroupItem value="cod" id="e-cod" /><Banknote className="w-5 h-5 text-primary" />
                    <div className="flex-1"><p className="font-semibold">Cash on Delivery</p></div>
                  </label>
                </RadioGroup>
              )}
            </Card>
          </div>

          {/* Summary */}
          <Card className="rounded-2xl p-6 shadow-card border-border/60 h-fit lg:sticky lg:top-24">
            <h2 className="font-display text-xl font-bold mb-4">Order summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{formatINR(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping (1 item)</span><span className="font-semibold">{shipping === 0 ? "FREE" : formatINR(shipping)}</span></div>
              {walletApplied > 0 && (
                <>
                  <div className="flex justify-between text-primary">
                    <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Wallet Used</span>
                    <span className="font-semibold">− {formatINR(walletApplied)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Wallet processing fee (7%)</span>
                    <span>{formatINR(walletFee)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Total debit from wallet: <span className="font-semibold text-foreground">{formatINR(walletDebit)}</span></p>
                </>
              )}
            </div>
            <div className="border-t border-border my-4" />
            <div className="flex justify-between text-lg font-display font-bold">
              <span>Remaining to Pay</span><span>{formatINR(payable)}</span>
            </div>
            <Button variant="pill" size="lg" className="w-full mt-6" disabled={submitting} onClick={placeOrder}>
              {submitting ? "Processing..." : fullyCovered ? "Place Order with Wallet" : `Place Order · Pay ${formatINR(payable)}`}
            </Button>
            <p className="text-[11px] text-muted-foreground mt-3 text-center">Secured by Razorpay · UPI · Cards · Netbanking</p>
          </Card>
        </div>
      </div>

      <Dialog open={thanksOpen} onOpenChange={(v) => {
        setThanksOpen(v);
        if (!v) navigate("/account?tab=orders");
      }}>
        <DialogContent className="rounded-3xl p-0 overflow-hidden max-w-md border-border/60">
          <div className="relative px-6 pt-10 pb-6 text-center bg-gradient-to-br from-primary/10 via-background to-sky/10">
            <div className="absolute inset-x-0 -top-20 h-40 bg-primary/20 blur-3xl pointer-events-none" />
            <div className="relative mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-sky grid place-items-center shadow-xl shadow-primary/30 animate-scale-in">
              <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="font-display text-2xl font-bold mt-5 flex items-center justify-center gap-2">
              <PartyPopper className="w-5 h-5 text-primary" /> Thank you!
            </h2>
            <p className="text-sm text-muted-foreground mt-2 px-2">
              Your order for <span className="font-semibold text-foreground">{product?.name}</span> has been placed successfully.
              {fullyCovered ? ` Paid in full with your ${site.brand.walletName} 💝` : ""}
            </p>
            {placedOrderId && (
              <p className="text-[11px] font-mono text-muted-foreground mt-3">Order #{placedOrderId.slice(0, 8)}</p>
            )}
          </div>

          <div className="px-6 pb-6 space-y-3">
            <div className="rounded-2xl border border-border/60 p-4 flex items-center gap-3 bg-muted/30">
              <img src={resolveImage(product?.images?.[0] )} alt="" className="w-14 h-14 rounded-xl object-cover bg-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{product?.name}</p>
                <p className="text-xs text-muted-foreground">Total paid · {formatINR(grandTotal)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="outline" className="rounded-full" onClick={() => { setThanksOpen(false); navigate("/account?tab=orders"); }}>
                <Package className="w-4 h-4 mr-1.5" /> My Orders
              </Button>
              <Button className="rounded-full bg-gradient-to-r from-primary to-sky text-primary-foreground" onClick={() => { setThanksOpen(false); navigate("/shop"); }}>
                Continue <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ExpressCheckout;
