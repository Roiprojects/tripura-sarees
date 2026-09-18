import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/database.types";
import { formatINR } from "@/lib/format";
import { useWishlist } from "@/providers/WishlistProvider";
import { AddToCartButton } from "@/components/AddToCartButton";
import { trackRecentlyViewed } from "@/lib/recentlyViewed";
import { resolveImage } from "@/lib/resolveImage";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { getColorCss } from "@/lib/colorUtils";

type P = Product & { compare_at_price?: number | null; is_new?: boolean };

import { useCart } from "@/providers/cart-context";

export const ProductCard = ({ product, selectedColor }: { product: P; selectedColor?: string }) => {
  const { getAvailableStock } = useCart();
  const { productIds, toggle } = useWishlist();
  const wished = productIds.has(product.id);
  const { data: allColorVariants = [] } = useQuery({
    queryKey: ["product-card-colors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_color_variants")
        .select("product_id, color_name, hex_code, images")
        .order("sort_order");
      return (data ?? []) as { product_id: string; color_name: string; hex_code: string | null; images: string[] | null }[];
    },
  });
  const { data: allVariantPrices = [] } = useQuery({
    queryKey: ["product-card-variant-prices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("product_id, variant_price")
        .gt("variant_price", 0);
      return (data ?? []) as { product_id: string; variant_price: number }[];
    },
  });
  const { data: allVariantStocks = [] } = useQuery({
    queryKey: ["product-card-variant-stocks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("product_id, stock_quantity");
      return (data ?? []) as { product_id: string; stock_quantity: number }[];
    },
  });
  const colorVariants = allColorVariants.filter((c) => c.product_id === product.id);
  const norm = (s: string) => s.trim().toLowerCase();
  const matchedVariant = selectedColor
    ? colorVariants.find((c) => norm(c.color_name) === norm(selectedColor))
    : undefined;
  const productColors = product.colors ?? [];
  const colorIdx = selectedColor
    ? productColors.findIndex((c) => norm(c) === norm(selectedColor))
    : -1;
  const img = resolveImage(
    (matchedVariant?.images && matchedVariant.images[0]) ||
      (colorIdx >= 0 && product.images?.[colorIdx]) ||
      product.images?.[0],
  );
  const basePrice = Number(product.price) > 0
    ? Number(product.price)
    : (() => {
        const prices = allVariantPrices
          .filter((v) => v.product_id === product.id)
          .map((v) => Number(v.variant_price))
          .filter((n) => n > 0);
        return prices.length ? Math.min(...prices) : 0;
      })();
  const mrp = Number(product.compare_at_price ?? 0) || 0;
  const hasDiscount = mrp > 0 && mrp > basePrice;
  const discountPct = hasDiscount ? Math.round(((mrp - basePrice) / mrp) * 100) : 0;
  // Prefer the sum of variant stocks (when variants exist) over product.stock,
  // which can be stale/null and let out-of-stock items appear addable.
  const variantStockRows = allVariantStocks.filter((v) => v.product_id === product.id);
  const totalStock = variantStockRows.length > 0
    ? variantStockRows.reduce((s, v) => s + Number(v.stock_quantity ?? 0), 0)
    : Number(product.stock ?? 0);
  const availableStock = getAvailableStock(product.id, totalStock);
  const outOfStock = availableStock <= 0;
  const swatches = colorVariants.length > 0
    ? colorVariants.map((c) => ({ name: c.color_name, hex: c.hex_code }))
    : (product.colors ?? []).map((name) => ({ name, hex: null }));

  return (
    <Card className="group overflow-hidden rounded-2xl md:rounded-3xl border border-border/70 hover:border-sky/80 shadow-card hover:shadow-2xl transition-all duration-500 bg-card hover:-translate-y-1">
      <Link to={`/product/${product.id}`} onClick={() => trackRecentlyViewed(product)} className="block relative aspect-[3/4] bg-muted overflow-hidden">
        <img
          src={img}
          alt={product.name}
          width={400}
          height={400}
          loading="eager" decoding="async"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
          className={`w-full h-full object-contain bg-muted ${outOfStock ? "opacity-60 grayscale" : ""}`}
        />
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/30 backdrop-blur-[2px]">
            <span className="px-4 py-1.5 rounded-full bg-black/85 text-white text-xs sm:text-sm font-bold tracking-widest shadow-xl ring-1 ring-white/20">
              OUT OF STOCK
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5 pointer-events-none z-10">
          <span className="silk-badge text-[9px] px-2 py-0.5 shadow-sm bg-white/95 text-primary border-sky/60 font-semibold tracking-wider">
            ✨ Silk Mark
          </span>
          {product.is_new && !outOfStock && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 backdrop-blur-md text-emerald-100 text-[10px] font-bold tracking-wider px-2.5 py-0.5 shadow-sm ring-1 ring-emerald-400/40">
              NEW LAUNCH
            </span>
          )}
          {hasDiscount && discountPct >= 1 && !outOfStock && (
            <span className="inline-flex items-center rounded-full bg-sky text-sky-foreground text-[10px] font-extrabold tracking-wider px-2.5 py-0.5 shadow-sm ring-1 ring-sky/30">
              SAVE {discountPct}%
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            toggle(product);
          }}
          aria-label="Add to wishlist"
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-sky hover:text-sky-foreground hover:scale-110 active:scale-95 transition-all z-10"
        >
          <Heart
            className={`w-4 h-4 ${wished ? "text-primary" : "text-foreground/70"}`}
            fill={wished ? "currentColor" : "none"}
          />
        </button>
      </Link>
      <div className="p-4 md:p-5">
        <Link to={`/product/${product.id}`} onClick={() => trackRecentlyViewed(product)}>
          <h3 className="font-display font-semibold text-foreground line-clamp-1 hover:text-primary transition-colors text-base">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="flex items-center text-amber-500">
            <Star className="w-3.5 h-3.5 fill-current" />
          </div>
          <span className="text-xs font-semibold text-foreground/80">{product.rating.toFixed(1)}</span>
          <span className="text-[11px] text-muted-foreground">· Handcrafted</span>
        </div>
        {swatches.length > 0 && (
          <div className="mt-2.5 flex items-center gap-1.5" aria-label="Available colors">
            {swatches.slice(0, 5).map((c) => (
              <span
                key={c.name}
                title={c.name}
                className="h-4 w-4 rounded-full border border-border shadow-sm ring-1 ring-black/5"
                style={{ background: getColorCss(c.name, c.hex) }}
              />
            ))}
            {swatches.length > 5 && (
              <span className="text-[10px] font-semibold text-muted-foreground">+{swatches.length - 5}</span>
            )}
          </div>
        )}
        <div className="mt-3.5 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
          <div className="flex flex-col leading-tight">
            <span className="font-display font-bold text-lg md:text-xl text-primary">{formatINR(basePrice)}</span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through mt-0.5">{formatINR(mrp)}</span>
            )}
          </div>
          <AddToCartButton product={product} disabled={outOfStock} size="sm" />
        </div>
      </div>
    </Card>
  );
};
