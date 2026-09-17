import { Sparkles, LucideIcon } from "lucide-react";

interface Props {
  eyebrow?: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  Icon?: LucideIcon;
}

export const MagicalPageHero = ({ eyebrow, title, highlight, subtitle, Icon }: Props) => {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-pink-300/40 via-rose-300/30 to-transparent blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute top-20 -right-32 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-sky-300/40 via-indigo-300/30 to-transparent blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 left-1/3 w-[460px] h-[460px] rounded-full bg-gradient-to-br from-amber-200/40 via-orange-200/30 to-transparent blur-3xl animate-[pulse_7s_ease-in-out_infinite]" />
        {[...Array(16)].map((_, i) => (
          <span
            key={i}
            className="absolute block w-1 h-1 rounded-full bg-foreground/40 animate-[pulse_3s_ease-in-out_infinite]"
            style={{
              top: `${(i * 53) % 100}%`,
              left: `${(i * 37) % 100}%`,
              animationDelay: `${(i % 6) * 0.4}s`,
            }}
          />
        ))}
      </div>
      <div className="container py-14 md:py-20">
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-background/70 backdrop-blur border border-border/60 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm">
              {Icon ? <Icon className="w-3.5 h-3.5 text-primary" /> : <Sparkles className="w-3.5 h-3.5 text-primary" />}
              {eyebrow}
            </span>
          )}
          <h1 className="font-display text-4xl md:text-6xl font-extrabold mt-5 mb-4 leading-[1.05] tracking-tight">
            {title}{" "}
            {highlight && (
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 bg-clip-text text-transparent">
                  {highlight}
                </span>
                <Sparkles className="absolute -top-3 -right-6 w-5 h-5 text-fuchsia-500 animate-pulse" />
              </span>
            )}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">{subtitle}</p>
          )}
        </div>
      </div>
    </section>
  );
};

interface CardProps {
  Icon: LucideIcon;
  title: string;
  body: string;
  accent: string;
  delay?: number;
}

export const MagicalInfoCard = ({ Icon, title, body, accent, delay = 0 }: CardProps) => (
  <div
    className="group relative rounded-2xl p-[1.5px] bg-gradient-to-br from-border via-border to-border hover:from-primary/40 hover:via-fuchsia-300/40 hover:to-sky-300/40 transition-all duration-500 animate-fade-in"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="relative rounded-2xl bg-card/80 backdrop-blur-xl border border-border/30 p-6 overflow-hidden h-full">
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${accent} opacity-10 group-hover:opacity-25 blur-2xl transition-opacity duration-500`} />
      <div className="flex items-start gap-4 relative">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-white shadow-lg shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display font-bold text-lg mb-1.5">{title}</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{body}</p>
        </div>
      </div>
    </div>
  </div>
);
