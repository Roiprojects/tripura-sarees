import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Heart, Star, Minus, Plus, ShoppingBag, ArrowLeft, Truck, Shield, RotateCcw, Ruler } from "lucide-react";
import { Layout } from "@/components/Layout";
import { SizeGuideDialog } from "@/components/SizeGuideDialog";
import { OCCASIONS } from "@/lib/sareeCatalog";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/database.types";
import { formatINR, FREE_SHIPPING_THRESHOLD } from "@/lib/format";
import { useCart } from "@/providers/cart-context";
import { useWishlist } from "@/providers/WishlistProvider";
import { toast } from "sonner";
import { trackRecentlyViewed } from "@/lib/recentlyViewed";
import { resolveImage } from "@/lib/resolveImage";
import { flyToCart } from "@/lib/flyToCart";
import { playMagicSound } from "@/lib/magicSound";
import { getColorCss } from "@/lib/colorUtils";
import { replaceBuyNowItem, type BuyNowCartItem } from "@/lib/buyNowCart";

type ProductX = Product & { compare_at_price?: number | null; review_count?: number; gender?: string | null; collection?: string | null };

const cleanVariantValue = (value: unknown) => String(value ?? "").trim().toLowerCase();
const variantKey = (size: unknown, color: unknown) => `${cleanVariantValue(size)}__${cleanVariantValue(color)}`;

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add, items: cartItems } = useCart();
  const { productIds, toggle } = useWishlist();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, category:categories(*)")
        .eq("id", id)
        .maybeSingle();
      return data as ProductX | null;
    },
  });

  const { data: variants = [] } = useQuery({
    queryKey: ["product-variants", product?.id],
    enabled: !!product?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("size, color_name, sku_code, stock_quantity, variant_price, discount_percent")
        .eq("product_id", product!.id)
        .order("sort_order");
      return (data ?? []) as {
        size: string;
        color_name: string | null;
        sku_code: string | null;
        stock_quantity: number;
        variant_price: number | null;
        discount_percent?: number | null;
      }[];
    },
  });
  // Per-size aggregated rows (legacy / color-less)
  const sizeOnlyVariants = variants.filter((v) => !cleanVariantValue(v.color_name));
  const comboVariants = variants.filter((v) => !!cleanVariantValue(v.color_name));
  const hasComboMatrix = comboVariants.length > 0;

  const variantBySize = new Map(sizeOnlyVariants.map((v) => [cleanVariantValue(v.size), v]));
  const comboMap = new Map(
    comboVariants.map((v) => [variantKey(v.size, v.color_name), v]),
  );

  // A size is shown when at least one combo (or legacy variant) for it has stock.
  const sizeInStock = (s: string, forColor?: string) => {
    if (hasComboMatrix) {
      if (forColor) {
        const v = comboMap.get(variantKey(s, forColor));
        return !!v && v.stock_quantity > 0;
      }
      // any color with this size in stock
      return comboVariants.some((v) => cleanVariantValue(v.size) === cleanVariantValue(s) && v.stock_quantity > 0);
    }
    if (sizeOnlyVariants.length === 0) return true; // no variant info → show all
    const v = variantBySize.get(cleanVariantValue(s));
    return !!v && v.stock_quantity > 0;
  };

  type ColorV = { color_name: string; hex_code: string | null; images: string[]; stock_quantity: number; sku_code: string | null };
  const { data: colorVariants = [] } = useQuery({
    queryKey: ["product-color-variants", product?.id],
    enabled: !!product?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_color_variants")
        .select("color_name, hex_code, images, stock_quantity, sku_code")
        .eq("product_id", product!.id)
        .order("sort_order");
      return (data ?? []) as ColorV[];
    },
  });
  const colorByName = new Map(colorVariants.map((c) => [cleanVariantValue(c.color_name), c]));
  const totalColorStock = colorVariants.reduce((sum, c) => sum + Number(c.stock_quantity ?? 0), 0);
  const hasPerColorStock = totalColorStock > 0;

  const { data: related = [] } = useQuery({
    queryKey: ["related", product?.category_id, product?.gender, product?.id],
    queryFn: async () => {
      if (!product?.category_id) return [];
      let q = supabase
        .from("products").select("*")
        .eq("status", "active")
        .eq("category_id", product.category_id)
        .neq("id", product.id);
      if ((product as any).gender) q = q.eq("gender", (product as any).gender);
      const { data } = await q.order("rating", { ascending: false }).limit(8);
      return (data as Product[]) ?? [];
    },
    enabled: !!product?.category_id,
  });

  const [activeImg, setActiveImg] = useState(0);
  const [size, setSize] = useState<string>("");
  const [color, setColor] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });
  const imgRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (product) trackRecentlyViewed(product);
  }, [product?.id]);

  // Most sarees come in a single "Free Size": pre-select it so shoppers
  // don't have to tap the only option before adding to the bag.
  useEffect(() => {
    if (product?.sizes?.length === 1) setSize(product.sizes[0]);
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clamp qty whenever the chosen combo / stock changes.
  // Must run on every render (before any early return) to keep hook order stable.
  const currentStock = (() => {
    if (!product) return 0;
    const cs = size;
    const cc = color;
    const combo = cs && cc ? comboMap.get(variantKey(cs, cc)) : undefined;
    const sizeOnly = cs ? variantBySize.get(cleanVariantValue(cs)) : undefined;
    const colorOnly = cc ? colorByName.get(cleanVariantValue(cc)) : undefined;
    const v = combo ?? sizeOnly;
    let raw = v?.stock_quantity
      ?? (hasPerColorStock ? colorOnly?.stock_quantity : undefined)
      ?? (hasComboMatrix || sizeOnlyVariants.length > 0 ? 0 : product.stock ?? 0);
    // If only size is picked but combo matrix exists, sum stock across all colors for that size.
    if (cs && !cc && hasComboMatrix && !combo) {
      raw = comboVariants
        .filter((cv) => cleanVariantValue(cv.size) === cleanVariantValue(cs))
        .reduce((sum, cv) => sum + (cv.stock_quantity ?? 0), 0);
    }
    const inCart = cartItems
      .filter((i) => i.product_id === product.id && variantKey(i.size, i.color) === variantKey(cs, cc))
      .reduce((s, i) => s + i.quantity, 0);
    return Math.max(0, raw - inCart);
  })();
  useEffect(() => {
    if (qty > currentStock) setQty(Math.max(1, currentStock));
    if (qty < 1) setQty(1);
  }, [currentStock]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset quantity to 1 whenever the user picks a different size or color
  useEffect(() => {
    setQty(1);
  }, [size, color]);

  // When color changes, jump the gallery back to the first image of that
  // color variant so the main image reflects the chosen color.
  useEffect(() => {
    setActiveImg(0);
  }, [color]);


  if (isLoading) {
    return <Layout><div className="container py-20 text-center text-muted-foreground">Loading...</div></Layout>;
  }
  if (!product) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-2xl font-semibold mb-2">Out of stock</p>
          <p className="text-muted-foreground">This product is currently unavailable.</p>
          <Button asChild variant="pill" className="mt-4"><Link to="/shop">Back to shop</Link></Button>
        </div>
      </Layout>
    );
  }

  const wished = productIds.has(product.id);
  const chosenSize = size;
  const chosenColor = color;
  const mrp = product.compare_at_price ?? 0;

  // Resolve the active variant: (size+color) combo wins, else size-only, else
  // any variant matching the selected size OR color so price updates immediately.
  const activeCombo = chosenSize && chosenColor
    ? comboMap.get(variantKey(chosenSize, chosenColor))
    : undefined;
  const activeSizeOnly = chosenSize ? variantBySize.get(cleanVariantValue(chosenSize)) : undefined;
  const partialMatch =
    !activeCombo && !activeSizeOnly
      ? variants.find(
          (v) =>
            (chosenSize && cleanVariantValue(v.size) === cleanVariantValue(chosenSize)) ||
            (chosenColor && cleanVariantValue(v.color_name) === cleanVariantValue(chosenColor)),
        )
      : undefined;
  const activeVariant = activeCombo ?? activeSizeOnly ?? partialMatch;
  // Price resolution: prefer any variant matching the current selection that has
  // an explicit price; only fall back to the base product price when nothing matches.
  const priceFromVariant = (v?: { variant_price: number | null } | null) =>
    v && Number(v.variant_price) > 0 ? Number(v.variant_price) : null;
  const matchedPricedVariant =
    (chosenSize || chosenColor)
      ? variants.find((v) => {
          if (!(Number(v.variant_price) > 0)) return false;
          const sizeOk = !chosenSize || cleanVariantValue(v.size) === cleanVariantValue(chosenSize);
          const colorOk = !chosenColor || cleanVariantValue(v.color_name) === cleanVariantValue(chosenColor);
          return sizeOk && colorOk;
        })
      : undefined;
  const firstVariantPrice = variants.find((v) => Number(v.variant_price) > 0)?.variant_price ?? null;
  const rawVariantPrice =
    priceFromVariant(activeCombo)
    ?? priceFromVariant(activeSizeOnly)
    ?? (matchedPricedVariant ? Number(matchedPricedVariant.variant_price) : null)
    ?? priceFromVariant(partialMatch)
    ?? (Number(product.price) > 0 ? Number(product.price) : null)
    ?? (firstVariantPrice ? Number(firstVariantPrice) : null)
    ?? 0;
  // Size-wise discount: applies when a size is chosen and its variant has discount_percent > 0
  const activeDiscountPct = Number(
    (activeCombo as any)?.discount_percent
    ?? (activeSizeOnly as any)?.discount_percent
    ?? 0,
  );
  const variantPrice = activeDiscountPct > 0
    ? Math.round(rawVariantPrice * (1 - activeDiscountPct / 100) * 100) / 100
    : rawVariantPrice;
  const stockVariant = activeCombo ?? activeSizeOnly;
  let variantStock =
    stockVariant?.stock_quantity ??
    (hasPerColorStock && chosenColor ? colorByName.get(cleanVariantValue(chosenColor))?.stock_quantity : undefined) ??
    (hasComboMatrix || sizeOnlyVariants.length > 0 ? 0 : product.stock ?? 0);
  // If only size is picked (no color) and combo matrix exists, sum across colors for that size.
  if (chosenSize && !chosenColor && hasComboMatrix && !activeCombo) {
    variantStock = comboVariants
      .filter((cv) => cleanVariantValue(cv.size) === cleanVariantValue(chosenSize))
      .reduce((sum, cv) => sum + (cv.stock_quantity ?? 0), 0);
  }
  // If nothing is selected yet, show total available stock so it doesn't read "Out of stock".
  if (!chosenSize && !chosenColor) {
    if (hasComboMatrix) {
      variantStock = comboVariants.reduce((sum, cv) => sum + (cv.stock_quantity ?? 0), 0);
    } else if (sizeOnlyVariants.length > 0) {
      variantStock = sizeOnlyVariants.reduce((sum, v) => sum + (v.stock_quantity ?? 0), 0);
    } else if (colorVariants.length > 0) {
      variantStock = colorVariants.reduce((sum, c) => sum + (c.stock_quantity ?? 0), 0);
    }
  }

  // MRP fallback: use raw variant price as MRP when only a size-discount is applied
  const effectiveMrp = mrp && mrp > variantPrice ? mrp : (activeDiscountPct > 0 ? rawVariantPrice : mrp);
  const hasDiscount = Boolean(effectiveMrp && effectiveMrp > variantPrice);
  const discountPct = hasDiscount ? Math.round(((effectiveMrp - variantPrice) / effectiveMrp) * 100) : 0;
  const inCartQty = cartItems
    .filter((i) => i.product_id === product.id && variantKey(i.size, i.color) === variantKey(chosenSize, chosenColor))
    .reduce((s, i) => s + i.quantity, 0);
  const stock = Math.max(0, variantStock - inCartQty);
  const outOfStock = stock <= 0;
  const maxedInCart = variantStock > 0 && stock === 0;
  const lowStock = stock > 0 && stock < 10;
  const requiresSize = product.sizes.length > 0;
  const requiresColor = hasComboMatrix || colorVariants.length > 0 || product.colors.length > 0;
  const optionsSelected = (!requiresSize || !!chosenSize) && (!requiresColor || !!chosenColor);




  const missingMsg = (() => {
    const needSize = requiresSize && !chosenSize;
    const needColor = requiresColor && !chosenColor;
    if (needSize && needColor) return "Please select the size and color";
    if (needSize) return "Please select the size";
    if (needColor) return "Please select the color";
    return "";
  })();
  const validate = () => {
    if (missingMsg) { toast.error(missingMsg); return false; }
    if (maxedInCart) { toast.error(`You already have the maximum available quantity (${variantStock}) in your cart`); return false; }
    if (outOfStock) { toast.error("This combination is out of stock"); return false; }
    return true;
  };
  // Cap requested qty to remaining stock; toast when we trim.
  const resolveAddQty = () => {
    const allowed = Math.min(qty, stock);
    if (qty > stock) {
      toast.warning(`Only ${stock} ${stock === 1 ? "item" : "items"} remaining in stock.`);
      setQty(allowed);
    }
    return allowed;
  };
  const handleAdd = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (!validate()) return;
    const addQty = resolveAddQty();
    if (addQty <= 0) return;
    const src = (e?.currentTarget as HTMLElement) || addBtnRef.current;
    try { playMagicSound(); } catch {}
    flyToCart(src, resolveImage(product.images[activeImg] || product.images[0]));
    await add(product, chosenSize, chosenColor, addQty);
  };
  const handleBuyNow = async (_e?: React.MouseEvent<HTMLButtonElement>) => {
    if (!validate()) return;
    const addQty = resolveAddQty();
    if (addQty <= 0) return;
    // Buy Now is isolated from the normal cart. Replace the temporary Buy Now
    // item every time so Checkout can only show the latest selected product.
    try { playMagicSound(); } catch {}
    const primary = resolveImage(product.images?.[activeImg] || product.images?.[0]);
    const buyNow: BuyNowCartItem = {
      id: `buynow-${product.id}-${Date.now()}`,
      product_id: product.id,
      quantity: addQty,
      size: chosenSize,
      color: chosenColor,
      product: {
        ...product,
        price: Number(variantPrice) || Number(product.price) || 0,
        images: [primary, ...(product.images ?? []).slice(1)],
      },
    };
    replaceBuyNowItem(buyNow);
    navigate("/checkout", { state: { buyNow, checkoutMode: "buy_now" }, replace: false });
  };


  const onMove = (e: React.MouseEvent) => {
    if (!imgRef.current) return;
    const r = imgRef.current.getBoundingClientRect();
    setZoom({ active: true, x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!imgRef.current || e.touches.length === 0) return;
    const t = e.touches[0];
    const r = imgRef.current.getBoundingClientRect();
    setZoom({
      active: true,
      x: Math.max(0, Math.min(100, ((t.clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((t.clientY - r.top) / r.height) * 100)),
    });
  };

  const activeColorVariant = chosenColor ? colorByName.get(cleanVariantValue(chosenColor)) : undefined;
  // Build a per-color gallery fallback: if the chosen color has no dedicated
  // images, pick the product image at the same index as the color swatch so
  // each color still shows a distinct image.
  const swatchNames: string[] = colorVariants.length > 0
    ? colorVariants.map((c) => c.color_name)
    : (product.colors ?? []);
  const colorIndex = chosenColor
    ? swatchNames.findIndex((n) => cleanVariantValue(n) === cleanVariantValue(chosenColor))
    : -1;
  const galleryImages =
    activeColorVariant && activeColorVariant.images && activeColorVariant.images.length > 0
      ? activeColorVariant.images
      : chosenColor && colorIndex >= 0 && product.images[colorIndex]
        ? [product.images[colorIndex]]
        : chosenColor && colorIndex >= 0
          ? [product.images[0]].filter(Boolean)
          : product.images;
  const mainImg = resolveImage(galleryImages[activeImg] || galleryImages[0]);

  return (
    <Layout>
      <div className="container py-6 md:py-10">
        {(() => {
          const coll = String((product as any).collection ?? "").toLowerCase();
          const occasion = OCCASIONS.find((o) => coll.includes(o.keyword));
          const collHref = occasion ? `/occasion/${occasion.slug}` : coll ? `/shop?collection=${encodeURIComponent(coll)}` : null;
          return (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {/* Back button is rendered globally by <Layout/> via <BackButton/>.
                  Keeping a second one here caused duplicate back buttons. */}
              <Button asChild variant="ghost" size="sm" className="rounded-full">
                <Link to="/shop">All Sarees</Link>
              </Button>
              {product.category?.slug && (
                <Button asChild variant="ghost" size="sm" className="rounded-full">
                  <Link to={`/category/${product.category.slug}`} className="capitalize">{product.category.name}</Link>
                </Button>
              )}
              {collHref && (
                <Button asChild variant="ghost" size="sm" className="rounded-full">
                  <Link to={collHref} className="capitalize">{coll}</Link>
                </Button>
              )}
            </div>
          );
        })()}

        <div className="grid md:grid-cols-2 gap-8 lg:gap-14">
          <div>
            <Card
              ref={imgRef as any}
              onClick={(e) => {
                if (zoom.active) {
                  setZoom((z) => ({ ...z, active: false }));
                } else {
                  onMove(e as any);
                  setZoom((z) => ({ ...z, active: true }));
                }
              }}
              onMouseMove={(e) => { if (zoom.active) onMove(e as any); }}
              onMouseLeave={() => setZoom((z) => ({ ...z, active: false }))}
              className={`relative rounded-3xl overflow-hidden bg-muted aspect-[3/4] shadow-card border-border/60 select-none ${zoom.active ? "cursor-zoom-out" : "cursor-zoom-in"}`}
            >
              <img src={mainImg} alt={product.name}
                className="w-full h-full object-contain transition-transform duration-200"
                style={zoom.active ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
              />

              {hasDiscount && (
                <Badge className="absolute top-4 left-4 rounded-full bg-highlight text-foreground">{discountPct}% OFF</Badge>
              )}
            </Card>
            {galleryImages.length > 1 && (
              <div className="mt-3 md:mt-4 grid grid-cols-5 sm:grid-cols-6 md:flex md:flex-wrap gap-2 md:gap-3">
                {galleryImages.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`aspect-square w-full md:w-20 md:h-20 rounded-lg md:rounded-xl overflow-hidden border-2 transition-all ${
                      activeImg === i ? "border-primary ring-2 ring-primary/20" : "border-border/60 hover:border-border"
                    }`}
                  >
                    <img src={resolveImage(src)} alt="" loading="lazy" className="w-full h-full object-contain bg-muted" />
                  </button>
                ))}
              </div>
            )}

          </div>

          <div>
            {product.category?.name && (
              <p className="text-sm text-muted-foreground uppercase tracking-wider">{product.category.name}</p>
            )}
            <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">{product.name}</h1>
            {(product.review_count ?? 0) > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map((n) => (
                    <Star key={n} className={`w-4 h-4 ${n <= Math.round(product.rating) ? "text-highlight" : "text-muted"}`} fill="currentColor" />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {product.rating.toFixed(1)} · {product.review_count} {product.review_count === 1 ? "review" : "reviews"}
                </span>
              </div>
            )}

            <div className="flex items-baseline gap-3 mt-4 flex-wrap">
              <p className="font-display text-3xl font-bold text-primary">{formatINR(variantPrice)}</p>
              {hasDiscount && (
                <>
                  <p className="text-lg text-muted-foreground line-through">{formatINR(effectiveMrp)}</p>
                  <Badge className="rounded-full bg-highlight text-foreground">{discountPct}% OFF</Badge>
                </>
              )}
              {activeVariant && (
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {chosenColor} · {chosenSize}
                </span>
              )}
            </div>
            {(() => {
              const skuId = (product as any).sku_id ?? (product as any).sku ?? null;
              const designNum = (product as any).design_number ?? null;
              const brand = (product as any).brand ?? null;
              const variantSku = activeVariant?.sku_code
                || (chosenColor ? colorByName.get(cleanVariantValue(chosenColor))?.sku_code : null)
                || null;
              if (!skuId && !designNum && !brand && !variantSku) return null;
              return (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {skuId && (
                    <span><span className="text-muted-foreground">SKU ID:</span> <span className="font-mono font-semibold text-foreground">{skuId}</span></span>
                  )}
                  {designNum && (
                    <span><span className="text-muted-foreground">Design #:</span> <span className="font-mono font-semibold text-foreground">{designNum}</span></span>
                  )}
                  {variantSku && variantSku !== skuId && (
                    <span><span className="text-muted-foreground">Variant SKU:</span> <span className="font-mono font-semibold text-foreground">{variantSku}</span></span>
                  )}
                  {brand && (
                    <span><span className="text-muted-foreground">Brand:</span> <span className="font-semibold text-foreground">{brand}</span></span>
                  )}
                </div>
              );
            })()}
            {(product as any).preorder_status && (product as any).preorder_status !== "in_stock" && (
              <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                (product as any).preorder_status === "preorder"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : (product as any).preorder_status === "coming_soon"
                    ? "bg-sky-50 border-sky-200 text-sky-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
              }`}>
                <p className="font-semibold">
                  {(product as any).preorder_status === "preorder" && "Preorder available"}
                  {(product as any).preorder_status === "coming_soon" && "Coming soon"}
                  {(product as any).preorder_status === "out_of_stock" && "Out of stock"}
                </p>
                {(product as any).preorder_available_date && (() => {
                  const d = new Date((product as any).preorder_available_date);
                  const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const dateLabel = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                  return (
                    <p className="text-xs mt-0.5">
                      Expected delivery: <span className="font-semibold">{dateLabel}</span>
                      {diff > 0 && <span> · in ~{diff} {diff === 1 ? "day" : "days"}</span>}
                    </p>
                  );
                })()}
                {(product as any).preorder_message && (
                  <p className="text-xs mt-0.5">{(product as any).preorder_message}</p>
                )}
              </div>
            )}
            {hasDiscount && (
              <p className="text-xs text-muted-foreground mt-1">Inclusive of all taxes</p>
            )}

            <p className="text-foreground/70 mt-4 leading-relaxed">{product.description}</p>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">
                  Size{chosenSize && <span className="text-muted-foreground font-normal"> · {chosenSize}</span>}
                </p>
                {!product.sizes.every((s) => /free/i.test(s)) && (
                <SizeGuideDialog
                  gender={String((product as any).gender ?? "").toLowerCase() as any}
                  categorySlug={String((product as any).category?.slug ?? "")}
                  currentSize={chosenSize}
                  sizeGuideId={(product as any).size_guide_id ?? null}
                  trigger={
                    <button type="button" className="text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors inline-flex items-center gap-1">
                      <Ruler className="h-3 w-3" />Blouse size guide
                    </button>
                  }
                />
                )}
              </div>
              {product.sizes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No sizes available</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => {
                    // Combo matrix wins: use stock for (size + currently-selected color).
                    // When no color is selected, sum stock across all colors for this size.
                    const combo = hasComboMatrix && chosenColor
                      ? comboMap.get(variantKey(s, chosenColor))
                      : undefined;
                    const sizeOnly = variantBySize.get(cleanVariantValue(s));
                    const v = combo ?? sizeOnly;
                    const sStock = v?.stock_quantity ?? (
                      hasComboMatrix
                        ? comboVariants
                            .filter((cv) => cleanVariantValue(cv.size) === cleanVariantValue(s))
                            .reduce((sum, cv) => sum + (cv.stock_quantity ?? 0), 0)
                        : (sizeOnlyVariants.length === 0 ? (product.stock ?? 0) : 0)
                    );
                    const disabled = sStock <= 0;
                    const low = sStock > 0 && sStock <= 3;
                    return (
                      <button
                        key={s}
                        onClick={() => !disabled && setSize(chosenSize === s ? "" : s)}
                        disabled={disabled}
                        aria-pressed={chosenSize === s}
                        title={disabled ? "Out of stock for this color" : undefined}
                        className={`relative min-w-[3rem] px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all ${
                          disabled
                            ? "bg-muted/40 text-muted-foreground border-border line-through cursor-not-allowed opacity-60"
                            : chosenSize === s
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background border-border hover:border-primary hover:bg-primary/5"
                        }`}
                      >
                        {s}
                        {low && !disabled && (
                          <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                            {sStock}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {(() => {
              // Combo matrix takes precedence: a color is "in stock" when ANY of its
              // size combos has stock > 0. Otherwise fall back to per-color row stock,
              // or legacy product.colors[].
              const colorHasStock = (name: string) => {
                if (hasComboMatrix) {
                  return comboVariants.some(
                    (v) => cleanVariantValue(v.color_name) === cleanVariantValue(name) && v.stock_quantity > 0,
                  );
                }
                const cv = colorVariants.find((c) => cleanVariantValue(c.color_name) === cleanVariantValue(name));
                if (cv && hasPerColorStock) return cv.stock_quantity > 0;
                const availableFallbackStock = sizeOnlyVariants.length > 0
                  ? sizeOnlyVariants.reduce((sum, v) => sum + Number(v.stock_quantity ?? 0), 0)
                  : Number(product.stock ?? 0);
                return availableFallbackStock > 0;
              };
              const swatches = colorVariants.length > 0
                ? colorVariants.map((c) => ({
                    name: c.color_name,
                    hex: getColorCss(c.color_name, c.hex_code),
                    inStock: colorHasStock(c.color_name),
                  }))
                : product.colors.map((c) => ({
                    name: c,
                    hex: getColorCss(c),
                    inStock: colorHasStock(c),
                  }));
              if (swatches.length === 0) return null;
              return (
                <div className="mt-6">
                  <p className="text-sm font-semibold mb-2">
                    Color: <span className="text-muted-foreground font-normal">{chosenColor}</span>
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {swatches.map((s) => {
                      const selected = chosenColor === s.name;
                      const disabled = !s.inStock;
                      return (
                        <button
                          key={s.name}
                          onClick={() => {
                            if (disabled) return;
                            setColor(chosenColor === s.name ? "" : s.name);
                            setActiveImg(0);
                          }}
                          disabled={disabled}
                          aria-label={s.name}
                          aria-pressed={selected}
                          title={disabled ? `${s.name} (out of stock)` : s.name}
                          className={`relative w-11 h-11 rounded-full transition-all duration-200 ring-offset-2 ring-offset-background ${
                            disabled
                              ? "opacity-40 cursor-not-allowed ring-1 ring-border"
                              : "hover:scale-110 " +
                                (selected
                                  ? "ring-2 ring-primary scale-110 shadow-md"
                                  : "ring-1 ring-border hover:ring-foreground/40")
                          }`}
                          style={{ background: s.hex }}
                        >
                          {selected && !disabled && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="w-4 h-4 rounded-full bg-white/95 flex items-center justify-center shadow">
                                <svg viewBox="0 0 20 20" fill="none" className="w-3 h-3 text-primary">
                                  <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>
                            </span>
                          )}
                          {disabled && (
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="block w-[140%] h-0.5 bg-red-500/70 -rotate-45" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <p className="text-sm font-semibold">Qty</p>
              <div className="flex items-center rounded-full border-2 border-border">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={!optionsSelected || qty <= 1 || outOfStock}
                  className="w-10 h-10 flex items-center justify-center hover:bg-muted rounded-l-full disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Decrease"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-semibold" aria-live="polite">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(stock, qty + 1))}
                  disabled={!optionsSelected || outOfStock || qty >= stock}
                  className="w-10 h-10 flex items-center justify-center hover:bg-muted rounded-r-full disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Increase"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {!optionsSelected ? (
                <Badge variant="secondary" className="rounded-full">Select options</Badge>
              ) : maxedInCart ? (
                <Badge variant="destructive" className="rounded-full">Max quantity in cart</Badge>
              ) : outOfStock ? (
                <Badge variant="destructive" className="rounded-full">Out of stock</Badge>
              ) : stock === 1 ? (
                <Badge className="rounded-full bg-red-500 text-white">Only 1 left!</Badge>
              ) : lowStock ? (
                <Badge className="rounded-full bg-highlight text-foreground">Only {stock} left!</Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full">In stock</Badge>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span
                title={missingMsg || undefined}
                onMouseEnter={() => { if (missingMsg) toast.error(missingMsg, { id: "opts-missing" }); }}
              >
                <Button ref={addBtnRef} variant="pill" size="lg" onClick={handleAdd} disabled={outOfStock}>
                  <ShoppingBag className="w-4 h-4" /> Add to Cart
                </Button>
              </span>
              <span
                title={missingMsg || undefined}
                onMouseEnter={() => { if (missingMsg) toast.error(missingMsg, { id: "opts-missing" }); }}
              >
                <Button
                  size="lg"
                  onClick={handleBuyNow}
                  disabled={outOfStock}
                  className="rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-white shadow-md hover:shadow-lg hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                >
                  Buy Now
                </Button>
              </span>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => toggle(product)} aria-label="Wishlist">
                <Heart className={`w-5 h-5 ${wished ? "text-primary" : ""}`} fill={wished ? "currentColor" : "none"} />
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3 text-center">
              <div className="rounded-2xl border border-border/60 p-2 sm:p-3">
                <Truck className="w-5 h-5 mx-auto text-primary" />
                <p className="text-[11px] sm:text-xs mt-1 font-semibold leading-tight">Free shipping</p>
                <p className="text-[10px] text-muted-foreground">on ₹{FREE_SHIPPING_THRESHOLD}+</p>
              </div>
              <div className="rounded-2xl border border-border/60 p-2 sm:p-3">
                <RotateCcw className="w-5 h-5 mx-auto text-primary" />
                <p className="text-[11px] sm:text-xs mt-1 font-semibold leading-tight">7-day returns</p>
                <p className="text-[10px] text-muted-foreground">easy &amp; free</p>
              </div>
              <div className="rounded-2xl border border-border/60 p-2 sm:p-3">
                <Shield className="w-5 h-5 mx-auto text-primary" />
                <p className="text-[11px] sm:text-xs mt-1 font-semibold leading-tight">Secure pay</p>
                <p className="text-[10px] text-muted-foreground leading-tight">UPI · Card · COD</p>
              </div>
            </div>

            {(() => {
              const p: any = product;
              const rawSpecs = Array.isArray(p.specifications) ? p.specifications : [];
              const specs: { label: string; value: string }[] = rawSpecs
                .map((s: any) =>
                  s && typeof s === "object"
                    ? { label: String(s.label ?? s.key ?? "").trim(), value: String(s.value ?? "").trim() }
                    : null,
                )
                .filter((s: any) => s && s.label && s.value);

              // Auto-fill helpful specs from existing product fields if admin hasn't added any
              if (specs.length === 0) {
                if (Array.isArray(p.colors) && p.colors.length) specs.push({ label: "Color", value: p.colors.join(", ") });
                if (Array.isArray(p.sizes) && p.sizes.length) specs.push({ label: "Available Sizes", value: p.sizes.join(", ") });
                if (p.collection) specs.push({ label: "Occasion", value: p.collection });
                if (p.category?.name) specs.push({ label: "Category", value: p.category.name });
              }

              const care: string[] = Array.isArray(p.care_instructions) && p.care_instructions.length
                ? p.care_instructions.filter(Boolean)
                : ["Dry clean only for silk and zari sarees", "Store folded in a soft cotton or muslin cloth, away from direct sunlight", "Iron on low heat on the reverse side"];

              const origin: string = p.country_of_origin?.trim() || "India";

              return (
                <div className="mt-10 space-y-8">
                  <section>
                    <h3 className="font-display text-xl font-bold text-foreground">Specification</h3>
                    <ul className="mt-3 space-y-2 text-sm text-foreground/80 leading-relaxed pl-5 list-disc marker:text-primary">
                      {specs.map((s, i) => (
                        <li key={i}>
                          <span className="font-semibold text-foreground">{s.label}:</span>{" "}
                          <span>{s.value}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-display text-xl font-bold text-foreground">Care Instruction</h3>
                    <ul className="mt-3 space-y-2 text-sm text-foreground/80 leading-relaxed pl-5 list-disc marker:text-primary">
                      {care.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <p className="text-sm text-foreground/80">
                      <span className="font-semibold text-foreground">Country of Origin:</span> {origin}
                    </p>
                  </section>

                  <section className="rounded-2xl border border-border/60 bg-muted/40 p-4 space-y-2">
                    {p.disclaimer?.trim() ? (
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                        <span className="font-semibold text-foreground">Disclaimer:</span> {p.disclaimer.trim()}
                      </p>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-semibold text-foreground">Disclaimer:</span> Slight color variation may occur due to lighting during photography or your screen setting.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-semibold text-foreground">Note:</span> Handwoven sarees may show slight irregularities in the weave — a mark of genuine handloom, not a defect. Product images are for reference only.
                        </p>
                      </>
                    )}
                  </section>

                </div>
              );
            })()}

          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-12 md:mt-16 -mx-4 md:mx-0 bg-muted/30 md:bg-transparent rounded-none md:rounded-3xl py-5 md:py-0">
            <div className="flex items-center justify-between px-4 md:px-0 mb-3 md:mb-6">
              <h2 className="font-display text-lg md:text-2xl lg:text-3xl font-bold">You may also love ✨</h2>
              <Link to="/shop" className="text-xs md:text-sm font-semibold text-primary uppercase tracking-wide">View All</Link>
            </div>

            {/* Mobile: Flipkart-style horizontal scroll */}
            <div className="md:hidden flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-none">
              {related.map((p) => {
                const pMrp = (p as any).compare_at_price ?? 0;
                const pDisc = pMrp && pMrp > p.price ? Math.round(((pMrp - p.price) / pMrp) * 100) : 0;
                return (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    className="shrink-0 snap-start w-[42vw] max-w-[170px] bg-background rounded-xl overflow-hidden border border-border/60 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="aspect-[3/4] bg-muted overflow-hidden">
                      <img
                        src={resolveImage(p.images?.[0])}
                        alt={p.name}
                        loading="lazy"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-[12px] font-semibold line-clamp-2 leading-tight min-h-[2.2em]">{p.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-white bg-green-600 px-1.5 py-0.5 rounded">
                          {p.rating.toFixed(1)} <Star className="w-2.5 h-2.5" fill="currentColor" />
                        </span>
                        <span className="text-[10px] text-muted-foreground">({(p as any).review_count ?? 0})</span>
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                        <span className="text-sm font-bold">{formatINR(p.price)}</span>
                        {pDisc > 0 && (
                          <>
                            <span className="text-[10px] text-muted-foreground line-through">{formatINR(pMrp)}</span>
                            <span className="text-[10px] font-bold text-green-600">{pDisc}% off</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop: keep card grid */}
            <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
};

export default ProductDetail;
