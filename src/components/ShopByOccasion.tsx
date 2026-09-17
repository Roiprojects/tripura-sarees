import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OCCASIONS, occasionImageForLink } from "@/lib/sareeCatalog";

type TileRow = {
  id: string;
  label: string;
  description: string | null;
  link: string;
  sort_order: number;
  active: boolean;
};

type Tile = { key: string; label: string; description: string; link: string; image: string };

/** "Shop by Occasion" — arched occasion tiles (admin: Shop by Occasion). */
export const ShopByOccasion = () => {
  const { data: rows = [] } = useQuery({
    queryKey: ["home-occasion-tiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("occasion_tiles" as any)
        .select("id,label,description,link,sort_order,active")
        .eq("active", true)
        .order("sort_order");
      return ((data ?? []) as unknown) as TileRow[];
    },
    staleTime: 60_000,
  });

  const tiles: Tile[] = rows.length > 0
    ? rows.map((r) => ({
        key: r.id,
        label: r.label,
        description: r.description ?? "",
        link: r.link,
        image: occasionImageForLink(r.link),
      }))
    : OCCASIONS.map((o) => ({
        key: o.slug,
        label: o.label,
        description: o.description,
        link: `/occasion/${o.slug}`,
        image: o.image,
      }));

  return (
    <section className="relative py-14 md:py-24 bg-gradient-to-b from-emerald-950 via-[hsl(166_85%_11%)] to-emerald-950 text-white overflow-hidden border-y border-sky/30">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.09] [background-image:radial-gradient(hsl(var(--sky))_1.5px,transparent_1.5px)] [background-size:28px_28px]"
      />
      <div className="container relative">
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="h-px w-8 bg-sky/80" />
            <span className="text-[11px] md:text-xs font-bold tracking-[0.3em] uppercase gold-text-gradient">Shop by Occasion</span>
            <span className="h-px w-8 bg-sky/80" />
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-1 text-white">
            A Royal Drape for <span className="italic font-serif font-normal text-amber-200">Every Moment</span>
          </h2>
          <p className="text-white/80 mt-3 text-sm md:text-base leading-relaxed">
            Grand wedding rituals, luminous festival mornings, power dressing, and festive evenings — handpicked for your milestone celebrations.
          </p>
        </div>

        <div className="flex md:grid md:grid-cols-5 gap-5 md:gap-6 overflow-x-auto md:overflow-visible scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 pb-3 snap-x">
          {tiles.map((t) => (
            <Link
              key={t.key}
              to={t.link}
              className="group shrink-0 w-[62%] sm:w-[40%] md:w-auto snap-start text-center transition-transform duration-300 hover:-translate-y-1.5"
            >
              <div className="relative overflow-hidden rounded-t-full rounded-b-2xl aspect-[4/5] ring-2 ring-sky/70 group-hover:ring-sky shadow-2xl group-hover:shadow-[0_0_30px_hsl(var(--sky)/0.45)] transition-all duration-500">
                <img
                  src={t.image}
                  alt={`${t.label} sarees`}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-2 rounded-t-full rounded-b-xl border border-sky/40 pointer-events-none group-hover:border-sky/80 transition-colors" />
              </div>
              <h3 className="font-display text-xl md:text-2xl font-bold mt-4 text-white group-hover:text-amber-300 transition-colors drop-shadow-sm">
                {t.label}
              </h3>
              {t.description && <p className="text-xs md:text-sm text-white/75 mt-1 line-clamp-2 leading-relaxed">{t.description}</p>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
