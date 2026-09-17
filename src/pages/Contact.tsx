import { Layout } from "@/components/Layout";
import { StoreLocation } from "@/components/StoreLocation";
import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Sparkles, Send, MessageCircleHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { site } from "@/config/site";
import { socialIcon } from "@/lib/socialIcons";

const PRODUCT_CATEGORIES = [
  "Silk Sarees",
  "Cotton & Handloom Sarees",
  "Designer Sarees",
  "Wedding / Bridal Sarees",
  "Blouses & Tailoring",
  "Order & Delivery",
  "Wholesale Enquiry",
  "Other / General",
];

const infoCards = [
  {
    Icon: MapPin,
    title: "Visit our store",
    body: site.contact.addressLines.join("\n"),
    accent: "from-rose-400 to-pink-500",
  },
  {
    Icon: Phone,
    title: "Call us",
    body: site.contact.phoneDisplay,
    href: `tel:${site.contact.phoneE164}`,
    accent: "from-amber-400 to-orange-500",
  },
  {
    Icon: Mail,
    title: "Email us",
    body: site.contact.email,
    href: `mailto:${site.contact.email}`,
    accent: "from-sky-400 to-indigo-500",
  },
  {
    Icon: Clock,
    title: "Store hours",
    body: site.contact.hours.join("\n"),
    accent: "from-emerald-400 to-teal-500",
  },
];

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", category: "", message: "" });
  const [sending, setSending] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.category || !form.message) {
      toast.error("Please fill out all fields");
      return;
    }
    if (!/^[\d\s+()-]{7,15}$/.test(form.phone.trim())) {
      toast.error("Please enter a valid phone number");
      return;
    }
    setSending(true);
    const body =
      `Name: ${form.name}%0A` +
      `Email: ${form.email}%0A` +
      `Phone: ${form.phone}%0A` +
      `Interested in: ${form.category}%0A%0A` +
      `${form.message}`;
    const subject = encodeURIComponent(`Enquiry: ${form.category} — ${form.name}`);
    window.location.href = `mailto:${site.contact.email}?subject=${subject}&body=${body}`;
    setTimeout(() => {
      setSending(false);
      toast.success("Opening your email app…");
    }, 600);
  };

  return (
    <Layout>
      {/* Magical hero background */}
      <section className="relative overflow-hidden">
        {/* Aurora blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-pink-300/40 via-rose-300/30 to-transparent blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
          <div className="absolute top-20 -right-32 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-sky-300/40 via-indigo-300/30 to-transparent blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute bottom-0 left-1/3 w-[460px] h-[460px] rounded-full bg-gradient-to-br from-amber-200/40 via-orange-200/30 to-transparent blur-3xl animate-[pulse_7s_ease-in-out_infinite]" />
          {/* sparkle dots */}
          {[...Array(18)].map((_, i) => (
            <span
              key={i}
              className="absolute block w-1 h-1 rounded-full bg-foreground/50 animate-[pulse_3s_ease-in-out_infinite]"
              style={{
                top: `${(i * 53) % 100}%`,
                left: `${(i * 37) % 100}%`,
                animationDelay: `${(i % 6) * 0.4}s`,
                opacity: 0.4,
              }}
            />
          ))}
        </div>

        <div className="container py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-background/70 backdrop-blur border border-border/60 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              We're listening
            </span>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-extrabold mt-5 mb-4 leading-[1.05] tracking-tight">
              Let's find your perfect{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-emerald-700 via-amber-500 to-emerald-700 bg-clip-text text-transparent">
                  drape
                </span>
                <Sparkles className="absolute -top-3 -right-6 w-5 h-5 text-amber-500 animate-pulse" />
              </span>
              <br className="hidden md:block" />
              together.
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
              Questions, feedback, or wholesale enquiries — drop us a line and we'll wrap a reply in love within 24 hours.
            </p>
          </div>
        </div>
      </section>

      <section className="container pb-16 md:pb-24">
        <div className="grid lg:grid-cols-5 gap-6 md:gap-8">
          {/* Info cards */}
          <div className="lg:col-span-2 space-y-4">
            {infoCards.map(({ Icon, title, body, href, accent }, i) => {
              const Inner = (
                <div
                  className="group relative rounded-2xl p-[1.5px] bg-gradient-to-br from-border via-border to-border hover:from-primary/40 hover:via-fuchsia-300/40 hover:to-sky-300/40 transition-all duration-500 animate-fade-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="relative rounded-2xl bg-card/80 backdrop-blur-xl border border-border/30 p-5 overflow-hidden h-full">
                    <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${accent} opacity-10 group-hover:opacity-25 blur-2xl transition-opacity duration-500`} />
                    <div className="flex items-start gap-4 relative">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-white shadow-lg shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display font-bold text-base mb-1">{title}</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed break-words">
                          {body}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
              return href ? (
                <a key={title} href={href}>{Inner}</a>
              ) : (
                <div key={title}>{Inner}</div>
              );
            })}

            <div className="flex gap-3 pt-2 animate-fade-in" style={{ animationDelay: "400ms" }}>
              {site.socials.map((s, i) => {
                const Icon = socialIcon(s.platform);
                return (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-11 h-11 rounded-full bg-card/80 backdrop-blur border border-border/60 flex items-center justify-center hover:bg-gradient-to-br hover:from-primary hover:to-fuchsia-500 hover:text-white hover:border-transparent hover:scale-110 hover:-translate-y-0.5 transition-all duration-300 shadow-sm"
                >
                  <Icon className="w-4 h-4" />
                </a>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <div className="relative rounded-3xl p-[1.5px] bg-gradient-to-br from-rose-300/60 via-fuchsia-300/60 to-indigo-300/60 shadow-2xl shadow-fuchsia-500/10">
              <form
                onSubmit={submit}
                className="relative rounded-3xl bg-card/90 backdrop-blur-xl p-6 md:p-10 space-y-5 overflow-hidden"
              >
                {/* shimmer corner */}
                <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br from-fuchsia-300/30 to-transparent blur-3xl pointer-events-none" />
                <div className="flex items-center gap-3 mb-2 relative">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-600 flex items-center justify-center text-white shadow-lg">
                    <MessageCircleHeart className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl md:text-3xl font-bold leading-tight">Send us a message</h2>
                    <p className="text-xs text-muted-foreground">We typically reply within a few hours.</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 relative">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your name</label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Jane Doe"
                      className="h-12 rounded-xl bg-background/60 border-border/60 focus-visible:ring-2 focus-visible:ring-fuchsia-400/40 focus-visible:border-fuchsia-400"
                    />
                </div>
                <div className="grid sm:grid-cols-2 gap-4 relative">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone number</label>
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      maxLength={15}
                      className="h-12 rounded-xl bg-background/60 border-border/60 focus-visible:ring-2 focus-visible:ring-fuchsia-400/40 focus-visible:border-fuchsia-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interested in</label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger className="h-12 rounded-xl bg-background/60 border-border/60 focus:ring-2 focus:ring-fuchsia-400/40 focus:border-fuchsia-400">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email address</label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="jane@example.com"
                      className="h-12 rounded-xl bg-background/60 border-border/60 focus-visible:ring-2 focus-visible:ring-fuchsia-400/40 focus-visible:border-fuchsia-400"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</label>
                  <Textarea
                    rows={6}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us a little about what you need…"
                    className="rounded-xl bg-background/60 border-border/60 focus-visible:ring-2 focus-visible:ring-fuchsia-400/40 focus-visible:border-fuchsia-400 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 pt-2 relative">
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    By sending, you agree to our friendly reply within 24 hours.
                  </p>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={sending}
                    className="group relative h-12 px-6 rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 hover:shadow-[0_10px_40px_-10px_rgba(201,162,39,0.6)] hover:scale-[1.02] active:scale-95 transition-all duration-300 text-white border-0 overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span className="relative flex items-center gap-2 font-semibold">
                      {sending ? "Sending…" : "Send message"}
                      <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" />
                    </span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      <StoreLocation />
    </Layout>
  );
};

export default Contact;
