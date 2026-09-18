import { ArrowRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useImageGroup } from "@/hooks/useImageGroup";

type Post = {
  title?: string;
  subtitle?: string;
  href?: string;
  ctaLabel?: string;
  image: string;
  images?: string[];
};

import drapeArt from "@/assets/sarees/category-banarasi-silk.jpg";
import careArt from "@/assets/sarees/category-tussar-silk.jpg";
import weddingArt from "@/assets/sarees/store-bridal-flatlay.jpg";

const fallback: Post[] = [
  {
    title: "Five ways to drape a silk saree",
    subtitle: "From the classic Nivi to the Bengali style — step-by-step drapes for every occasion.",
    href: "/blog",
    ctaLabel: "Style Guide",
    image: drapeArt,
  },
  {
    title: "How to care for pure silk and zari",
    subtitle: "Storage, dry cleaning and folding tips that keep heirloom sarees looking new.",
    href: "/blog",
    ctaLabel: "Care",
    image: careArt,
  },
  {
    title: "Building your wedding saree trousseau",
    subtitle: "Which weaves to choose for each ritual, from mehendi to reception.",
    href: "/blog",
    ctaLabel: "Wedding",
    image: weddingArt,
  },
];

const ImageSlider = ({ images, alt }: { images: string[]; alt: string }) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 2500);
    return () => clearInterval(t);
  }, [images.length]);

  return (
    <div className="relative w-full h-full">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`${alt} ${i + 1}`}
          loading="lazy"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            i === idx ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {images.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? "w-5 bg-white" : "w-1.5 bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export const BlogSection = () => {
  const posts = useImageGroup("blog", fallback) as Post[];
  if (posts.length === 0) return null;

  return (
    <section className="container py-12 md:py-20">
      <div className="flex items-end justify-between gap-4 mb-6 md:mb-10">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] md:text-xs tracking-[0.25em] font-semibold text-sky-700 uppercase">
            <BookOpen className="w-3.5 h-3.5" /> Style Stories
          </span>
          <h2 className="font-display text-2xl md:text-4xl font-bold mt-1.5">
            From the journal
          </h2>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-3">
        {posts.slice(0, 3).map((p, i) => {
          const slides = p.images && p.images.length > 1 ? p.images : null;

          const inner = (
            <article className="group rounded-3xl overflow-hidden bg-card border border-border/60 shadow-card hover:shadow-lift transition-all duration-300 h-full flex flex-col">
              <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                {slides ? (
                  <ImageSlider images={slides} alt={p.title || ""} />
                ) : p.image ? (
                  <img
                    src={p.image}
                    alt={p.title || ""}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-100 via-amber-50 to-amber-100" />
                )}
              </div>
              <div className="p-5 md:p-6 flex flex-col gap-2 flex-1">
                {p.ctaLabel && (
                  <span className="inline-block self-start text-[10px] tracking-[0.2em] uppercase font-bold text-sky-700">
                    {p.ctaLabel}
                  </span>
                )}
                <h3 className="font-display text-lg md:text-xl font-bold leading-tight">{p.title}</h3>
                {p.subtitle && <p className="text-sm text-muted-foreground line-clamp-2">{p.subtitle}</p>}
                <span className="mt-auto pt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  Read more <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </article>
          );
          return p.href ? <Link key={i} to={p.href}>{inner}</Link> : <div key={i}>{inner}</div>;
        })}
      </div>
    </section>
  );
};
