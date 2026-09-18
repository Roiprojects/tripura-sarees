import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Heart, ChevronLeft, ChevronRight } from "lucide-react";
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
  image: string;
  href: string;
  stock?: number;
  /** Full product row, needed to add the product to the cart. */
  raw?: DBProduct;
};

const ProductCard = ({ product }: { product: Product }) => {
  const { productIds, toggle } = useWishlist();
  const { getAvailableStock } = useCart();
  const wished = productIds.has(product.id);
  const availableStock = typeof product.stock === "number"
    ? getAvailableStock(product.id, product.stock)
    : undefined;
  const outOfStock = availableStock === 0;

  return (
    <div className="new-arrival-card shrink-0 w-[240px] sm:w-[260px] md:w-[280px] snap-start">
      <Link to={product.href} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted/30 select-none">
          <img
            src={product.image}
            alt={product.name}
            loading="eager"
            decoding="async"
            draggable={false}
            className="w-full h-full object-cover"
          />

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
              e.preventDefault();
              e.stopPropagation();
              toggle({ id: product.id, name: product.name, price: product.price, images: [product.image] } as any);
            }}
            aria-label="Add to wishlist"
            className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-white/95 shadow-md flex items-center justify-center transition"
          >
            <Heart className={`w-4 h-4 ${wished ? "text-primary" : "text-foreground/60"}`} fill={wished ? "currentColor" : "none"} />
          </button>

          {/* add to cart */}
          {product.raw && (
            <div className="absolute bottom-3 right-3 z-30" onPointerDown={(e) => e.stopPropagation()}>
              <AddToCartButton product={product.raw} disabled={outOfStock} className="h-9 w-9 md:h-9 md:w-9" />
            </div>
          )}
        </div>
      </Link>

      <div className="pt-3 px-1">
        <h3 className="text-sm font-medium text-foreground/90 line-clamp-2 leading-snug min-h-[2.5rem]">
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

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
    const primaryImg = resolveImage(p.images?.[0]);
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      detail: productDetailLine(p),
      image: primaryImg,
      href: `/product/${p.id}`,
      stock: (p as any).stock,
      raw: p as DBProduct,
    };
  });

  const slide = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const cardEl = container.querySelector(".new-arrival-card");
    const step = cardEl ? cardEl.clientWidth + 16 : 296;

    if (direction === "left") {
      if (container.scrollLeft <= 15) {
        container.scrollTo({ left: container.scrollWidth, behavior: "smooth" });
      } else {
        container.scrollBy({ left: -step, behavior: "smooth" });
      }
    } else {
      if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 20) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        container.scrollBy({ left: step, behavior: "smooth" });
      }
    }
  };

  // Continuous gentle auto-sliding carousel
  useEffect(() => {
    if (isPaused || products.length <= 3) return;
    const interval = setInterval(() => {
      if (!scrollRef.current) return;
      const container = scrollRef.current;
      const cardEl = container.querySelector(".new-arrival-card");
      const step = cardEl ? cardEl.clientWidth + 16 : 296;

      if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 20) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        container.scrollBy({ left: step, behavior: "smooth" });
      }
    }, 3800);

    return () => clearInterval(interval);
  }, [isPaused, products.length]);

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
        <div className="flex items-center gap-3">
          {/* Slider controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => slide("left")}
              aria-label="Previous slide"
              className="w-9 h-9 rounded-full border border-border/80 bg-background/80 hover:bg-sky/15 hover:border-sky/60 hover:text-primary transition flex items-center justify-center shadow-sm text-foreground/80 active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => slide("right")}
              aria-label="Next slide"
              className="w-9 h-9 rounded-full border border-border/80 bg-background/80 hover:bg-sky/15 hover:border-sky/60 hover:text-primary transition flex items-center justify-center shadow-sm text-foreground/80 active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <Link
            to="/new"
            className="text-sm font-semibold text-primary underline underline-offset-4 decoration-sky hover:opacity-80 transition ml-2"
          >
            View All
          </Link>
        </div>
      </div>

      <div className="relative group/slider">
        {/* Left Floating Arrow */}
        <button
          onClick={() => slide("left")}
          aria-label="Previous products"
          className="hidden md:flex absolute -left-3 lg:-left-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-background/90 backdrop-blur-md border border-border/80 shadow-xl items-center justify-center text-foreground hover:bg-sky/20 hover:text-primary hover:border-sky transition active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Right Floating Arrow */}
        <button
          onClick={() => slide("right")}
          aria-label="Next products"
          className="hidden md:flex absolute -right-3 lg:-right-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-background/90 backdrop-blur-md border border-border/80 shadow-xl items-center justify-center text-foreground hover:bg-sky/20 hover:text-primary hover:border-sky transition active:scale-95"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          className="-mx-4 px-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
        >
          <div className="flex gap-4 md:gap-5 pb-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
