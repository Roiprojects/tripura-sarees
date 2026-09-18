import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useImageGroup } from "@/hooks/useImageGroup";
import { resolveImage  } from "@/lib/resolveImage";
import heroWeddingAsset from "@/assets/sarees/hero-wedding.jpg";
import heroHandloomAsset from "@/assets/sarees/hero-handloom.jpg";
import heroFestiveAsset from "@/assets/sarees/hero-festive.jpg";
import heroDesignerAsset from "@/assets/sarees/hero-designer.jpg";
import sideBridalAsset from "@/assets/sarees/side-bridal.jpg";
import sideSilkAsset from "@/assets/sarees/side-silk.jpg";
import sideHandloomAsset from "@/assets/sarees/side-handloom.jpg";
import sideDesignerAsset from "@/assets/sarees/side-designer.jpg";
type Slide = { image: string; alt: string; href: string };

const fallbackSlides: Slide[] = [
  { image: heroWeddingAsset, alt: "The Wedding Edit — Banarasi & Kanjeevaram silks", href: "/occasion/wedding" },
  { image: heroHandloomAsset, alt: "Handloom cotton sarees woven in Tripura", href: "/category/handloom-sarees" },
  { image: heroFestiveAsset, alt: "Festive season sarees", href: "/occasion/festive" },
  { image: heroDesignerAsset, alt: "New arrivals — designer party drapes", href: "/new" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const fallbackSideCards = [
  { image: sideBridalAsset, label: "BRIDAL SILKS", href: "/occasion/wedding" },
  { image: sideSilkAsset, label: "KANJEEVARAM", href: "/category/kanjeevaram-silk" },
  { image: sideHandloomAsset, label: "HANDLOOM", href: "/category/handloom-sarees" },
  { image: sideDesignerAsset, label: "DESIGNER", href: "/category/designer-sarees" },
];

export function HeroCarousel() {
  const mainGroup = useImageGroup(
    "hero-main",
    fallbackSlides.map((s) => ({ image: s.image, title: s.alt, href: s.href }))
  );
  const sideGroup = useImageGroup(
    "hero-sidecards",
    fallbackSideCards.map((c) => ({ image: c.image, subtitle: c.label, href: c.href }))
  );

  const [slides, setSlides] = useState<Slide[]>(() =>
    shuffle(mainGroup.map((s) => ({ image: s.image, alt: s.title ?? "", href: s.href ?? "/" })))
  );
  // Reshuffle when DB data arrives (length changes)
  useEffect(() => {
    setSlides(shuffle(mainGroup.map((s) => ({ image: s.image, alt: s.title ?? "", href: s.href ?? "/" }))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainGroup.length, mainGroup[0]?.image]);

  const sideCards = sideGroup.map((c) => ({
    image: c.image,
    label: c.subtitle ?? c.title ?? "",
    href: c.href ?? "/",
  }));


  const autoplay = useRef(Autoplay({ delay: 4500, stopOnInteraction: false, stopOnMouseEnter: true }));
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" }, [autoplay.current]);
  const [selected, setSelected] = useState(0);

  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi]);

  return (
    <section className="container py-6 md:py-8">
      <div className="grid lg:grid-cols-12 gap-4 md:gap-5">
        {/* Left big carousel */}
        <div className="lg:col-span-9 relative rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl bg-gradient-hero-card aspect-[3/2] lg:min-h-0 lg:h-auto ring-1 ring-sky/40 group">
          {/* Haute Couture Campaign Badge */}
          <div className="absolute top-3 left-3 md:top-5 md:left-5 z-20 flex items-center gap-2 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] md:text-[11px] font-extrabold tracking-[0.12em] uppercase bg-black/55 text-amber-200 border border-amber-300/50 backdrop-blur-md shadow-lg">
              <span className="animate-twinkle">✦</span> Royal Handloom Edition
            </span>
          </div>

          <div ref={emblaRef} className="overflow-hidden h-full">
            <div className="flex h-full">
              {slides.map((s, i) => (
                <Link
                  key={i}
                  to={s.href}
                  className="relative flex-[0_0_100%] min-w-0 h-full block"
                >
                  <div className="relative w-full h-full">
                    <img
                      src={s.image}
                      alt={s.alt}
                      width={1920}
                      height={1080}
                      loading="eager"
                      decoding="async"
                      {...({ fetchpriority: "high" } as any)}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = resolveImage(); }}
                      className="absolute inset-0 w-full h-full object-cover object-center select-none bg-background"
                    />
                    {/* Cinematic multi-stop vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent pointer-events-none" />

                    {/* Editorial text overlay */}
                    <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 z-10 max-w-xl pointer-events-none">
                      <p className="text-amber-200/90 text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase mb-2 animate-slide-left">
                        ✦ Curated Heritage Weaves
                      </p>
                      <h3 className="text-white font-display text-xl md:text-3xl lg:text-4xl font-bold leading-tight drop-shadow-lg animate-slide-up delay-100">
                        {s.alt}
                      </h3>
                      <div className="mt-3 md:mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs md:text-sm font-semibold transition-all hover:bg-white/20 animate-slide-up delay-200">
                        Explore Collection <span className="text-amber-300">→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Dots */}
          <div className="absolute inset-x-0 bottom-3 md:bottom-5 flex justify-center gap-2 z-20">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  selected === i
                    ? "w-8 bg-gradient-to-r from-amber-400 to-amber-200 shadow-[0_0_10px_hsl(43_75%_55%/0.7)]"
                    : "w-1.5 bg-white/40 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        </div>


        {/* Side mini banners — vertical on desktop, horizontal scroll on mobile */}
        <div className="lg:col-span-3 relative rounded-2xl md:rounded-3xl overflow-hidden h-[220px] sm:h-[280px] lg:h-full">
          <div
            className="absolute left-0 top-0 flex flex-row w-max h-full lg:flex-col lg:w-full lg:h-max animate-scroll-x lg:animate-scroll-y will-change-transform"
          >
            {[...sideCards, ...sideCards, ...sideCards].map((c, idx) => (
              <Link
                key={`${c.label}-${idx}`}
                to={c.href}
                className="card-shimmer relative rounded-2xl md:rounded-3xl overflow-hidden shadow-card border border-sky/40 hover:border-sky group bg-gradient-to-br from-muted to-background shrink-0 w-[200px] sm:w-[240px] lg:w-full h-full lg:h-[225px] mr-3 lg:mr-0 lg:mb-3 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_hsl(166_60%_10%/0.4)]"
              >
                <img
                  src={c.image}
                  alt={c.label}
                  width={1024}
                  height={1024}
                  loading="eager"
                  decoding="async"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = resolveImage(); }}
                  className="absolute inset-0 w-full h-full object-cover"
                />

                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 p-2.5 md:p-3 flex justify-center">
                  <span className="font-display font-extrabold text-[11px] md:text-sm lg:text-base text-white tracking-widest px-3.5 py-1.5 rounded-full bg-black/65 backdrop-blur-md ring-1 ring-sky/50 shadow-md">
                    {c.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
