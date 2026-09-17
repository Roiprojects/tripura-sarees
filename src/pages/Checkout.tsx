import { resolveImage } from "@/lib/resolveImage";
import { useState, useEffect, useMemo } from "react";
import { computeCartTotals, parseCouponRpcResult, couponErrorMessage, type CouponSpec } from "@/lib/coupon";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Smartphone, CreditCard, Banknote, CheckCircle2, Wallet, MapPin, Phone, User, Home, Briefcase, Star, Mail, Navigation, Building2, Sparkles, ShieldCheck, Truck, Tag, Receipt, Lock, Pencil, Trash2, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useCart } from "@/providers/cart-context";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { formatINR, calcShipping, calcWalletDebit, FREE_SHIPPING_THRESHOLD } from "@/lib/format";
import { site } from "@/config/site";
import { isPhonePlaceholderEmail } from "@/lib/authEmail";
import { FreeDeliveryProgress } from "@/components/FreeDeliveryProgress";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import { startRazorpayPayment } from "@/lib/razorpay";
import { clearBuyNowItem, getCheckoutItems, readBuyNowItem, type BuyNowCartItem } from "@/lib/buyNowCart";

const addressSchema = z.object({
  full_name: z.string().trim().min(2, "Name required").max(100),
  phone: z.string().trim().regex(/^\d{10}$/, "10-digit phone number"),
  alt_phone: z.string().trim().regex(/^\d{10}$/, "10-digit alternate phone").optional().or(z.literal("")),
  email: z.string().trim().email("Valid email required").optional().or(z.literal("")),
  line1: z.string().trim().min(5, "House / Flat / Building required").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  landmark: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80).default("India"),
  pincode: z.string().trim().regex(/^\d{6}$/, "6-digit pincode"),
  address_type: z.enum(["home", "work", "other"]).default("home"),
});

type PayMethod = string; // dynamic — configured in Admin → Payment Methods
type PMRow = { code: string; label: string; description: string | null; icon: string; sort_order: number };
const PM_ICONS: Record<string, any> = {
  CreditCard, Smartphone, Banknote, Wallet,
};


const Checkout = () => {
  const { items: cartItems, subtotal: cartSubtotal, clear, count: cartCount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Buy Now flow: a one-off temporary cart that never merges with the normal cart.
  // ProductDetail replaces this item before every Buy Now navigation, so Checkout
  // always receives exactly one latest Buy Now product.
  const [buyNowItem] = useState<BuyNowCartItem | null>(() => {
    const state = (location.state as any) ?? {};
    if (state.checkoutMode === "cart") return null;
    return state.buyNow ?? readBuyNowItem();
  });
  useEffect(() => {
    if (!buyNowItem) clearBuyNowItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBuyNow = !!buyNowItem;
  // Memoized: in Buy Now mode getCheckoutItems returns a new array literal, and
  // the effects below depend on `items` — an unstable reference re-ran them
  // (and their fetches) on every render, in an endless loop.
  const items = useMemo(
    () => getCheckoutItems(cartItems, buyNowItem as (typeof cartItems)[number] | null),
    [cartItems, buyNowItem],
  );
  const subtotal = isBuyNow
    ? Number(buyNowItem?.product?.price ?? 0) * Number(buyNowItem?.quantity ?? 1)
    : cartSubtotal;
  const count = isBuyNow ? Number(buyNowItem?.quantity ?? 1) : cartCount;

  const [colorImgMap, setColorImgMap] = useState<Record<string, string>>({});
  useEffect(() => {
    const pairs = items.filter((i: any) => i?.color && i?.product_id);
    if (pairs.length === 0) { setColorImgMap({}); return; }
    const ids = [...new Set(pairs.map((i: any) => i.product_id as string))];
    let cancelled = false;
    supabase
      .from("product_color_variants")
      .select("product_id, color_name, images")
      .in("product_id", ids)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const map: Record<string, string> = {};
        (data as any[]).forEach((r) => {
          const img = (r.images ?? []).find(Boolean);
          if (img) map[`${r.product_id}|${String(r.color_name ?? "").trim().toLowerCase()}`] = img;
        });
        setColorImgMap(map);
      });
    return () => { cancelled = true; };
  }, [items]);


  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [pay, setPay] = useState<PayMethod>("upi");
  const [upi, setUpi] = useState("");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [useWalletPay, setUseWalletPay] = useState(false);
  const { balance: walletBalance, refresh: refreshWallet } = useWallet();

  const [pmList, setPmList] = useState<PMRow[]>([]);
  useEffect(() => {
    (supabase as any)
      .from("payment_methods")
      .select("code, label, description, icon, sort_order")
      .eq("enabled", true)
      .order("sort_order")
      .then(({ data }: any) => {
        const rows = (data ?? []) as PMRow[];
        setPmList(rows);
        if (rows.length && !rows.find(r => r.code === pay)) setPay(rows[0].code);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phone-auth users get a synthetic email like `phone_xxx@<site.auth.phoneEmailDomain>`.
  // Don't prefill that in the order email field.
  const isRealEmail = (e?: string | null) => !!e && !isPhonePlaceholderEmail(e);
  const defaultEmail = isRealEmail(user?.email) ? (user!.email as string) : "";
  const emptyForm = {
    full_name: "", phone: "", alt_phone: "", email: defaultEmail,
    line1: "", line2: "", landmark: "",
    city: "", state: "", country: "India", pincode: "",
    address_type: "home" as "home" | "work" | "other",
  };
  const [form, setForm] = useState(emptyForm);

  // Saved-addresses state
  type SavedAddress = {
    id: string; label: string; full_name: string; phone: string; alt_phone: string | null;
    email: string | null; line1: string; line2: string | null; landmark: string | null;
    city: string; state: string; country: string; pincode: string; is_default: boolean;
  };
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressMode, setAddressMode] = useState<"list" | "form">("form");
  const [saveAddress, setSaveAddress] = useState(true);

  const loadAddresses = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) { setAddressesLoaded(true); return; }
    const rows = (data ?? []) as SavedAddress[];
    setSavedAddresses(rows);
    setAddressesLoaded(true);
    if (rows.length > 0) {
      setAddressMode("list");
      const def = rows.find((r) => r.is_default) ?? rows[0];
      setSelectedAddressId(def.id);
      fillFormFromAddress(def);
    } else {
      setAddressMode("form");
    }
  };

  const fillFormFromAddress = (a: SavedAddress) => {
    setForm({
      full_name: a.full_name ?? "",
      phone: a.phone ?? "",
      alt_phone: a.alt_phone ?? "",
      email: isRealEmail(a.email) ? (a.email as string) : defaultEmail,
      line1: a.line1 ?? "",
      line2: a.line2 ?? "",
      landmark: a.landmark ?? "",
      city: a.city ?? "",
      state: a.state ?? "",
      country: a.country ?? "India",
      pincode: a.pincode ?? "",
      address_type: (["home","work","other"].includes(a.label) ? a.label : "home") as "home" | "work" | "other",
    });
  };

  useEffect(() => { loadAddresses(); /* eslint-disable-next-line */ }, [user?.id]);

  const [pinLoading, setPinLoading] = useState(false);
  const [areaSuggestions, setAreaSuggestions] = useState<string[]>([]);
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);

  const lookupPincode = async (pin: string) => {
    if (!/^\d{6}$/.test(pin)) return;
    setPinLoading(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const json = await res.json();
      const offices = (json?.[0]?.PostOffice ?? []) as Array<{ Name: string; District: string; State: string; Block: string }>;
      const po = offices[0];
      if (po) {
        setForm((f) => ({ ...f, city: f.city || po.District || po.Block || "", state: f.state || po.State || "" }));
        toast.success(`📍 ${po.District}, ${po.State}`);
        const areas = Array.from(new Set(offices.map((o) => o.Name).filter(Boolean)));
        setAreaSuggestions(areas);
        if (areas.length > 0) setShowAreaSuggestions(true);
      } else {
        setAreaSuggestions([]);
      }
    } catch { /* silent */ }
    finally { setPinLoading(false); }
  };

  const filteredAreas = areaSuggestions.filter((a) =>
    !form.line2 || a.toLowerCase().includes(form.line2.toLowerCase()),
  );

  const rawShipping = calcShipping(subtotal, count);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<import("@/lib/coupon").CouponSpec | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [productMeta, setProductMeta] = useState<Record<string, { category_id: string | null; brand: string | null; is_preorder: boolean }>>({});

  // Fetch category/brand/preorder metadata for coupon eligibility checks
  useEffect(() => {
    const ids = [...new Set(items.map((i) => i.product_id))];
    if (ids.length === 0) { setProductMeta({}); return; }
    let cancelled = false;
    (supabase.from("products").select("id, category_id, brand, preorder_enabled" as any).in("id", ids) as any)
      .then(({ data }: any) => {
        if (cancelled || !data) return;
        const m: any = {};
        (data as any[]).forEach((p) => {
          m[p.id] = { category_id: p.category_id, brand: p.brand, is_preorder: !!p.preorder_enabled };
        });
        setProductMeta(m);
      });
    return () => { cancelled = true; };
  }, [items]);

  const cartLines = useMemo(() => items.map((i: any) => {
    const meta: any = productMeta[i.product_id] ?? {};
    return {
      product_id: i.product_id,
      quantity: Number(i.quantity ?? 1),
      unit_price: Number(i.product?.price ?? 0),
      category_id: meta.category_id ?? null,
      brand: meta.brand ?? null,
      is_preorder: !!meta.is_preorder,
    };
  }), [items, productMeta]);

  const totals = useMemo(
    () => computeCartTotals(cartLines, appliedCoupon, rawShipping),
    [cartLines, appliedCoupon, rawShipping],
  );

  const discount = totals.couponDiscount;
  const shipping = totals.shipping;
  const grandTotal = totals.total;
  const maxApplyByBalance = Math.floor((walletBalance / 1.07) * 100) / 100;
  const requestedApply = useWalletPay ? Math.min(maxApplyByBalance, grandTotal) : 0;
  const walletApplied = Math.max(0, requestedApply);
  const walletFee = calcWalletDebit(walletApplied).fee;
  const walletDebit = walletApplied + walletFee;
  const total = grandTotal;
  const payable = Math.max(0, grandTotal - walletApplied);
  const fullyCoveredByWallet = walletApplied >= grandTotal && walletApplied > 0;

  const applyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setCouponLoading(true);
    const { data, error } = await supabase.rpc("validate_coupon_v2" as any, {
      p_code: code,
      p_subtotal: subtotal,
    });
    setCouponLoading(false);
    const res = data as any;
    if (error || !res || !res.ok) {
      toast.error(couponErrorMessage(res?.error, { min_order: Number(res?.min_order ?? 0) }));
      return;
    }
    const spec = parseCouponRpcResult(res);
    setAppliedCoupon(spec);
    toast.success(`Coupon ${res.code} applied`);
  };


  if (!user) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Please sign in to checkout</h1>
          <Button asChild variant="pill" size="lg" className="mt-6"><Link to="/auth">Sign in</Link></Button>
        </div>
      </Layout>
    );
  }
  if (items.length === 0) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Your cart is empty</h1>
          <Button asChild variant="pill" size="lg" className="mt-6"><Link to="/shop">Shop now</Link></Button>
        </div>
      </Layout>
    );
  }

  const persistAddress = async () => {
    if (!user) return null;
    const payload = {
      user_id: user.id,
      label: form.address_type,
      full_name: form.full_name,
      phone: form.phone,
      alt_phone: form.alt_phone || null,
      email: form.email || null,
      line1: form.line1,
      line2: form.line2 || null,
      landmark: form.landmark || null,
      city: form.city,
      state: form.state,
      country: form.country,
      pincode: form.pincode,
    };
    if (editingAddressId) {
      const { data, error } = await supabase
        .from("user_addresses")
        .update(payload)
        .eq("id", editingAddressId)
        .select()
        .single();
      if (error) { toast.error("Couldn't update address: " + error.message); return null; }
      toast.success("Address updated");
      return data as any;
    }
    const { data, error } = await supabase
      .from("user_addresses")
      .insert({ ...payload, is_default: savedAddresses.length === 0 })
      .select()
      .single();
    if (error) { toast.error("Couldn't save address: " + error.message); return null; }
    toast.success("Address saved to your account");
    return data as any;
  };

  const handleSaveAddressOnly = async () => {
    const result = addressSchema.safeParse(form);
    if (!result.success) { toast.error(result.error.issues[0].message); return; }
    const saved = await persistAddress();
    if (saved) {
      await loadAddresses();
      setEditingAddressId(null);
      setSelectedAddressId(saved.id);
      setAddressMode("list");
    }
  };

  const handleEditAddress = (a: SavedAddress) => {
    fillFormFromAddress(a);
    setEditingAddressId(a.id);
    setAddressMode("form");
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Delete this saved address?")) return;
    const { error } = await supabase.from("user_addresses").delete().eq("id", id);
    if (error) { toast.error("Couldn't delete: " + error.message); return; }
    toast.success("Address deleted");
    const remaining = savedAddresses.filter((a) => a.id !== id);
    setSavedAddresses(remaining);
    if (selectedAddressId === id) {
      if (remaining.length > 0) {
        setSelectedAddressId(remaining[0].id);
        fillFormFromAddress(remaining[0]);
      } else {
        setSelectedAddressId(null);
        setForm(emptyForm);
        setAddressMode("form");
      }
    }
  };

  const handleAddNewAddress = () => {
    setEditingAddressId(null);
    setSelectedAddressId(null);
    setForm(emptyForm);
    setAddressMode("form");
  };

  const handleSetDefault = async (id: string) => {
    const { error } = await supabase
      .from("user_addresses")
      .update({ is_default: true })
      .eq("id", id);
    if (error) { toast.error("Couldn't set default: " + error.message); return; }
    toast.success("Default address updated");
    setSavedAddresses((prev) =>
      prev.map((a) => ({ ...a, is_default: a.id === id }))
    );
  };

  const continueToPayment = async () => {
    const result = addressSchema.safeParse(form);
    if (!result.success) { toast.error(result.error.issues[0].message); return; }
    // If we're in the form (new / edited) and user opted to save, persist now.
    if (addressMode === "form" && saveAddress) {
      const saved = await persistAddress();
      if (saved) {
        await loadAddresses();
        setSelectedAddressId(saved.id);
        setEditingAddressId(null);
      }
    }
    setStep(2);
  };


  const validatePayment = (): boolean => {
    if (fullyCoveredByWallet) return true;
    if (pay === "cod") return true;
    // UPI/Card both routed through Razorpay — no inline card fields needed,
    // but we keep the optional fields for users who fill them. Skip strict validation.
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validatePayment()) return;
    const result = addressSchema.safeParse(form);
    if (!result.success) { toast.error("Invalid address"); return; }

    setSubmitting(true);

    // Final stock validation against current DB stock before placing the order
    const productIds = [...new Set(items.map((i) => i.product_id))];
    const [variantsRes, productsRes] = await Promise.all([
      supabase.from("product_variants").select("product_id, size, color_name, stock_quantity").in("product_id", productIds),
      supabase.from("products").select("id, name, stock").in("id", productIds),
    ]);
    const variants = variantsRes.data ?? [];
    const products = productsRes.data ?? [];
    for (const it of items) {
      const combo = variants.find((v) => v.product_id === it.product_id && v.size === it.size && (v.color_name ?? "") === (it.color ?? ""));
      const sizeOnly = variants.find((v) => v.product_id === it.product_id && v.size === it.size);
      const prod = products.find((p) => p.id === it.product_id);
      const available = combo?.stock_quantity ?? sizeOnly?.stock_quantity ?? prod?.stock ?? 0;
      if (it.quantity > available) {
        setSubmitting(false);
        toast.error(
          available <= 0
            ? `${prod?.name ?? "An item"} is out of stock. Please remove it from your cart.`
            : `Only ${available} left for ${prod?.name ?? "an item"} (${it.size}${it.color ? ` · ${it.color}` : ""}). Please update your cart.`,
        );
        return;
      }
    }

    const needsGateway = !fullyCoveredByWallet && pay !== "cod" && payable > 0;
    const orderStatus = (pay === "cod" && !fullyCoveredByWallet) ? "pending" : (needsGateway ? "pending" : "confirmed");
    const paymentStatus = payable === 0 ? "paid" : "pending";

    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id,
      status: orderStatus,
      total,
      shipping_address: result.data,
      payment_status: paymentStatus,
      payment_method: needsGateway ? "razorpay" : (pay === "cod" ? "cod" : "wallet"),
    }).select().single();

    if (error || !order) { setSubmitting(false); toast.error("Couldn't place order: " + (error?.message ?? "unknown")); return; }

    // Fetch SKU + color-variant images for each (product, size, color)
    const variantSkus: Record<string, string | null> = {};
    const colorImages: Record<string, string | null> = {};
    {
      const productIds = Array.from(new Set(items.map((i) => i.product_id)));
      const [{ data: variantRows }, { data: colorRows }] = await Promise.all([
        supabase
          .from("product_variants")
          .select("product_id, size, color_name, sku_code")
          .in("product_id", productIds),
        supabase
          .from("product_color_variants")
          .select("product_id, color_name, images")
          .in("product_id", productIds),
      ]);
      for (const i of items) {
        const exact = variantRows?.find(
          (v: any) => v.product_id === i.product_id && v.size === i.size && (v.color_name ?? "") === (i.color ?? "")
        );
        const sizeOnly = variantRows?.find((v: any) => v.product_id === i.product_id && v.size === i.size);
        variantSkus[`${i.product_id}|${i.size}|${i.color}`] =
          (exact as any)?.sku_code ?? (sizeOnly as any)?.sku_code ?? null;

        const colorMatch = colorRows?.find(
          (c: any) => c.product_id === i.product_id && (c.color_name ?? "").toLowerCase() === (i.color ?? "").toLowerCase()
        );
        const colorImg = isBuyNow ? null : (colorMatch as any)?.images?.[0] ?? null;
        colorImages[`${i.product_id}|${i.color}`] = colorImg;
      }
    }

    const orderItems = items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      quantity: i.quantity,
      size: i.size,
      color: i.color,
      price: i.product?.price ?? 0,
      sku: variantSkus[`${i.product_id}|${i.size}|${i.color}`] ?? null,
      product_name: i.product?.name ?? null,
      product_image: colorImages[`${i.product_id}|${i.color}`] ?? i.product?.images?.[0] ?? null,
    }));
    const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);

    if (itemsErr) {
      await supabase.from("orders").delete().eq("id", order.id);
      setSubmitting(false); toast.error("Order failed: " + itemsErr.message); return;
    }

    // Razorpay gateway flow
    if (needsGateway) {
      const res = await startRazorpayPayment({
        orderId: order.id,
        amount: payable,
        description: `${site.brand.name} order`,
        prefill: { name: form.full_name, contact: form.phone },
      });
      if (!res.ok) {
        const failed = res as { ok: false; reason: "dismissed" | "failed" | "verify_failed"; message?: string; paymentId?: string };
        if (failed.reason === "verify_failed") {
          // Payment succeeded at Razorpay but our confirmation failed.
          // KEEP the order row so admin can reconcile — do NOT delete.
          setSubmitting(false);
          toast.error(
            failed.message || "Payment received, but order confirmation is pending. Please contact support.",
            { duration: 8000 },
          );
          navigate("/orders");
          return;
        }
        // Dismissed or failed at gateway → safe to roll back the pending order
        await supabase.from("orders").delete().eq("id", order.id);
        setSubmitting(false);
        if (failed.reason === "dismissed") toast.info("Payment cancelled. Your cart is still saved.");
        else toast.error(failed.message || "Payment failed. Please try again.");
        return;
      }
    }


    // Apply wallet debit atomically (after payment success, if any)
    if (walletApplied > 0) {
      const { error: wErr } = await (supabase as any).rpc("debit_wallet_for_order", {
        p_order_id: order.id, p_amount: walletApplied,
      });
      if (wErr) {
        setSubmitting(false);
        toast.error("Payment received but wallet debit failed: " + wErr.message);
        navigate("/orders");
        return;
      }
      refreshWallet();
    }

    await (supabase as any).rpc("decrement_stock_for_order", { p_order_id: order.id });
    if (appliedCoupon && discount > 0) {
      // Query builders have no .catch(); failures come back as `error`. The
      // order is already placed, so a failed usage record must not block it.
      const { error: couponErr } = await (supabase as any).rpc("record_coupon_use", {
        p_code: appliedCoupon.code,
        p_order_id: order.id,
        p_discount: discount,
      });
      if (couponErr) console.error("record_coupon_use failed", couponErr);
    }
    if (isBuyNow) {
      clearBuyNowItem();
    } else {
      await clear();
    }
    supabase.functions.invoke("send-order-confirmation-sms", { body: { order_id: order.id } }).catch(() => {});
    setSubmitting(false);
    toast.success(
      fullyCoveredByWallet
        ? "Order placed using wallet balance 💝"
        : pay === "cod"
        ? "Order placed! Pay on delivery 💝"
        : "Payment successful! Your order has been placed."
    );
    navigate("/orders");
  };

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Checkout</h1>
        <div className="flex items-center gap-2 mb-8 text-sm">
          <span className={step >= 1 ? "font-semibold text-primary" : "text-muted-foreground"}>1. Address</span>
          <span className="text-muted-foreground">→</span>
          <span className={step >= 2 ? "font-semibold text-primary" : "text-muted-foreground"}>2. Payment</span>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-6">
            <Card className="rounded-2xl p-6 shadow-card border-border/60 bg-gradient-to-br from-background via-background to-primary/5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="font-display text-xl font-bold leading-tight">Shipping address</h2>
                    <p className="text-xs text-muted-foreground">Where should we deliver your sarees?</p>
                  </div>
                </div>
                {step === 2 && <button onClick={() => setStep(1)} className="text-xs font-semibold text-primary underline">Edit</button>}
              </div>
              {step === 1 ? (
                <>
                  {addressesLoaded && savedAddresses.length > 0 && addressMode === "list" && (
                    <div className="mb-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Select a saved address</p>
                        <button
                          type="button"
                          onClick={handleAddNewAddress}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add new address
                        </button>
                      </div>
                      <div className="grid gap-3">
                        {savedAddresses.map((a) => {
                          const active = selectedAddressId === a.id;
                          const Icon = a.label === "work" ? Briefcase : a.label === "other" ? Star : Home;
                          return (
                            <div
                              key={a.id}
                              className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                              onClick={() => { setSelectedAddressId(a.id); fillFormFromAddress(a); }}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0 text-sm">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold">{a.full_name}</span>
                                    <span className="text-[10px] uppercase tracking-wider font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{a.label}</span>
                                    {a.is_default && (
                                      <span className="text-[10px] uppercase tracking-wider font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full">Default</span>
                                    )}
                                  </div>
                                  <p className="text-muted-foreground mt-1 leading-snug">
                                    {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} — {a.pincode}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">📞 {a.phone}</p>
                                </div>
                                <div className="flex flex-col gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleEditAddress(a); }}
                                    className="w-8 h-8 rounded-full hover:bg-primary/10 text-primary flex items-center justify-center"
                                    aria-label="Edit address"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteAddress(a.id); }}
                                    className="w-8 h-8 rounded-full hover:bg-destructive/10 text-destructive flex items-center justify-center"
                                    aria-label="Delete address"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              {!a.is_default && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleSetDefault(a.id); }}
                                  className="mt-2 ml-12 text-[11px] font-semibold uppercase tracking-wider text-primary hover:underline"
                                >
                                  Set as default
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {addressMode === "form" && (
                  <>
                  {savedAddresses.length > 0 && (
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-semibold">{editingAddressId ? "Edit address" : "Add new address"}</p>
                      <button
                        type="button"
                        onClick={() => { setAddressMode("list"); setEditingAddressId(null); const sel = savedAddresses.find((a) => a.id === selectedAddressId) ?? savedAddresses[0]; if (sel) { setSelectedAddressId(sel.id); fillFormFromAddress(sel); } }}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        ← Use saved address
                      </button>
                    </div>
                  )}
                  <div className="mb-5">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Save address as</p>

                    <div className="flex flex-wrap gap-2">
                      {([
                        { v: "home", label: "Home", Icon: Home },
                        { v: "work", label: "Work", Icon: Briefcase },
                        { v: "other", label: "Other", Icon: Star },
                      ] as const).map(({ v, label, Icon }) => {
                        const active = form.address_type === v;
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setForm({ ...form, address_type: v })}
                            className={`inline-flex items-center gap-1.5 px-4 h-9 rounded-full border-2 text-sm font-semibold transition-all ${
                              active
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background border-border hover:border-primary/60 hover:text-primary"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" /> {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Contact details</p>
                  <div className="grid sm:grid-cols-2 gap-4 mb-5">
                    <div className="sm:col-span-2">
                      <Label htmlFor="full_name" className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-muted-foreground" />Full name</Label>
                      <Input id="full_name" value={form.full_name} maxLength={100} placeholder="As on ID"
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded-full mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground" />Mobile number</Label>
                      <Input id="phone" value={form.phone} maxLength={10} placeholder="10-digit mobile" inputMode="numeric"
                        onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} className="rounded-full mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="alt_phone" className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground" />Alternate phone <span className="text-muted-foreground/70 font-normal">(optional)</span></Label>
                      <Input id="alt_phone" value={form.alt_phone} maxLength={10} placeholder="Backup contact" inputMode="numeric"
                        onChange={(e) => setForm({ ...form, alt_phone: e.target.value.replace(/\D/g, "") })} className="rounded-full mt-1" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="email" className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-muted-foreground" />Email <span className="text-muted-foreground/70 font-normal">(for order updates)</span></Label>
                      <Input id="email" type="email" value={form.email} placeholder="you@example.com"
                        onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-full mt-1" />
                    </div>
                  </div>

                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Delivery address</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pincode" className="flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5 text-muted-foreground" />Pincode</Label>
                      <div className="relative mt-1">
                        <Input id="pincode" value={form.pincode} maxLength={6} placeholder="6-digit pin" inputMode="numeric"
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, "");
                            setForm({ ...form, pincode: v });
                            if (v.length === 6) lookupPincode(v);
                          }} className="rounded-full pr-20" />
                        {pinLoading && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">Locating…</span>}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="country" className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-muted-foreground" />Country</Label>
                      <Input id="country" value={form.country} maxLength={80}
                        onChange={(e) => setForm({ ...form, country: e.target.value })} className="rounded-full mt-1" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="line1" className="flex items-center gap-1.5"><Home className="w-3.5 h-3.5 text-muted-foreground" />House / Flat / Building</Label>
                      <Input id="line1" value={form.line1} maxLength={200} placeholder="Flat 302, Sunrise Apartments"
                        onChange={(e) => setForm({ ...form, line1: e.target.value })} className="rounded-full mt-1" />
                    </div>
                    <div className="sm:col-span-2 relative">
                      <Label htmlFor="line2">Area / Street / Sector <span className="text-muted-foreground/70 font-normal">(optional)</span></Label>
                      <Input
                        id="line2"
                        value={form.line2}
                        maxLength={200}
                        placeholder={areaSuggestions.length ? "Start typing or pick a nearby area below" : "MG Road, Sector 21"}
                        autoComplete="off"
                        onChange={(e) => { setForm({ ...form, line2: e.target.value }); setShowAreaSuggestions(true); }}
                        onFocus={() => { if (areaSuggestions.length) setShowAreaSuggestions(true); }}
                        onBlur={() => { setTimeout(() => setShowAreaSuggestions(false), 150); }}
                        className="rounded-full mt-1"
                      />
                      {showAreaSuggestions && filteredAreas.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-2xl border border-border bg-popover shadow-xl overflow-hidden max-h-60 overflow-y-auto animate-fade-in">
                          <p className="px-4 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-muted/40 border-b border-border/60">
                            Suggested areas in {form.pincode}
                          </p>
                          {filteredAreas.slice(0, 12).map((area) => (
                            <button
                              key={area}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setForm({ ...form, line2: area });
                                setShowAreaSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 hover:text-primary flex items-center gap-2 transition-colors"
                            >
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{area}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="landmark" className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-muted-foreground" />Landmark <span className="text-muted-foreground/70 font-normal">(helps the courier find you)</span></Label>
                      <Textarea id="landmark" value={form.landmark} maxLength={120} rows={2}
                        placeholder="Near Reliance Mall, opposite blue temple"
                        onChange={(e) => setForm({ ...form, landmark: e.target.value })} className="rounded-2xl mt-1 resize-none" />
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input id="city" value={form.city} maxLength={80}
                        onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-full mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input id="state" value={form.state} maxLength={80}
                        onChange={(e) => setForm({ ...form, state: e.target.value })} className="rounded-full mt-1" />
                    </div>
                  </div>

                  <div className="mt-5 flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/15 p-3">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-foreground/80">
                      Your details are encrypted & only used for delivery. No returns — refund amount will be credited to your wallet.
                    </p>
                  </div>

                  <label className="mt-4 flex items-center gap-2 text-xs text-foreground/80 cursor-pointer select-none">
                    <Checkbox checked={saveAddress} onCheckedChange={(v) => setSaveAddress(!!v)} />
                    Save this address to my account for future orders
                  </label>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button variant="outline" size="lg" className="rounded-full" onClick={handleSaveAddressOnly}>
                      {editingAddressId ? "Update Address" : "Save Address"}
                    </Button>
                    <Button variant="pill" size="lg" onClick={continueToPayment}>
                      Continue to payment
                    </Button>
                  </div>
                  </>
                  )}

                  {addressMode === "list" && savedAddresses.length > 0 && (
                    <Button variant="pill" size="lg" className="mt-2 w-full sm:w-auto" onClick={continueToPayment} disabled={!selectedAddressId}>
                      Continue to payment
                    </Button>
                  )}
                </>

              ) : (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {form.address_type === "home" ? <Home className="w-3 h-3" /> : form.address_type === "work" ? <Briefcase className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                      {form.address_type}
                    </span>
                    <span className="font-semibold">{form.full_name}</span>
                    <span className="text-muted-foreground">· {form.phone}</span>
                  </div>
                  <p className="text-foreground/80 leading-relaxed">
                    {form.line1}{form.line2 ? `, ${form.line2}` : ""}<br />
                    {form.landmark && <span className="text-muted-foreground">Landmark: {form.landmark}<br /></span>}
                    {form.city}, {form.state} — <span className="font-semibold">{form.pincode}</span><br />
                    {form.country}
                  </p>
                </div>
              )}
            </Card>

            {step === 2 && (
              <Card className="rounded-2xl p-6 shadow-card border-border/60">
                <h2 className="font-display text-xl font-bold mb-4">Payment method</h2>

                {walletBalance > 0 && (
                  <label className={`mb-4 flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all bg-gradient-to-r from-primary/5 to-sky/5 ${useWalletPay ? "border-primary" : "border-border"}`}>
                    <Checkbox checked={useWalletPay} onCheckedChange={(v) => setUseWalletPay(!!v)} className="mt-0.5" />
                    <Wallet className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">Use {site.brand.walletName}</p>
                      <p className="text-xs text-muted-foreground">
                        Available balance: <span className="font-semibold text-foreground">{formatINR(walletBalance)}</span>
                        {useWalletPay && walletApplied > 0 && (
                          <> · Applying <span className="font-semibold text-primary">{formatINR(walletApplied)}</span></>
                        )}
                      </p>
                      {useWalletPay && walletApplied > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          A 7% processing fee ({formatINR(walletFee)}) is auto-deducted from wallet.
                          Total wallet debit: <span className="font-semibold text-foreground">{formatINR(walletDebit)}</span>
                        </p>
                      )}
                    </div>
                  </label>
                )}

                {fullyCoveredByWallet ? (
                  <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 text-sm">
                    <p className="font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Fully covered by wallet</p>
                    <p className="text-xs text-muted-foreground mt-1">No additional payment needed.</p>
                  </div>
                ) : (
                <RadioGroup value={pay} onValueChange={(v) => setPay(v as PayMethod)} className="space-y-3">
                  {pmList.length === 0 && (
                    <p className="text-sm text-muted-foreground">No payment methods available. Please contact support.</p>
                  )}
                  {pmList.map((pm) => {
                    const Icon = PM_ICONS[pm.icon] ?? Wallet;
                    const active = pay === pm.code;
                    return (
                      <div key={pm.code}>
                        <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${active ? "border-primary bg-primary/5" : "border-border"}`}>
                          <RadioGroupItem value={pm.code} id={`pm-${pm.code}`} />
                          <Icon className="w-5 h-5 text-primary" />
                          <div className="flex-1">
                            <p className="font-semibold">{pm.label}</p>
                            {pm.description && <p className="text-xs text-muted-foreground">{pm.description}</p>}
                          </div>
                        </label>
                        {pm.code === "card" && active && (
                          <div className="ml-12 mt-3 grid sm:grid-cols-2 gap-3">
                            <div className="sm:col-span-2"><Label>Card number</Label>
                              <Input placeholder="1234 5678 9012 3456" maxLength={19} value={card.number}
                                onChange={(e) => setCard({ ...card, number: e.target.value })} className="rounded-full mt-1" /></div>
                            <div className="sm:col-span-2"><Label>Card holder</Label>
                              <Input placeholder="Name on card" value={card.name}
                                onChange={(e) => setCard({ ...card, name: e.target.value })} className="rounded-full mt-1" /></div>
                            <div><Label>Expiry</Label>
                              <Input placeholder="MM/YY" maxLength={5} value={card.expiry}
                                onChange={(e) => setCard({ ...card, expiry: e.target.value })} className="rounded-full mt-1" /></div>
                            <div><Label>CVV</Label>
                              <Input placeholder="123" maxLength={3} value={card.cvv}
                                onChange={(e) => setCard({ ...card, cvv: e.target.value })} className="rounded-full mt-1" /></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>

                )}
                <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Secure payments by Razorpay · UPI, Cards, Netbanking & Wallets.
                </p>
              </Card>
            )}
          </div>

          <Card className="relative overflow-hidden rounded-3xl p-0 border-border/60 h-fit lg:sticky lg:top-24 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.35)]">
            {/* Decorative gradient header */}
            <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-b border-border/60">
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 backdrop-blur flex items-center justify-center ring-1 ring-primary/20">
                    <Receipt className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold leading-tight">Order Summary</h2>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-3 h-3 text-primary" /> Curated with love
                    </p>
                  </div>
                </div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-primary bg-background/80 backdrop-blur ring-1 ring-primary/20 rounded-full px-3 py-1.5 shadow-sm">
                  {count} {count === 1 ? "item" : "items"}
                </span>
              </div>
            </div>

            <div className="p-6 pt-5">
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 -mr-1 scrollbar-thin">
                {items.map((i) => {
                  const img = resolveImage(isBuyNow
                    ? i.product?.images?.find(Boolean)
                    : colorImgMap[`${i.product_id}|${String(i.color ?? "").trim().toLowerCase()}`] || i.product?.images?.find(Boolean));
                  const lineTotal = (i.product?.price ?? 0) * i.quantity;
                  return (
                    <div key={i.id} className="group flex items-center gap-3 p-2.5 rounded-2xl hover:bg-muted/50 transition-all duration-300 hover:shadow-sm">
                      <div className="relative shrink-0">
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                        <img
                          src={img}
                          alt={i.product?.name || "Product"}
                          className="relative w-16 h-16 rounded-xl object-cover border border-border/60 shadow-sm bg-muted"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = resolveImage(); }}
                        />
                        <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md ring-2 ring-background">
                          {i.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">{i.product?.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {[i.size, i.color].filter(Boolean).join(" · ") || "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatINR(i.product?.price ?? 0)} <span className="opacity-60">×</span> {i.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-display font-bold whitespace-nowrap tabular-nums">{formatINR(lineTotal)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Coupon */}
              <div className="mt-5 rounded-2xl border border-dashed border-primary/30 bg-primary/[0.03] p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" /> Coupon code
                </p>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-3 py-2.5 text-sm">
                    <span className="text-green-700 font-semibold truncate flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> {appliedCoupon.code} applied
                    </span>
                    <button
                      type="button"
                      onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                      className="text-xs text-green-700 hover:underline shrink-0 ml-2 font-medium"
                    >Remove</button>
                  </div>
                ) : (
                  <div className="flex gap-2 w-full">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="h-10 text-sm flex-1 min-w-0 rounded-xl border-2 uppercase tracking-wider font-semibold bg-background"
                    />
                    <Button
                      type="button"
                      variant="default"
                      onClick={applyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="h-10 px-5 shrink-0 rounded-xl"
                    >
                      {couponLoading ? "..." : "Apply"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="mt-5 space-y-2.5 text-sm">
                {totals.productDiscount > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Original price</span>
                      <span className="tabular-nums line-through text-muted-foreground">{formatINR(totals.subtotalOriginal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-green-700">
                      <span>Product discount</span>
                      <span className="font-semibold tabular-nums">− {formatINR(totals.productDiscount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold tabular-nums">{formatINR(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" /> Shipping {count >= 2 ? `(${count} items)` : "(1 item)"}
                  </span>
                  <span className={`font-semibold tabular-nums ${shipping === 0 ? "text-green-600" : ""}`}>
                    {shipping === 0 ? (totals.freeShipping ? "FREE (coupon)" : "FREE") : formatINR(shipping)}
                  </span>
                </div>
                {shipping > 0 && subtotal < FREE_SHIPPING_THRESHOLD && (
                  <FreeDeliveryProgress subtotal={subtotal} className="mt-1" />
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Coupon ({appliedCoupon?.code})</span>
                    <span className="font-semibold tabular-nums">− {formatINR(discount)}</span>
                  </div>
                )}
                {walletApplied > 0 && (
                  <>
                    <div className="flex justify-between text-primary">
                      <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Wallet applied</span>
                      <span className="font-semibold tabular-nums">− {formatINR(walletApplied)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Wallet processing fee (7%)</span>
                      <span className="tabular-nums">{formatINR(walletFee)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Total */}
              <div className="mt-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 p-4 ring-1 ring-primary/15">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                      {walletApplied > 0 ? "Amount payable" : "Grand total"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Inclusive of all taxes</p>
                  </div>
                  <span className="font-display text-2xl font-bold tabular-nums bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {formatINR(payable)}
                  </span>
                </div>
              </div>

              {step === 2 && (
                <Button variant="pill" size="lg" className="w-full mt-5 h-12 text-base font-semibold shadow-lg shadow-primary/20" disabled={submitting} onClick={handlePlaceOrder}>
                  {submitting
                    ? "Processing..."
                    : fullyCoveredByWallet
                    ? `Place order with wallet`
                    : pay === "cod"
                    ? "Place order"
                    : `Pay ${formatINR(payable)}`}
                </Button>
              )}

              {/* Trust badges */}
              <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Secure</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Encrypted</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Fast delivery</span>
              </div>
            </div>
          </Card>

        </div>
      </div>
    </Layout>
  );
};

export default Checkout;
