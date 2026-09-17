import { Layout } from "@/components/Layout";
import { MagicalPageHero } from "@/components/MagicalPageHero";
import { Newspaper, ExternalLink, Download, Quote, Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { site } from "@/config/site";
import { content } from "@/config/content";
import { media } from "@/config/media";

const featured = { ...content.press.featured, image: media.pressFeature };
const press = content.press.items;

const Press = () => (
  <Layout>
    <MagicalPageHero
      eyebrow="Press & Media"
      title="In the"
      highlight="spotlight."
      subtitle="Selected coverage, brand assets and press contacts — everything you need to tell our story."
      Icon={Newspaper}
    />
    <section className="container pb-16 md:pb-24">
      {/* Featured Article */}
      <div className="mb-10 md:mb-14 rounded-3xl p-[1.5px] bg-gradient-to-br from-primary/40 via-fuchsia-400/40 to-amber-300/40 animate-fade-in">
        <div className="relative rounded-3xl bg-card/90 backdrop-blur-xl overflow-hidden grid md:grid-cols-2 gap-0">
          <div className="relative bg-gradient-to-br from-amber-100/40 via-rose-100/30 to-fuchsia-100/40 dark:from-amber-950/30 dark:via-rose-950/20 dark:to-fuchsia-950/30 p-5 md:p-8 flex items-center justify-center">
            <img
              src={featured.image}
              alt={`${featured.outlet} — ${featured.headline}`}
              loading="lazy"
              className="w-full h-auto max-h-[420px] object-contain rounded-xl shadow-lift ring-1 ring-border/40"
            />
            <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/90 backdrop-blur text-[10px] font-bold tracking-[0.2em] uppercase text-primary shadow-soft ring-1 ring-primary/20">
              <Sparkles className="w-3 h-3" /> Featured
            </span>
          </div>
          <div className="p-6 md:p-10 flex flex-col justify-center">
            <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
              <span className="font-display text-base text-foreground">{featured.outlet}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{featured.date}</span>
            </div>
            <h3 className="font-display text-2xl md:text-4xl font-bold leading-tight mt-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {featured.headline}
            </h3>
            <p className="text-sm md:text-base text-muted-foreground mt-4 leading-relaxed">
              {featured.excerpt}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="rounded-xl">
                <a href={featured.url} target="_blank" rel="noreferrer">
                  Read article <ExternalLink className="w-4 h-4 ml-1.5" />
                </a>
              </Button>
              <Button variant="outline" className="rounded-xl">
                <Download className="w-4 h-4 mr-2" /> Download clipping
              </Button>
            </div>
          </div>
        </div>
      </div>


      <div className="grid md:grid-cols-2 gap-5">
        {press.map((p, i) => (
          <a
            key={p.title}
            href={p.url}
            className="group relative rounded-2xl p-[1.5px] bg-gradient-to-br from-border via-border to-border hover:from-primary/40 hover:via-fuchsia-300/40 hover:to-sky-300/40 transition-all duration-500 animate-fade-in"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="relative rounded-2xl bg-card/80 backdrop-blur-xl border border-border/30 p-6 overflow-hidden h-full">
              <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${p.accent} opacity-10 group-hover:opacity-25 blur-2xl transition-opacity duration-500`} />
              <Quote className="w-6 h-6 text-fuchsia-500/40 relative" />
              <p className="font-display text-lg md:text-xl font-bold leading-snug mt-3 relative">"{p.title}"</p>
              <div className="flex items-center justify-between mt-5 relative">
                <div>
                  <p className="font-semibold text-sm">{p.outlet}</p>
                  <p className="text-xs text-muted-foreground">{p.date}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="mt-12 max-w-3xl mx-auto rounded-2xl border border-border/50 bg-gradient-to-br from-fuchsia-500/5 via-rose-500/5 to-indigo-500/5 backdrop-blur p-8 text-center">
        <h3 className="font-display text-2xl font-bold mb-2">Press enquiries</h3>
        <p className="text-sm text-muted-foreground mb-5">For interviews, samples or partnership stories, our team replies within 24 hours.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="rounded-xl">
            <a href={`mailto:${site.contact.email}?subject=Press%20enquiry`}>Email press team</a>
          </Button>
          <Button variant="outline" className="rounded-xl">
            <Download className="w-4 h-4 mr-2" /> Brand assets kit
          </Button>
        </div>
      </div>
    </section>
  </Layout>
);

export default Press;
