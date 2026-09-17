import { Link } from "react-router-dom";
import { ArrowRight, HandHeart, ScanSearch, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import loomArt from "@/assets/sarees/story-loom.svg";

const pillars = [
  { Icon: Sparkles, title: "Handwoven", text: "Sarees woven on traditional looms, thread by thread." },
  { Icon: HandHeart, title: "From weaving clusters", text: "Sourced from trusted weavers and handloom clusters." },
  { Icon: ScanSearch, title: "Checked by hand", text: "Every weave, border and pallu inspected before dispatch." },
];

/** Homepage story block that introduces the handloom collection. */
export const HeritageStory = () => (
  <section className="relative container py-14 md:py-24 overflow-hidden">
    {/* Ambient orbs */}
    <div className="orb-emerald w-80 h-80 -left-20 top-10 opacity-60 animate-orb" />
    <div className="orb-gold w-72 h-72 right-0 bottom-0 opacity-50" style={{ animationDelay: "3s" }} />

    <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center relative z-10">
      <div className="relative">
        {/* Outer dashed heritage ring */}
        <div className="absolute -inset-3 md:-inset-5 rounded-[2.5rem] border-2 border-dashed border-sky/40" aria-hidden />
        {/* Inner gold frame */}
        <div className="absolute -inset-1 rounded-3xl border border-amber-300/30" aria-hidden />
        <div className="relative overflow-hidden rounded-3xl shadow-2xl aspect-[3/2] bg-muted luxury-frame">
          <img
            src={loomArt}
            alt="A handloom weaving a silk saree"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover luxury-zoom"
          />
          {/* Subtle warm overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-950/10 via-transparent to-emerald-950/5 pointer-events-none" />
        </div>

        {/* Heritage Authentic Gold Seal Emblem */}
        <div className="absolute -bottom-4 -right-4 md:-bottom-6 md:-right-6 z-10 w-24 h-24 md:w-28 md:h-28 rounded-full royal-emerald-gradient p-2 border-2 border-amber-400/60 shadow-2xl flex flex-col items-center justify-center text-center hover:scale-105 transition-transform animate-pulse-ring">
          <Sparkles className="w-4 h-4 text-amber-300 animate-twinkle" />
          <span className="text-[10px] md:text-[11px] font-black uppercase tracking-wider leading-none mt-1 text-white">100% Genuine</span>
          <span className="text-[8px] md:text-[9px] text-amber-200/90 tracking-widest uppercase mt-0.5">Silk &amp; Handloom</span>
        </div>
      </div>

      <div>
        {/* Section label */}
        <div className="inline-flex items-center gap-2.5 mb-3">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-amber-400" />
          <span className="section-pill">
            <span className="animate-twinkle inline-block">✦</span> Woven in Tripura
          </span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-amber-400" />
        </div>

        <h2 className="font-display text-3xl md:text-5xl font-bold mt-1 leading-tight text-foreground">
          Handloom that carries{" "}
          <span className="italic font-serif font-normal gold-shimmer-text">a weaver's soul</span>
        </h2>

        <div className="luxury-hr mt-5 mb-5" style={{ maxWidth: "220px", margin: "1.25rem 0" }} />

        <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
          Our sarees celebrate the master artisan families who have preserved the rhythm of the wooden shuttle for generations. Light on the skin, majestic in drape, and woven to be cherished as family heirlooms.
        </p>

        <ul className="mt-8 grid sm:grid-cols-3 gap-3.5">
          {pillars.map(({ Icon, title, text }) => (
            <li key={title} className="card-luxury rounded-2xl p-4 md:p-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-amber-50 border border-amber-200/60 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <p className="font-display font-bold text-sm text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{text}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button asChild className="btn-luxury h-12 px-7 text-sm shadow-none border-0">
            <Link to="/category/tripura-handloom">
              Shop Tripura Handloom <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="btn-gold-outline h-12 px-6 text-sm border-0 bg-transparent">
            <Link to="/category/handloom-sarees">View All Weaves</Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

