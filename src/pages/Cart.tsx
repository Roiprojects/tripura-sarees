import { resolveImage } from "@/lib/resolveImage";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, X, ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/providers/cart-context";
import { formatINR, calcShipping, FREE_SHIPPING_THRESHOLD } from "@/lib/format";
import { FreeDeliveryProgress } from "@/components/FreeDeliveryProgress";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getColorCss } from "@/lib/colorUtils";
import {
  clearBuyNowCartLine,
  clearBuyNowItem,
  readBuyNowCartLine,
  readBuyNowItem,
  setBuyNowCartLine,
} from "@/lib/buyNowCart";

const cleanVariantValue = (value: unknown) => String(value ?? "").trim();

const cartRenderKey = (item: { id: string; product_id: string; size?: string | null; color?: string | null }) =>
  `${item.id}:${item.product_id}:${encodeURIComponent(cleanVariantValue(item.size))}:${encodeURIComponent(cleanVariantValue(item.color))}`;



const colorKey = (productId: string, color?: string | null) =>
  `${productId}|${cleanVariantValue(color).toLowerCase()}`;

const Cart = () => {
  const { items, loading, add, updateQty, updateVariant, remove, subtotal, count } = useCart();
  const navigate = useNavigate();
  const shipping = calcShipping(subtotal, count);
  const total = subtotal + shipping;
  const [colorImageMap, setColorImageMap] = useState<Record<string, string[]>>({});
  // True while we move the temporary Buy Now item into the real cart on mount.
  // Prevents the empty-cart redirect from firing before the promotion completes.
  const [promotingBuyNow, setPromotingBuyNow] = useState(() => !!readBuyNowItem());

  useEffect(() => {
    const bn = readBuyNowItem();
    if (!bn) return;
    let cancelled = false;
    (async () => {
      try {
        const prev = readBuyNowCartLine();
        if (prev) {
          const prior = items.find(
            (i) =>
              i.product_id === prev.product_id &&
              cleanVariantValue(i.size) === prev.size &&
              cleanVariantValue(i.color) === prev.color,
          );
          if (prior) await remove(prior.id);
        }
        await add(
          bn.product,
          cleanVariantValue(bn.size),
          cleanVariantValue(bn.color),
          Math.max(1, Number(bn.quantity) || 1),
          { silent: true },
        );
        setBuyNowCartLine({
          product_id: bn.product_id,
          size: cleanVariantValue(bn.size),
          color: cleanVariantValue(bn.color),
        });
      } finally {
        clearBuyNowItem();
        if (!cancelled) setPromotingBuyNow(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Run once on mount — we only promote the item that exists at entry time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const pairs = items
      .filter((i) => cleanVariantValue(i.color))
      .map((i) => ({ pid: i.product_id, color: cleanVariantValue(i.color) }));
    if (pairs.length === 0) { setColorImageMap({}); return; }
    const ids = [...new Set(pairs.map((p) => p.pid))];
    let cancelled = false;
    supabase
      .from("product_color_variants")
      .select("product_id, color_name, images")
      .in("product_id", ids)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const map: Record<string, string[]> = {};
        (data as { product_id: string; color_name: string; images: string[] | null }[]).forEach((r) => {
          const imgs = (r.images ?? []).filter(Boolean);
          if (imgs.length) map[colorKey(r.product_id, r.color_name)] = imgs;
        });
        setColorImageMap(map);
      });
    return () => { cancelled = true; };
  }, [items]);


  if ((loading || promotingBuyNow) && items.length === 0) {
    return (
      <Layout>
        <div className="container py-8 md:py-12" aria-label="Preparing cart">
          <div className="mb-8 h-10 w-48 rounded-xl bg-muted/50 animate-pulse" />
          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            <div className="space-y-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="h-36 rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </div>
            <Card className="h-80 rounded-[28px] bg-muted/40 animate-pulse" />
          </div>
        </div>
      </Layout>
    );
  }


  if (items.length === 0) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <ShoppingBag className="w-16 h-16 text-primary/40 mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold">Your cart is empty</h1>
          <p className="text-muted-foreground mt-2">Discover something lovely to add.</p>
          <Button asChild variant="pill" size="lg" className="mt-6">
            <Link to="/shop">Continue shopping</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="relative">
        {/* ambient backdrop */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-40 -right-24 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
        </div>
        <div className="container relative py-8 md:py-12">
          <div className="mb-8 flex items-end justify-between flex-wrap gap-3 animate-fade-in">
            <div>
              <span className="inline-block text-[11px] uppercase tracking-[0.25em] text-primary/80 font-semibold mb-2">
                ✦ Your Selection
              </span>
              <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
                Your Cart
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{count}</span> {count === 1 ? "item" : "items"} curated for you
            </p>
          </div>
          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            <div className="space-y-5">
              {items.map((item, idx) => (
                <div
                  key={cartRenderKey(item)}
                  className="animate-fade-in"
                  style={{ animationDelay: `${idx * 80}ms`, animationFillMode: "both" }}
                >
                  <CartRow
                    item={item}
                    colorImages={colorImageMap[colorKey(item.product_id, item.color)]}
                    onUpdateQty={updateQty}
                    onRemove={remove}
                  />
                </div>
              ))}

            </div>
          <Card className="relative overflow-hidden rounded-[28px] p-0 border-0 h-fit lg:sticky lg:top-24 animate-fade-in">
            {/* premium layered background */}
            <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-primary/[0.04]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_55%),radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.10),transparent_55%)]" />
            {/* gradient ring border */}
            <div className="absolute inset-0 rounded-[28px] p-px bg-gradient-to-br from-primary/40 via-border/40 to-accent/40 pointer-events-none [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] [mask-composite:exclude]" />
            {/* shimmer top line */}
            <div className="pointer-events-none absolute inset-x-6 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
            {/* corner glows */}
            <div className="pointer-events-none absolute -top-28 -right-20 w-64 h-64 rounded-full bg-primary/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-20 w-64 h-64 rounded-full bg-accent/15 blur-3xl" />

            <div className="relative p-7">
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
                    <ShoppingBag className="w-4 h-4 text-primary-foreground" />
                  </span>
                  <div>
                    <h2 className="font-display text-xl font-bold tracking-tight leading-none">
                      Order Summary
                    </h2>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-semibold">
                      Premium checkout
                    </span>
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-primary px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm shadow-sm">
                  {count} {count === 1 ? "item" : "items"}
                </span>
              </div>

              {/* divider */}
              <div className="mt-5 mb-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* Items list with thumbnails */}
              <div className="space-y-2 mb-5 max-h-[280px] overflow-y-auto pr-1 scrollbar-hide">
                {items.map((it, idx) => {
                  const price = it.product?.price ?? 0;
                  const colorImgs = colorImageMap[colorKey(it.product_id, it.color)];
                  const pImgs = (it.product?.images ?? []) as string[];
                  const pColors = (it.product?.colors ?? []) as string[];
                  const cNorm = cleanVariantValue(it.color).toLowerCase();
                  const cIdx = cNorm ? pColors.findIndex((c) => String(c).trim().toLowerCase() === cNorm) : -1;
                  const thumb = resolveImage(colorImgs?.[0] || (cIdx >= 0 && pImgs[cIdx]) || pImgs[0]);

                  return (
                    <div
                      key={cartRenderKey(it)}
                      className="group/item relative flex items-center gap-3 p-2.5 rounded-2xl hover:bg-primary/[0.04] border border-transparent hover:border-primary/15 transition-all animate-fade-in"
                      style={{ animationDelay: `${idx * 70}ms`, animationFillMode: "both" }}
                    >
                      <div className="relative shrink-0">
                        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 opacity-0 group-hover/item:opacity-100 blur transition-opacity" />
                        <img
                          src={thumb}
                          alt={it.product?.name || ""}
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = resolveImage(); }}
                          className="relative w-12 h-12 rounded-xl object-cover bg-muted ring-1 ring-border/60 group-hover/item:ring-primary/40 transition-all"
                        />
                        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-md shadow-primary/30 ring-2 ring-card">
                          {it.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold leading-tight truncate group-hover/item:text-primary transition-colors">
                          {it.product?.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                          {it.size && <span className="font-semibold text-foreground/80">{it.size}</span>}
                          {it.color && (
                            <>
                              <span className="opacity-50">·</span>
                              <span
                                aria-hidden
                                className="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-black/10"
                                style={{ background: getColorCss(it.color) }}
                              />
                              <span className="font-semibold text-foreground/80 capitalize">{it.color}</span>
                            </>
                          )}
                          <span className="opacity-50">·</span>
                          <span>{formatINR(price)}</span>
                        </p>
                      </div>

                      <span className="font-display font-bold text-sm tabular-nums shrink-0">
                        {formatINR(price * it.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Subtotals */}
              <div className="relative rounded-2xl bg-background/40 backdrop-blur-sm border border-border/50 p-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold tabular-nums">{formatINR(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    Shipping {count >= 2 ? `(${count} items)` : "(1 item)"}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {shipping === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 text-emerald-600 border border-emerald-500/30 shadow-sm">
                        ✦ FREE
                      </span>
                    ) : (
                      formatINR(shipping)
                    )}
                  </span>
                </div>
                {shipping > 0 && subtotal < FREE_SHIPPING_THRESHOLD && (
                  <FreeDeliveryProgress subtotal={subtotal} className="mt-2" />
                )}
              </div>

              {/* Total */}
              <div className="mt-5 relative rounded-2xl p-4 bg-primary/5 border border-primary/20">
                <div className="relative flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Grand Total</p>
                    <p className="font-display text-xl font-bold leading-none mt-1">Total</p>
                  </div>
                  <span className="font-display text-2xl sm:text-3xl font-extrabold tabular-nums text-primary whitespace-nowrap shrink-0">
                    {formatINR(total)}
                  </span>
                </div>
              </div>

              <Button
                variant="pill"
                size="lg"
                className="group/cta relative w-full mt-5 overflow-hidden shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/50 transition-all duration-300 hover:-translate-y-0.5"
                onClick={() => {
                  clearBuyNowItem();
                  navigate("/checkout", { state: { checkoutMode: "cart" } });
                }}
              >
                <span className="absolute inset-0 -translate-x-full group-hover/cta:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-white/0 via-white/30 to-white/0" />
                <span className="relative inline-flex items-center gap-2 font-semibold">
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4 group-hover/cta:translate-x-1 transition-transform" />
                </span>
              </Button>
              <Button asChild variant="ghost" className="w-full mt-2 rounded-full text-muted-foreground hover:text-primary">
                <Link to="/shop">Continue shopping</Link>
              </Button>

              {/* Trust badges row */}
              <div className="mt-5 pt-4 border-t border-dashed border-border/60 grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-base">🔒</span>
                  <span className="text-[10px] font-semibold text-muted-foreground leading-tight">Secure<br/>Checkout</span>
                </div>
                <div className="flex flex-col items-center gap-1 border-x border-border/40">
                  <span className="text-base">↻</span>
                  <span className="text-[10px] font-semibold text-muted-foreground leading-tight">7-Day<br/>Returns</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-base">✦</span>
                  <span className="text-[10px] font-semibold text-muted-foreground leading-tight">Premium<br/>Quality</span>
                </div>
              </div>
            </div>
          </Card>

          </div>
        </div>
      </div>
    </Layout>
  );
};

type CartRowProps = {
  item: ReturnType<typeof useCart>["items"][number];
  colorImages?: string[];
  onUpdateQty: (id: string, qty: number) => Promise<void> | void;
  onRemove: (id: string) => Promise<void> | void;
};

const CartRow = ({ item, colorImages, onUpdateQty, onRemove }: CartRowProps) => {
  const [extra, setExtra] = useState<{ images?: string[]; stock?: number } | null>(null);
  const [variants, setVariants] = useState<{ size: string; color_name: string | null; stock_quantity: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!item.product_id) return;
    supabase
      .from("products")
      .select("images, stock")
      .eq("id", item.product_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setExtra(data as any);
      });
    supabase
      .from("product_variants")
      .select("size, color_name, stock_quantity")
      .eq("product_id", item.product_id)
      .then(({ data }) => {
        if (!cancelled && data) setVariants(data as any);
      });
    return () => { cancelled = true; };
  }, [item.product_id]);

  const productName = item.product?.name || "Product unavailable";
  const productImages = (extra?.images?.length ? extra.images : item.product?.images) ?? [];
  const productColors = (item.product?.colors ?? []) as string[];
  const itemColorNorm = cleanVariantValue(item.color).toLowerCase();
  const colorIdx = itemColorNorm
    ? productColors.findIndex((c) => String(c).trim().toLowerCase() === itemColorNorm)
    : -1;
  const gallery = (
    colorImages?.length
      ? colorImages
      : itemColorNorm && colorIdx >= 0 && productImages[colorIdx]
        ? [productImages[colorIdx]]
        : itemColorNorm && productImages[0]
          ? [productImages[0]]
          : productImages
  ).filter(Boolean).map((src) => resolveImage(src));

  const fallbackImage = gallery[0] || resolveImage();
  const [activeImage, setActiveImage] = useState<string>(fallbackImage);
  useEffect(() => {
    if (gallery.length && !gallery.includes(activeImage)) setActiveImage(gallery[0]);
  }, [gallery, activeImage]);
  const price = Number(item.product?.price ?? 0);
  const quantity = Math.max(1, Number(item.quantity) || 1);

  // Resolve max stock for the selected size+color variant.
  // Falls back to size-only variant, then product.stock.
  const maxStock = (() => {
    const itemSize = cleanVariantValue(item.size);
    const itemColor = cleanVariantValue(item.color);
    const combo = variants.find((v) => cleanVariantValue(v.size) === itemSize && cleanVariantValue(v.color_name) === itemColor);
    if (combo) return combo.stock_quantity;
    const sizeOnly = variants.find((v) => cleanVariantValue(v.size) === itemSize && !cleanVariantValue(v.color_name));
    if (sizeOnly) return sizeOnly.stock_quantity;
    const anySize = variants.find((v) => cleanVariantValue(v.size) === itemSize);
    if (anySize) return anySize.stock_quantity;
    return extra?.stock ?? item.product?.stock ?? quantity;
  })();
  const canIncrease = quantity < maxStock;


  return (
    <Card className="group relative overflow-hidden rounded-3xl p-5 border border-border/50 bg-gradient-to-br from-card via-card to-primary/[0.03] shadow-[0_4px_24px_-8px_hsl(var(--primary)/0.08)] hover:shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.25)] hover:border-primary/30 transition-all duration-500 flex gap-5">
      {/* shimmer accent */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-primary/0 via-primary/60 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-primary/[0.06] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className="shrink-0 flex flex-col gap-2">
        <Link to={`/product/${item.product_id}`} className="relative block">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-500" />
          <img
            src={activeImage}
            alt={productName}
            className="relative w-28 h-28 md:w-32 md:h-32 rounded-2xl object-cover bg-muted ring-1 ring-border/40 group-hover:ring-primary/40 transition-colors duration-500"
            onError={(event) => { event.currentTarget.src = resolveImage(); }}
          />
        </Link>
        {gallery.length > 1 && (
          <div className="flex gap-1.5 max-w-[128px] overflow-x-auto scrollbar-hide">
            {gallery.slice(0, 6).map((src, idx) => {
              const isActive = src === activeImage;
              return (
                <button
                  key={`${src}-${idx}`}
                  type="button"
                  onClick={() => setActiveImage(src)}
                  aria-label={`View image ${idx + 1}`}
                  className={`shrink-0 w-9 h-9 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                    isActive ? "border-primary scale-110 shadow-md shadow-primary/30" : "border-border/60 hover:border-primary/60 hover:scale-105"
                  }`}
                >
                  <img src={src} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }} className="w-full h-full object-cover" />
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="relative flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/product/${item.product_id}`} className="min-w-0">
            <h3 className="font-display font-semibold text-base md:text-lg leading-tight hover:text-primary transition-colors line-clamp-2">
              {productName}
            </h3>
          </Link>
          <button
            onClick={() => onRemove(item.id)}
            aria-label="Remove"
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {(item.size || item.color) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {item.size && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/5 border border-primary/20 text-foreground/80">
                <span className="text-muted-foreground">Size</span>
                <span className="font-bold text-primary">{item.size}</span>
              </span>
            )}
            {item.color && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/5 border border-primary/20 text-foreground/80">
                <span className="text-muted-foreground">Colour</span>
                <span
                  aria-hidden
                  className="inline-block w-3 h-3 rounded-full ring-1 ring-black/10 shadow-sm"
                  style={{ background: getColorCss(item.color) }}
                />
                <span className="font-bold text-primary capitalize">{item.color}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted/60 border border-border/50 text-muted-foreground">
              Unit {formatINR(price)}
            </span>
          </div>
        )}


        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center rounded-full border border-border/70 bg-background/50 backdrop-blur-sm shadow-sm">
            <button
              onClick={() => (quantity <= 1 ? onRemove(item.id) : onUpdateQty(item.id, quantity - 1))}
              className="w-9 h-9 flex items-center justify-center hover:bg-primary/10 hover:text-primary rounded-l-full transition-colors"
              aria-label="Decrease"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-9 text-center text-sm font-bold tabular-nums">{quantity}</span>
            <button
              onClick={() => {
                if (!canIncrease) {
                  toast.error(`Only ${maxStock} in stock for ${item.size}${item.color ? ` · ${item.color}` : ""}`);
                  return;
                }
                onUpdateQty(item.id, quantity + 1);
              }}
              disabled={!canIncrease}
              className="w-9 h-9 flex items-center justify-center hover:bg-primary/10 hover:text-primary rounded-r-full disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Increase"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="font-display font-bold text-lg md:text-xl tabular-nums bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            {formatINR(price * quantity)}
          </p>
        </div>
        {maxStock > 0 && maxStock <= 10 && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
            </span>
            Only {maxStock} left in stock
          </p>
        )}

      </div>
    </Card>
  );
};

export default Cart;
