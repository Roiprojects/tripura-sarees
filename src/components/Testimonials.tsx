import { Quote, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useImageGroup } from "@/hooks/useImageGroup";
import { content } from "@/config/content";

type Item = { title?: string; subtitle?: string; ctaLabel?: string; image: string };

const fallback: Item[] = content.testimonials;

const Card = ({ t }: { t: Item }) => (
  <div className="testimonial-card p-6 md:p-8 h-full flex flex-col">
    {/* Stars */}
    <div className="flex gap-0.5 mb-4">
      {Array.from({ length: 5 }).map((_, k) => (
        <Star key={k} className="w-4 h-4 fill-amber-400 text-amber-400" />
      ))}
    </div>
    {/* Quote mark */}
    <Quote className="w-8 h-8 text-sky/40 mb-3 flex-shrink-0" />
    <p className="text-sm md:text-[15px] leading-relaxed text-foreground/80 flex-1 italic font-light">
      {t.subtitle || "—"}
    </p>
    {/* Author */}
    <div className="mt-5 pt-4 border-t border-border/40 flex items-center gap-3">
      {t.image ? (
        <img
          src={t.image}
          alt={t.title || ""}
          className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-200/60 shadow-md"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 via-amber-50 to-amber-200 flex items-center justify-center font-bold text-lg text-primary/80 shadow-inner ring-2 ring-amber-200/50">
          {(t.title || "?").slice(0, 1)}
        </div>
      )}
      <div>
        <div className="font-bold text-sm text-foreground">{t.title}</div>
        {t.ctaLabel && (
          <div className="text-xs text-muted-foreground font-medium mt-0.5">{t.ctaLabel}</div>
        )}
      </div>
      <div className="ml-auto">
        <span className="section-pill text-[9px] py-0.5 px-2">Verified</span>
      </div>
    </div>
  </div>
);

export const Testimonials = () => {
  const items = useImageGroup("testimonials", fallback) as Item[];
  const visible = items.slice(0, 6);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (visible.length <= 1) return;
    const t = setInterval(() => setActive((i) => (i + 1) % visible.length), 3500);
    return () => clearInterval(t);
  }, [visible.length]);

  if (items.length === 0) return null;

  return (
    <section className="container py-12 md:py-20">
      <div className="text-center mb-8 md:mb-12">
        <span className="inline-flex items-center gap-1.5 text-[10px] md:text-xs tracking-[0.25em] font-semibold text-sky-700 uppercase">
          <Star className="w-3.5 h-3.5 fill-sky" /> Loved by Our Customers
        </span>
        <h2 className="font-display text-2xl md:text-4xl font-bold mt-2">
          Draped in happiness
        </h2>
      </div>

      {/* Mobile: auto-sliding carousel */}
      <div className="md:hidden">
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${active * 100}%)` }}
          >
            {visible.map((t, i) => (
              <div key={i} className="w-full shrink-0 px-1">
                <Card t={t} />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex justify-center gap-1.5">
          {visible.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show testimonial ${i + 1}`}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Desktop/tablet: grid */}
      <div className="hidden md:grid gap-6 md:grid-cols-3">
        {visible.map((t, i) => (
          <Card key={i} t={t} />
        ))}
      </div>
    </section>
  );
};
