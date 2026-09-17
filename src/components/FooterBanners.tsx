import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useImageGroup } from "@/hooks/useImageGroup";
import { useIsMobile } from "@/hooks/use-mobile";
import { DEFAULT_GROUP_IMAGES } from "@/lib/defaultGroupImages";
import { resolveImage } from "@/lib/resolveImage";

// Built-in promo banners shown until the admin uploads their own.
const fallback = DEFAULT_GROUP_IMAGES["footer-banners"].map((b) => ({ ...b, image: resolveImage(b.image) }));

type Banner = { title?: string; subtitle?: string; href?: string; ctaLabel?: string; image: string };

export const FooterBanners = () => {
  const isMobile = useIsMobile();
  const banners = useImageGroup("footer-banners", fallback) as Banner[];
  if (banners.length === 0) return null;

  return (
    <section className="container py-8 md:py-12">
      <div className={`grid gap-4 md:gap-6 ${banners.length > 1 ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
        {banners.slice(0, 2).map((b, i) => {
          const img = (isMobile && (b as any).image_mobile) || b.image;
          const inner = (
            <div className="group relative overflow-hidden rounded-3xl aspect-[16/7] md:aspect-[21/9] bg-muted shadow-card hover:shadow-lift transition-shadow">
              {img && (
                <img
                  src={img}
                  alt={b.title || ""}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/10 md:from-black/65 md:via-black/25 md:to-transparent" />
              <div className="absolute inset-y-0 left-0 w-2/3 md:w-1/2 bg-gradient-to-r from-black/40 to-transparent mix-blend-multiply pointer-events-none" />
              <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-center text-white">
                {b.title && (
                  <h3 className="font-display text-xl md:text-3xl font-bold max-w-md text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.55)]">
                    {b.title}
                  </h3>
                )}
                {b.subtitle && (
                  <p className="mt-1.5 text-sm md:text-base text-white max-w-md line-clamp-2 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
                    {b.subtitle}
                  </p>
                )}
                {b.ctaLabel && (
                  <span className="mt-4 inline-flex items-center gap-1.5 self-start px-4 py-2 rounded-full bg-white text-foreground text-xs md:text-sm font-bold shadow-lg">
                    {b.ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

            </div>
          );
          return b.href ? <Link key={i} to={b.href}>{inner}</Link> : <div key={i}>{inner}</div>;
        })}
      </div>
    </section>
  );
};
