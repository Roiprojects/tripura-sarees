import { MapPin, Phone, Clock, Navigation, Sparkles, Store } from "lucide-react";
import { resolveImage } from "@/lib/resolveImage";
import { site } from "@/config/site";
import { content } from "@/config/content";
import { media } from "@/config/media";

const captions = content.storeLocation.photoCaptions;
const PHOTOS = [
  { src: media.store.front, caption: captions.front },
  { src: media.store.interior, caption: captions.interior },
  { src: media.store.highlight, caption: captions.highlight },
  { src: media.store.event, caption: captions.event },
];

// Google Maps embed — search text comes from site.store.mapQuery.
const MAP_QUERY = site.store.mapQuery;
const MAP_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&output=embed`;
const MAP_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAP_QUERY)}`;

export const StoreLocation = () => {
  return (
    <section className="container py-12 md:py-16">
      <div className="text-center mb-8 md:mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 text-pink-600 text-[11px] font-bold tracking-widest uppercase">
          <Sparkles className="w-3 h-3" /> {content.storeLocation.eyebrow}
        </div>
        <h2 className="font-display text-2xl md:text-4xl font-bold mt-3">
          {content.storeLocation.headingPrefix} <span className="text-pink-600">{content.storeLocation.headingHighlight}</span>
        </h2>
        <p className="text-muted-foreground text-sm md:text-base mt-2 max-w-xl mx-auto">
          {content.storeLocation.subheading}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 md:gap-6">
        {/* Map */}
        <div className="lg:col-span-3 relative rounded-3xl overflow-hidden ring-1 ring-border shadow-[0_20px_60px_-25px_hsl(166_72%_21%/0.35)] bg-muted min-h-[320px] md:min-h-[420px]">
          <iframe
            src={MAP_EMBED}
            title={`${site.brand.name} store location`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
          />
          <a
            href={MAP_LINK}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-4 left-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-foreground text-sm font-bold shadow-lg hover:scale-105 transition"
          >
            <Navigation className="w-4 h-4 text-pink-600" /> Get Directions
          </a>
        </div>

        {/* Info card */}
        <div className="lg:col-span-2 rounded-3xl p-6 md:p-7 bg-gradient-to-br from-pink-50 via-fuchsia-50 to-violet-50 ring-1 ring-pink-100 flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-pink-600">{site.store.label}</div>
              <div className="font-display text-lg font-bold">{site.store.name}</div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 mt-0.5 text-pink-600 shrink-0" />
              <div>
                <div className="font-semibold text-foreground">Address</div>
                <div className="text-muted-foreground">{site.store.regionLine}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 mt-0.5 text-pink-600 shrink-0" />
              <div>
                <div className="font-semibold text-foreground">Open Hours</div>
                <div className="text-muted-foreground">{site.store.hours}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 mt-0.5 text-pink-600 shrink-0" />
              <div>
                <div className="font-semibold text-foreground">Call us</div>
                <a href={`tel:${site.contact.phoneE164}`} className="text-pink-600 font-semibold hover:underline">
                  {site.contact.phoneDisplay}
                </a>
              </div>
            </div>
          </div>

          <div className="mt-auto flex gap-2">
            <a
              href={MAP_LINK}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white text-sm font-bold shadow hover:shadow-lg transition"
            >
              <Navigation className="w-4 h-4" /> Directions
            </a>
            <a
              href={`tel:${site.contact.phoneE164}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white text-foreground text-sm font-bold ring-1 ring-border hover:bg-muted/50 transition"
            >
              <Phone className="w-4 h-4 text-pink-600" /> Call
            </a>
          </div>
        </div>
      </div>

      {/* Photo gallery */}
      <div className="mt-6 md:mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {PHOTOS.map((p, i) => (
            <div
              key={i}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden ring-1 ring-border bg-muted shadow-sm hover:shadow-xl transition"
            >
              <img
                src={p.src}
                alt={p.caption}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = resolveImage(); }}
              />
              <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/75 to-transparent">
                <div className="text-white text-[11px] md:text-xs font-semibold">{p.caption}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
