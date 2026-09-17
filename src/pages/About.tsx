import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Heart,
  Star,
  ShieldCheck,
  Award,
  Gem,
  Leaf,
  Smile,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { resolveImage  } from "@/lib/resolveImage";
import { site } from "@/config/site";
import { content } from "@/config/content";
import { media } from "@/config/media";

const logo = media.logo;
const heroImg = media.about.hero;
const storyTallImg = media.about.storyTall;
const storyWideImg = media.about.storyWide;
const storySmallImg = media.about.storySmall;
const galleryExtraImg = media.about.galleryExtra;
const boutiqueImg = media.about.boutique;

const paragraphs = content.about.paragraphs;
const why = content.about.values;
const timeline = content.about.timeline.map((t, i) => ({ ...t, image: media.about.timeline[i] }));
const stats = content.about.stats;

const Reveal = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <div className="animate-fade-in" style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}>
    {children}
  </div>
);

const About = () => {
  return (
    <Layout>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt={`${site.brand.name} boutique`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-sky/20" />
        </div>
        {/* floating decoratives */}
        <div className="absolute top-20 left-8 w-24 h-24 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-sky/30 blur-3xl animate-pulse" />

        <div className="relative container py-20 md:py-32 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-background/70 backdrop-blur-md border border-border/60 shadow-soft mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Our Story</span>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <img src={logo} alt={site.brand.name} className="h-20 md:h-28 mx-auto mb-6 drop-shadow-lg" />
          </Reveal>
          <Reveal delay={200}>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              About <span className="bg-gradient-to-r from-primary via-sky to-primary bg-clip-text text-transparent">{site.brand.name}</span>
            </h1>
          </Reveal>
          <Reveal delay={320}>
            <p className="mt-5 text-lg md:text-2xl italic text-muted-foreground max-w-2xl mx-auto">
              "{content.about.heroQuote}"
            </p>
          </Reveal>
          <Reveal delay={460}>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild variant="pill" size="lg">
                <Link to="/shop">Explore Collection <ArrowRight className="w-4 h-4" /></Link>
              </Button>
              <Button asChild variant="pillOutline" size="lg">
                <a href="#story">Our Journey</a>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="container -mt-10 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 rounded-3xl bg-background/80 backdrop-blur-xl border border-border/60 shadow-lift p-5 md:p-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-2xl md:text-4xl font-bold bg-gradient-to-br from-primary to-sky bg-clip-text text-transparent">{s.value}</div>
              <div className="text-[11px] md:text-sm uppercase tracking-wider text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BRAND STORY */}
      <section id="story" className="relative container py-14 md:py-24 overflow-hidden">
        {/* mobile decorative blobs */}
        <div className="lg:hidden pointer-events-none absolute -top-10 -right-16 w-56 h-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="lg:hidden pointer-events-none absolute top-1/2 -left-20 w-60 h-60 rounded-full bg-sky/20 blur-3xl" />

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Reveal>
            <div className="relative">
              {/* magical pulsing glow behind grid */}
              <div className="absolute -top-6 -left-6 -right-6 -bottom-6 rounded-[2.5rem] bg-gradient-to-br from-primary/30 via-sky/20 to-primary/30 blur-3xl animate-magic-glow" />

              {/* floating sparkle particles */}
              <Sparkles className="absolute -top-2 left-1/3 w-5 h-5 text-primary/70 animate-twinkle z-20" style={{ animationDelay: "0.2s" }} />
              <Star className="absolute top-10 -right-2 w-4 h-4 text-sky animate-twinkle z-20" style={{ animationDelay: "0.8s" }} />
              <Sparkles className="absolute bottom-12 -left-3 w-4 h-4 text-primary/60 animate-twinkle z-20" style={{ animationDelay: "1.4s" }} />

              <div className="relative grid grid-cols-2 gap-2.5 md:gap-3">
                {/* Tall story image with shimmer ring */}
                <div className="group relative animate-float-slow">
                  <div className="absolute -inset-0.5 rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary/60 via-sky/40 to-primary/60 opacity-70 blur-md group-hover:opacity-100 transition-opacity" />
                  <div className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-lift aspect-[3/4]">
                    <img src={storyTallImg} alt="Bridal silk saree" loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {/* shimmer sweep on hover */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-1000" />
                    <Sparkles className="absolute top-3 right-3 w-4 h-4 text-white/90 drop-shadow animate-twinkle" />
                  </div>
                </div>

                <div className="space-y-2.5 md:space-y-3 pt-6 md:pt-8">
                  {/* Collection */}
                  <div className="group relative animate-float" style={{ animationDelay: "0.5s" }}>
                    <div className="absolute -inset-0.5 rounded-2xl md:rounded-3xl bg-gradient-to-br from-sky/60 to-primary/50 opacity-60 blur-md group-hover:opacity-100 transition-opacity" />
                    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-lift aspect-square">
                      <img src={storyWideImg} alt="Curated silk saree collection" loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-1000" />
                      <Star className="absolute bottom-2 left-2 w-4 h-4 text-white/90 drop-shadow animate-twinkle" style={{ animationDelay: "0.6s" }} />
                    </div>
                  </div>

                  {/* Handloom */}
                  <div className="group relative animate-float-slow" style={{ animationDelay: "1s" }}>
                    <div className="absolute -inset-0.5 rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary/50 to-sky/60 opacity-60 blur-md group-hover:opacity-100 transition-opacity" />
                    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-lift aspect-square">
                      <img src={storySmallImg} alt="Handloom cotton saree" loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-1000" />
                      <Sparkles className="absolute top-2 right-2 w-4 h-4 text-white/90 drop-shadow animate-twinkle" style={{ animationDelay: "1.2s" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* floating badges */}
              <div className="absolute -bottom-4 -right-2 md:-bottom-5 md:-right-5 bg-background border border-border rounded-2xl shadow-lift px-3.5 py-2 md:px-5 md:py-3 flex items-center gap-2 md:gap-3 animate-float z-20">
                <Heart className="w-4 h-4 md:w-5 md:h-5 text-primary fill-primary animate-pulse" />
                <span className="font-display text-xs md:text-sm font-bold whitespace-nowrap">{content.about.sinceBadge}</span>
              </div>
              <div className="absolute -top-3 -left-3 bg-background/90 backdrop-blur-md border border-border rounded-full shadow-lift px-3 py-1.5 flex items-center gap-1.5 animate-float-slow z-20">
                <Sparkles className="w-3.5 h-3.5 text-primary animate-twinkle" />
                <span className="font-display text-[10px] font-bold uppercase tracking-wider">Premium</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={180}>
            <div className="mt-8 lg:mt-0">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">
                <span className="w-8 h-px bg-primary" /> Our Brand Story
              </div>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.1] mb-5 md:mb-6">
                A love for <span className="italic text-primary">handwoven</span> heritage.
              </h2>

              {/* mobile pull-quote */}
              <div className="lg:hidden relative my-5 rounded-2xl bg-gradient-to-br from-primary/10 via-background to-sky/10 border border-border/60 p-5 shadow-soft">
                <span className="absolute -top-3 left-4 font-display text-5xl leading-none text-primary/40 select-none">"</span>
                <p className="font-display text-base italic text-foreground/80 leading-relaxed pl-4">
                  {content.about.storyPullQuote}
                </p>
              </div>

              <div className="space-y-4 text-foreground/75 leading-relaxed text-[15px] md:text-base">
                {paragraphs.slice(0, 4).map((p, i) => (
                  <p key={i} className="animate-fade-in" style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}>{p}</p>
                ))}
              </div>

              {/* mobile mini stats */}
              <div className="lg:hidden mt-6 grid grid-cols-3 gap-2">
                {content.about.mobileStats.map((s) => ({ v: s.value, l: s.label })).map((s) => (
                  <div key={s.l} className="text-center rounded-xl bg-background/70 backdrop-blur border border-border/60 py-2.5 shadow-soft">
                    <div className="font-display text-lg font-bold bg-gradient-to-br from-primary to-sky bg-clip-text text-transparent">{s.v}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* second half of story */}
        <div className="mt-12 md:mt-14 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Reveal>
            <div className="order-2 lg:order-1 space-y-4 text-foreground/75 leading-relaxed text-[15px] md:text-base">
              {paragraphs.slice(4).map((p, i) => (
                <p key={i} className="animate-fade-in" style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}>{p}</p>
              ))}
              <div className="relative mt-4 rounded-2xl bg-gradient-to-r from-primary/10 via-sky/10 to-primary/10 border border-primary/20 p-5 text-center">
                <Sparkles className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="font-display text-lg md:text-xl italic text-primary leading-snug">
                  {content.about.signatureQuote}
                </p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={180}>
            <div className="order-1 lg:order-2 relative">
              {/* magical glow halo */}
              <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-primary/40 via-sky/30 to-primary/40 blur-3xl animate-magic-glow" />

              {/* floating sparkles around frame */}
              <Sparkles className="absolute -top-3 left-8 w-5 h-5 text-primary animate-twinkle z-20" />
              <Star className="absolute top-1/3 -right-3 w-4 h-4 text-sky animate-twinkle z-20" style={{ animationDelay: "0.7s" }} />
              <Sparkles className="absolute -bottom-2 left-1/4 w-4 h-4 text-primary/70 animate-twinkle z-20" style={{ animationDelay: "1.3s" }} />

              <div className="group relative rounded-3xl overflow-hidden shadow-lift aspect-[4/5] border border-border/60 animate-float-slow">
                <img src={boutiqueImg} alt={`Inside ${site.brand.name} boutique`} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                {/* top glow vignette */}
                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 via-primary/10 to-transparent mix-blend-overlay pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent" />
                {/* shimmer sweep */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-[1200ms]" />

                <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 backdrop-blur-xl bg-background/70 border border-border/60 rounded-2xl p-4 shadow-lift">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display font-bold text-sm">Our Saree Studio</div>
                      <div className="text-xs text-muted-foreground truncate">{site.store.areaCity}</div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-md border border-border/60 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-soft">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Open Today</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>


      {/* MISSION & VISION */}
      <section className="container pb-16 md:pb-24">
        <div className="grid md:grid-cols-2 gap-5 md:gap-6">
          {[
            { icon: Heart, tag: "Our Mission", ...content.about.mission },
            { icon: Star, tag: "Our Vision", ...content.about.vision },
          ].map(({ icon: Icon, tag, title, text }) => (
            <div key={tag} className="group relative rounded-3xl overflow-hidden border border-border/60 bg-gradient-to-br from-background via-secondary/20 to-primary/5 p-8 md:p-10 shadow-soft hover:shadow-lift hover:-translate-y-1 transition-all">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl group-hover:bg-primary/20 transition-colors" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-5">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">{tag}</div>
                <h3 className="font-display text-2xl md:text-3xl font-bold mb-3">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="relative bg-gradient-to-b from-secondary/30 via-background to-secondary/20 border-y border-border">
        <div className="container py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">
              <span className="w-8 h-px bg-primary" /> Why Choose Us <span className="w-8 h-px bg-primary" />
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-3">The {site.brand.name} Difference</h2>
            <p className="text-muted-foreground">Six promises we make with every saree we sell.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {why.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="group h-full rounded-3xl bg-background/70 backdrop-blur-xl border border-border/60 p-7 shadow-soft hover:shadow-lift hover:-translate-y-1 transition-all">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-sky/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TIMELINE — magical journey */}
      <section className="relative overflow-hidden py-16 md:py-28">
        {/* magical background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-sky/10" />
        <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-sky/25 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-2 h-2 rounded-full bg-primary animate-ping" />
        <div className="absolute bottom-1/3 left-1/4 w-2 h-2 rounded-full bg-sky animate-ping" style={{ animationDelay: "1s" }} />

        <div className="relative container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-background/70 backdrop-blur-md border border-border/60 shadow-soft mb-4">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Our Journey</span>
              <Sparkles className="w-4 h-4 text-sky animate-pulse" />
            </div>
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold">
              From <span className="bg-gradient-to-r from-primary via-sky to-primary bg-clip-text text-transparent">{site.store.foundedYear}</span> to Today
            </h2>
            <p className="text-muted-foreground mt-3">Every chapter woven thread by thread — with craft, care and colour.</p>
          </div>

          <div className="relative">
            {/* spines */}
            <div className="md:hidden absolute left-5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/0 via-primary/50 to-sky/0" />
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-0.5 bg-gradient-to-b from-transparent via-primary/40 to-transparent" />

            <div className="space-y-8 md:space-y-20">
              {timeline.map((t, i) => {
                const left = i % 2 === 0;
                const chapter = i === 0 ? "Start" : i === timeline.length - 1 ? "Today" : `Chapter ${i + 1}`;
                return (
                  <Reveal key={t.year} delay={i * 100}>
                    {/* MOBILE CARD */}
                    <div className="md:hidden relative pl-14">
                      <div className="absolute left-2 top-6 w-7 h-7 rounded-full bg-background border-2 border-primary shadow-lift flex items-center justify-center text-sm">
                        {t.emoji}
                      </div>
                      <div className="group relative overflow-hidden rounded-3xl bg-background/80 backdrop-blur-xl border border-border/60 shadow-soft hover:shadow-lift transition-all">
                        <div className="relative aspect-[16/10] overflow-hidden">
                          <img src={t.image} alt={t.title} loading="lazy" width={768} height={480} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-border/60 text-[10px] font-bold uppercase tracking-wider text-primary shadow-soft">
                            {chapter}
                          </div>
                          <div className="absolute bottom-2 right-3 font-display text-4xl font-black bg-gradient-to-br from-primary to-sky bg-clip-text text-transparent drop-shadow">
                            {t.year}
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="font-display text-xl font-bold leading-tight flex items-center gap-2">
                            <span>{t.title}</span>
                            <Sparkles className="w-4 h-4 text-primary/70" />
                          </h3>
                          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{t.text}</p>
                        </div>
                      </div>
                    </div>

                    {/* DESKTOP ZIG-ZAG */}
                    <div className={`hidden md:grid md:grid-cols-2 md:gap-12 items-center ${left ? "" : "md:[&>*:first-child]:order-2"}`}>
                      <div className={`${left ? "md:text-right md:pr-10" : "md:text-left md:pl-10"}`}>
                        <div className={`inline-flex items-center gap-2 mb-3 ${left ? "md:flex-row-reverse" : ""}`}>
                          <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold uppercase tracking-wider text-primary">
                            {chapter}
                          </span>
                          <span className="text-xl">{t.emoji}</span>
                        </div>
                        <div className="font-display text-6xl lg:text-7xl font-black bg-gradient-to-br from-primary via-sky to-primary bg-clip-text text-transparent leading-none">
                          {t.year}
                        </div>
                        <h3 className="font-display text-2xl lg:text-3xl font-bold mt-3">{t.title}</h3>
                        <p className={`text-muted-foreground mt-3 leading-relaxed max-w-md ${left ? "md:ml-auto" : ""}`}>{t.text}</p>
                      </div>

                      <div className="relative">
                        {/* connector dot to spine */}
                        <div className={`absolute top-1/2 -translate-y-1/2 ${left ? "-left-12" : "-right-12"} w-5 h-5 rounded-full bg-background border-2 border-primary shadow-lift z-10 flex items-center justify-center`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        </div>
                        {/* connector line */}
                        <div className={`absolute top-1/2 h-px bg-gradient-to-r ${left ? "-left-12 right-full from-primary/50 to-transparent" : "-right-12 left-full from-transparent to-primary/50"} w-12`} />

                        <div className="group relative overflow-hidden rounded-[2rem] shadow-lift hover:shadow-xl transition-all hover:-translate-y-1 duration-500">
                          {/* magical glow */}
                          <div className="absolute -inset-1 bg-gradient-to-br from-primary/40 via-sky/30 to-primary/40 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
                          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-border/60 bg-background">
                            <img src={t.image} alt={t.title} loading="lazy" width={768} height={576} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent" />
                            {/* sparkle accents */}
                            <Sparkles className="absolute top-4 right-4 w-5 h-5 text-white/80 drop-shadow animate-pulse" />
                            <Star className="absolute bottom-4 left-4 w-4 h-4 text-white/70 drop-shadow" />
                            {/* floating year chip */}
                            <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-background/90 backdrop-blur-md border border-border/60 shadow-soft">
                              <span className="text-xs font-bold text-primary">{t.year}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>


      {/* IMAGE GALLERY */}
      <section className="container pb-16 md:pb-24">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-2">Inside Our World</h2>
          <p className="text-muted-foreground">A peek into the {site.brand.name} experience.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { src: heroImg, span: "md:col-span-2 md:row-span-2 aspect-square md:aspect-auto" },
            { src: storyTallImg, span: "aspect-[3/4]" },
            { src: storyWideImg, span: "aspect-[3/4]" },
            { src: storySmallImg, span: "aspect-[3/4]" },
            { src: galleryExtraImg, span: "aspect-[3/4]" },
          ].map((g, i) => (
            <div key={i} className={`group relative overflow-hidden rounded-2xl md:rounded-3xl shadow-soft hover:shadow-lift transition-all ${g.span}`}>
              <img src={g.src} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className="container pb-16 md:pb-24">
        <div className="rounded-3xl bg-gradient-to-br from-secondary/40 via-background to-primary/5 border border-border/60 p-8 md:p-14 text-center shadow-soft">
          <Sparkles className="w-8 h-8 text-primary mx-auto mb-4" />
          <h2 className="font-display text-2xl md:text-4xl font-bold mb-3 max-w-3xl mx-auto leading-tight">
            {content.about.testimonial.quote}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">{content.about.testimonial.attribution}</p>
          <div className="flex items-center justify-center gap-1 mt-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className="w-5 h-5 text-highlight" fill="currentColor" />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20 md:pb-28">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-sky text-primary-foreground p-10 md:p-16 text-center shadow-lift">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-white blur-3xl" />
          </div>
          <div className="relative">
            <img src={logo} alt={site.brand.name} className="h-14 md:h-16 mx-auto mb-5 brightness-0 invert" />
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4 max-w-2xl mx-auto leading-tight">
              {content.about.cta.heading}
            </h2>
            <p className="text-primary-foreground/90 max-w-xl mx-auto mb-8 md:text-lg">
              {content.about.cta.text}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="rounded-full bg-background text-foreground hover:bg-background/90">
                <Link to="/shop">Shop the Collection <ArrowRight className="w-4 h-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                <Link to="/occasion/wedding">Wedding Sarees</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
