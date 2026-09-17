import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getRecentlyViewed, subscribeRecentlyViewed, type RecentlyViewedItem } from "@/lib/recentlyViewed";
import { formatINR } from "@/lib/format";
import { resolveImage } from "@/lib/resolveImage";

export const RecentlyViewed = () => {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(getRecentlyViewed());
    return subscribeRecentlyViewed(() => setItems(getRecentlyViewed()));
  }, []);

  if (items.length === 0) return null;

  const scroll = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section className="container py-10 md:py-14">
      <div className="flex items-end justify-between gap-4 mb-6 md:mb-8">
        <div>
          <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-semibold">
            Just for you
          </span>
          <h2 className="font-display text-2xl md:text-4xl font-bold tracking-tight mt-2">
            Recently Viewed
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll(-1)}
            aria-label="Scroll left"
            className="w-10 h-10 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-foreground hover:text-background transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            aria-label="Scroll right"
            className="w-10 h-10 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-foreground hover:text-background transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {items.map((p) => (
          <Link
            key={p.id}
            to={`/product/${p.id}`}
            className="group shrink-0 snap-start w-[160px] sm:w-[200px] md:w-[220px]"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted/40 shadow-card transition-shadow duration-300 group-hover:shadow-lift">
              <img
                src={resolveImage(p.image)}
                alt={p.name}
                loading="eager" decoding="async"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
            </div>
            <div className="pt-3">
              <h5 className="text-sm font-medium text-foreground/90 line-clamp-1">
                {p.name}
              </h5>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {formatINR(p.price)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
