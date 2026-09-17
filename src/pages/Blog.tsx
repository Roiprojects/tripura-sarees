import { Layout } from "@/components/Layout";
import { MagicalPageHero } from "@/components/MagicalPageHero";
import { BookOpen, ArrowUpRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { site } from "@/config/site";

const posts = [
  { title: "Choosing your wedding saree: Banarasi or Kanjeevaram?", excerpt: "How the two great silk traditions differ in weight, weave and zari — and which suits your rituals.", tag: "Wedding", read: "6 min", accent: "from-rose-600 to-rose-800" },
  { title: "Five ways to drape a saree", excerpt: "Nivi, Bengali, Gujarati and more — step-by-step drapes for festivals and parties.", tag: "Style", read: "5 min", accent: "from-emerald-600 to-emerald-800" },
  { title: "How to care for pure silk and zari", excerpt: "Dry cleaning, airing, folding and storage tips that keep heirloom sarees looking new.", tag: "Care", read: "7 min", accent: "from-amber-500 to-amber-700" },
  { title: "Handloom 101: spotting a genuine handwoven saree", excerpt: "Irregular weave, the reverse side and the selvedge — what to look for before you buy.", tag: "Guides", read: "6 min", accent: "from-emerald-700 to-emerald-900" },
  { title: "Cotton and linen sarees for the office", excerpt: "Breathable, crisp drapes and easy blouse pairings for everyday workwear.", tag: "Workwear", read: "4 min", accent: "from-amber-600 to-rose-700" },
  { title: `From the loom: how a ${site.brand.name} handloom saree is woven`, excerpt: "A look at the yarn, warp and patient weaving behind a single handloom saree.", tag: "Stories", read: "8 min", accent: "from-rose-700 to-emerald-800" },
];

const Blog = () => (
  <Layout>
    <MagicalPageHero
      eyebrow="Journal"
      title="Stories from the"
      highlight="loom."
      subtitle="Draping guides, saree care tips and behind-the-scenes stories from the weavers we work with."
      Icon={BookOpen}
    />
    <section className="container pb-16 md:pb-24">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {posts.map((p, i) => (
          <Link
            key={p.title}
            to="#"
            className="group relative block rounded-2xl p-[1.5px] bg-gradient-to-br from-border via-border to-border hover:from-primary/40 hover:via-amber-300/40 hover:to-emerald-300/40 transition-all duration-500 animate-fade-in"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <article className="relative rounded-2xl bg-card/80 backdrop-blur-xl border border-border/30 overflow-hidden h-full">
              <div className={`h-40 bg-gradient-to-br ${p.accent} relative overflow-hidden`}>
                <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[radial-gradient(circle_at_30%_30%,white,transparent_60%)]" />
                <BookOpen className="absolute bottom-3 right-3 w-10 h-10 text-white/50" />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-muted font-semibold uppercase tracking-wider">{p.tag}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.read}</span>
                </div>
                <h3 className="font-display font-bold text-base md:text-lg leading-snug group-hover:text-primary transition-colors">{p.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-2">{p.excerpt}</p>
                <span className="inline-flex items-center gap-1 mt-4 text-xs font-semibold text-primary">
                  Read article <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  </Layout>
);

export default Blog;
