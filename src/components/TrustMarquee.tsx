import { content } from "@/config/content";

const items = content.trustMarquee;

export function TrustMarquee() {
  // Repeat enough times for seamless loop
  const loop = Array.from({ length: 8 }).flatMap(() => items);

  return (
    <section className="container py-4 md:py-6">
      <div className="relative overflow-hidden rounded-full royal-emerald-gradient ring-1 ring-sky/70 shadow-[0_4px_25px_-5px_hsl(166_70%_15%/0.35)]">
        <div className="flex animate-marquee whitespace-nowrap py-3.5 md:py-4.5">
          {loop.map((text, i) => (
            <span
              key={i}
              className="flex items-center text-amber-100 font-body font-extrabold tracking-[0.2em] text-xs md:text-sm px-6 md:px-12 uppercase drop-shadow-sm"
            >
              <span className="mr-3 text-sky">✦</span>
              {text}
              <span className="ml-6 md:ml-12 w-2 h-2 rotate-45 bg-gradient-to-br from-amber-200 to-sky shadow-sm" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
