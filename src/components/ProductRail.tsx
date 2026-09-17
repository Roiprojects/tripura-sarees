import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Flame, TrendingUp, Heart } from "lucide-react";
import { useSectionProducts } from "@/hooks/useSectionProducts";
import { resolveImage } from "@/lib/resolveImage";
import type { Product as DBProduct } from "@/lib/database.types";
import { useCart } from "@/providers/cart-context";
import { useWishlist } from "@/providers/WishlistProvider";
import { productDetailLine } from "@/lib/sareeCatalog";
import { AddToCartButton } from "@/components/AddToCartButton";

type Card = {
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

const RailCard = ({
  product,
  badgeText,
  badgeClass,
  BadgeIcon,
}: {
  product: Card;
  badgeText: string;
  badgeClass: string;
  BadgeIcon: React.ComponentType<{ className?: string }>;
}) => {
  const [frame, setFrame] = useState(0);
  const [hover, setHover] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hover) return;
    intervalRef.current = window.setInterval(
      () => setFrame((f) => (f + 1) % product.frames.length),
      700,
    );
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [hover, product.frames.length]);

  const { getAvailableStock } = useCart();
  const { productIds, toggle } = useWishlist();
  const wished = productIds.has(product.id);
  const availableStock = typeof product.stock === "number"
    ? getAvailableStock(product.id, product.stock)
    : undefined;
  const lowStock = typeof availableStock === "number" && availableStock > 0 && availableStock <= 5;
  const outOfStock = availableStock === 0;

  return (
    <div className="group shrink-0 w-[220px] sm:w-[240px] md:w-[260px]">
      <Link to={product.href} className="block">
        <div
          className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted/30 select-none"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {product.frames.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={product.name}
              loading="lazy"
              decoding="async"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                i === frame ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}

          <span className={`absolute top-3 left-3 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-white text-[10px] font-bold tracking-wide shadow-md ${badgeClass}`}>
            <BadgeIcon className="w-3 h-3" />
            {badgeText}
          </span>

          <button
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation();
              toggle({ id: product.id, name: product.name, price: product.price, images: product.frames } as any);
            }}
            aria-label="Add to wishlist"
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 shadow-md flex items-center justify-center hover:scale-110 transition"
          >
            <Heart className={`w-4 h-4 ${wished ? "text-primary" : "text-foreground/60"}`} fill={wished ? "currentColor" : "none"} />
          </button>

          {lowStock && (
            <span className="absolute top-14 right-3 z-10 inline-block px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold animate-pulse">
              Only {availableStock} left
            </span>
          )}

          {outOfStock && (
            <>
              <div className="absolute inset-0 z-10 bg-white/55 backdrop-blur-[1px]" />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-3 py-1.5 rounded-md bg-black/85 text-white text-[11px] font-bold tracking-wider uppercase shadow-lg">
                Out of Stock
              </span>
            </>
          )}

          {/* add to cart — opens the size/colour picker and saves to the cart */}
          {product.raw && (
            <div className="absolute bottom-3 right-3 z-20" onPointerDown={(e) => e.stopPropagation()}>
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
        <p className="text-xs font-semibold text-sky-700 mt-1">{product.detail}</p>
      </div>
    </div>
  );
};

const toCards = (rows: DBProduct[]): Card[] =>
  rows.map((p) => {
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
      raw: p,
    };
  });

type RailProps = {
  title: string;
  subtitle?: string;
  sectionKey: string;
  fallbackFilter: "trending" | "featured";
  badgeText: string;
  badgeClass: string;
  BadgeIcon: React.ComponentType<{ className?: string }>;
  accent: string;
  viewAllHref: string;
};

const Rail = ({
  title, subtitle, sectionKey, fallbackFilter, badgeText, badgeClass, BadgeIcon, accent, viewAllHref,
}: RailProps) => {
  // Try admin-configured section first, then fall back to a flag-based filter
  const primary = useSectionProducts({ sectionKey, limit: 12 });
  const fallback = useSectionProducts({
    isTrending: fallbackFilter === "trending" ? true : undefined,
    isFeatured: fallbackFilter === "featured" ? true : undefined,
    limit: 12,
  });
  const rows = primary.data && primary.data.length > 0 ? primary.data : (fallback.data ?? []);
  const cards = toCards(rows);

  if (cards.length === 0) return null;

  return (
    <section className="container py-10 md:py-14">
      <div className="flex items-end justify-between mb-5 md:mb-7">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
            <BadgeIcon className={`w-3.5 h-3.5 ${accent}`} />
            {subtitle ?? "Trending now"}
          </div>
          <h2 className="font-display text-xl md:text-2xl font-bold tracking-wide uppercase relative inline-block mt-1">
            {title}
            <span className={`absolute -bottom-2 left-0 w-12 h-[3px] rounded-full ${badgeClass}`} />
          </h2>
        </div>
        <Link
          to={viewAllHref}
          className="text-sm font-semibold text-primary underline underline-offset-4 decoration-sky hover:opacity-80 transition"
        >
          View All
        </Link>
      </div>

      <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 md:gap-5 pb-4">
          {cards.map((p) => (
            <RailCard
              key={p.id}
              product={p}
              badgeText={badgeText}
              badgeClass={badgeClass}
              BadgeIcon={BadgeIcon}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export const BestSelling = () => (
  <Rail
    title="Best Selling"
    subtitle="Most loved by our customers"
    sectionKey="best-selling"
    fallbackFilter="featured"
    badgeText="Bestseller"
    badgeClass="bg-gradient-to-r from-amber-600 to-amber-700"
    BadgeIcon={TrendingUp}
    accent="text-amber-600"
    viewAllHref="/shop?sort=popular"
  />
);

export const SellingFast = () => (
  <Rail
    title="Selling Fast"
    subtitle="Hurry — almost gone"
    sectionKey="selling-fast"
    fallbackFilter="trending"
    badgeText="Selling Fast"
    badgeClass="bg-gradient-to-r from-rose-600 to-rose-700"
    BadgeIcon={Flame}
    accent="text-rose-600"
    viewAllHref="/trending"
  />
);
