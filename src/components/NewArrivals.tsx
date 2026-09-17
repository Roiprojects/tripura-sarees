import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSectionProducts } from "@/hooks/useSectionProducts";
import { resolveImage } from "@/lib/resolveImage";
import { useWishlist } from "@/providers/WishlistProvider";
import { useCart } from "@/providers/cart-context";
import { productDetailLine } from "@/lib/sareeCatalog";
import { AddToCartButton } from "@/components/AddToCartButton";
import type { Product as DBProduct } from "@/lib/database.types";


type Product = {
  id: string;
  name: string;
  price: number;
  /** Short line under the price (occasion or "Free Size"). */
  detail: string;
  frames: string[];
  href: string;
  stock?: number;
  /** Full product row, needed to add the product to the cart. */
  raw?: DBProduct;
};



const ProductCard = ({ product }: { product: Product }) => {
  const [frame, setFrame] = useState(0);
  const [hover, setHover] = useState(false);
  const dragRef = useRef<{ startX: number; startFrame: number } | null>(null);
  const intervalRef = useRef<number | null>(null);
  const { productIds, toggle } = useWishlist();
  const { getAvailableStock } = useCart();
  const wished = productIds.has(product.id);
  const availableStock = typeof product.stock === "number"
    ? getAvailableStock(product.id, product.stock)
    : undefined;
  const outOfStock = availableStock === 0;

  // auto-rotate on hover
  useEffect(() => {
    if (!hover || dragRef.current) return;
    intervalRef.current = window.setInterval(() => {
      setFrame((f) => (f + 1) % product.frames.length);
    }, 700);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [hover, product.frames.length]);

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startFrame: frame };
    if (intervalRef.current) window.clearInterval(intervalRef.current);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const step = Math.round(dx / 30);
    const next =
      (dragRef.current.startFrame + step) % product.frames.length;
    setFrame(next < 0 ? next + product.frames.length : next);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  return (
    <div className="group shrink-0 w-[260px] md:w-[280px]">
      <Link to={product.href} className="block">
        <div
          className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted/30 select-none cursor-grab active:cursor-grabbing"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* preload all frames stacked, fade between */}
          {product.frames.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={product.name}
              loading="eager" decoding="async"
              draggable={false}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
                i === frame ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}

          {/* badge */}
          <span className="absolute top-3 left-3 z-10 inline-block px-2.5 py-1 rounded-md bg-sky text-sky-foreground text-[10px] font-bold tracking-wide shadow-sm">
            Just Arrived
          </span>

          {outOfStock && (
            <>
              <div className="absolute inset-0 z-10 bg-white/55 backdrop-blur-[1px]" />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-3 py-1.5 rounded-md bg-black/85 text-white text-[11px] font-bold tracking-wider uppercase shadow-lg">
                Out of Stock
              </span>
            </>
          )}

          <button
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation();
              toggle({ id: product.id, name: product.name, price: product.price, images: product.frames } as any);
            }}
            aria-label="Add to wishlist"
            className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-white/95 shadow-md flex items-center justify-center hover:scale-110 transition"
          >
            <Heart className={`w-4 h-4 ${wished ? "text-primary" : "text-foreground/60"}`} fill={wished ? "currentColor" : "none"} />
          </button>

          {/* add to cart — opens the size/colour picker and saves to the cart */}
          {product.raw && (
            <div className="absolute bottom-3 right-3 z-30" onPointerDown={(e) => e.stopPropagation()}>
              <AddToCartButton product={product.raw} disabled={outOfStock} className="h-9 w-9 md:h-9 md:w-9" />
            </div>
          )}

        </div>
      </Link>

      <div className="pt-3 px-1">
        <h3 className="text-sm text-foreground/85 line-clamp-2 leading-snug min-h-[2.5rem]">
          {product.name}
        </h3>
        <p className="text-sm font-bold text-foreground mt-1.5">
          ₹{product.price.toLocaleString("en-IN")}.00
        </p>
      </div>
    </div>
  );
};

export const NewArrivals = () => {
  const { data: dbProducts = [] } = useSectionProducts({ sectionKey: "new-arrivals", limit: 12 });

  // Fallback: if the admin hasn't tagged any products with the "new-arrivals"
  // section key, surface products flagged is_new OR the 12 most recently added.
  const { data: fallbackProducts = [] } = useQuery({
    queryKey: ["new-arrivals-fallback"],
    enabled: dbProducts.length === 0,
    queryFn: async () => {
      const { data: flagged } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .eq("is_new", true)
        .order("created_at", { ascending: false })
        .limit(12);
      if (flagged && flagged.length > 0) return flagged;
      const { data: recent } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(12);
      return recent ?? [];
    },
    staleTime: 60_000,
  });

  const sourceProducts = dbProducts.length > 0 ? dbProducts : fallbackProducts;
  const products: Product[] = sourceProducts.map((p) => {
    const imgs = (p.images && p.images.length > 0 ? p.images : [""]).map((s) => resolveImage(s));
    const frames = imgs.length >= 4 ? imgs.slice(0, 4) : [...imgs, ...Array(4 - imgs.length).fill(imgs[0])];
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      detail: productDetailLine(p),
      frames,
      href: `/product/${p.id}`,
      stock: (p as any).stock,
      raw: p as DBProduct,
    };
  });

  if (products.length === 0) return null;

  return (
    <section className="container py-12 md:py-16">
      <div className="flex items-end justify-between mb-6 md:mb-8">
        <div>
          <h2 className="font-display text-xl md:text-2xl font-bold tracking-wide uppercase relative inline-block">
            New Arrivals
            <span className="absolute -bottom-2 left-0 w-12 h-[3px] bg-sky rounded-full" />
          </h2>
        </div>
        <Link
          to="/new"
          className="text-sm font-semibold text-primary underline underline-offset-4 decoration-sky hover:opacity-80 transition"
        >
          View All
        </Link>
      </div>

      <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 md:gap-5 pb-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
};
