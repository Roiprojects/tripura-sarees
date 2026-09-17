import { Instagram, Facebook, Twitter, Youtube, Linkedin, MapPin, Phone, Mail, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { site } from "@/config/site";
import { media } from "@/config/media";
import { socialIcon } from "@/lib/socialIcons";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const shopLinks = [
  { label: "All Sarees", to: "/shop" },
  { label: "New Arrivals", to: "/new" },
  { label: "Silk Sarees", to: "/category/silk-sarees" },
  { label: "Cotton & Handloom", to: "/category/handloom-sarees" },
  { label: "Designer Sarees", to: "/category/designer-sarees" },
  { label: "Wedding Sarees", to: "/occasion/wedding" },
  { label: "Best Sellers", to: "/shop?sort=popular" },
];

const aboutLinks = [
  { label: "Our story", to: "/about" },
  { label: "Press", to: "/press" },
  { label: "Blog", to: "/blog" },
  { label: "Contact", to: "/contact" },
];

const helpLinks = [
  { label: "Contact & FAQ", to: "/contact" },
  { label: "Track Your Order", to: "/orders" },
  { label: "Returns & Refunds", to: "/return-policy" },
  { label: "Shipping & Delivery", to: "/shipping" },
  { label: "Interest Free Finance", to: "/finance" },
  { label: "Payment Options", to: "/payment-options" },
];

const socials = site.socials.map((s) => ({ Icon: socialIcon(s.platform), label: s.label, href: s.url }));

const LinkList = ({ items }: { items: { label: string; to: string }[] }) => (
  <ul className="space-y-2.5 text-sm text-muted-foreground">
    {items.map((l) => (
      <li key={l.label}>
        <Link to={l.to} className="hover:text-primary transition-colors">
          {l.label}
        </Link>
      </li>
    ))}
  </ul>
);

export const Footer = () => {
  return (
    <footer className="relative mt-12 md:mt-16 bg-gradient-to-b from-secondary/40 via-background to-secondary/60 border-t-2 border-sky/60">
      {/* Mobile brand header */}
      <div className="container pt-10 pb-2 md:hidden text-center">
        <Link to="/" className="inline-flex items-center justify-center mb-3" aria-label={`${site.brand.name} home`}>
          <img src={media.logo} alt={site.brand.name} className="h-14 w-auto object-contain" />
        </Link>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
          {site.brand.shortBlurb}
        </p>
        {/* Socials */}
        <div className="flex justify-center gap-2.5 mt-5">
          {socials.map(({ Icon, label, href }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              aria-label={label}
              className="w-10 h-10 rounded-full bg-background border border-border/70 shadow-sm flex items-center justify-center text-foreground/70 hover:bg-sky hover:text-sky-foreground hover:border-sky hover:scale-110 active:scale-95 transition-all"
            >
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </div>
      </div>

      {/* MOBILE: accordion link sections */}
      <div className="md:hidden container pt-4 pb-2">
        <Accordion type="single" collapsible className="w-full">
          {[
            { value: "shop", title: "Shop", items: shopLinks },
            { value: "about", title: "About Us", items: aboutLinks },
            { value: "help", title: "Help & Support", items: helpLinks },
          ].map((s) => (
            <AccordionItem key={s.value} value={s.value} className="border-b border-border/60">
              <AccordionTrigger className="py-3.5 text-sm font-bold uppercase tracking-wider hover:no-underline">
                {s.title}
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <LinkList items={s.items} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Contact card */}
        <div className="mt-5 rounded-2xl border border-border/60 bg-background/60 backdrop-blur p-4 shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-foreground/80">Get in touch</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-sky" />
              <span>{site.contact.addressOneLine}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 shrink-0 text-sky" />
              <a href={`tel:${site.contact.phoneE164}`} className="hover:text-primary transition-colors">{site.contact.phoneDisplay}</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 shrink-0 text-sky" />
              <a href={`mailto:${site.contact.email}`} className="hover:text-primary transition-colors">{site.contact.email}</a>
            </li>

          </ul>
        </div>
      </div>

      {/* DESKTOP grid */}
      <div className="hidden md:grid container py-16 gap-10 md:grid-cols-12">
        {/* Brand */}
        <div className="md:col-span-4">
          <Link to="/" className="flex items-center mb-5" aria-label={`${site.brand.name} home`}>
            <img src={media.logo} alt={`${site.brand.name} - ${site.brand.tagline}`} className="h-14 w-auto object-contain" />
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-sm">
            {site.brand.longBlurb}
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 shrink-0" /><span>{site.contact.addressOneLine}</span></li>
            <li className="flex items-center gap-2"><Phone className="w-4 h-4 shrink-0" /><a href={`tel:${site.contact.phoneE164}`} className="hover:text-primary transition-colors">Phone: {site.contact.phoneDisplay}</a></li>
            <li className="flex items-center gap-2"><Mail className="w-4 h-4 shrink-0" /><a href={`mailto:${site.contact.email}`} className="hover:text-primary transition-colors">Email: {site.contact.email}</a></li>

          </ul>
          <div className="flex gap-3 mt-6">
            {socials.map(({ Icon, label, href }) => (
              <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} aria-label={label} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <h3 className="font-display font-bold uppercase tracking-wider mb-5 text-foreground">Shop</h3>
          <LinkList items={shopLinks} />
        </div>
        <div className="md:col-span-3">
          <h3 className="font-display font-bold uppercase tracking-wider mb-5 text-foreground">About Us</h3>
          <LinkList items={aboutLinks} />
        </div>
        <div className="md:col-span-3">
          <h3 className="font-display font-bold uppercase tracking-wider mb-5 text-foreground">Help</h3>
          <LinkList items={helpLinks} />
        </div>
      </div>

      {/* Bottom strip */}
      <div className="border-t border-border/60">
        <div className="container py-5 md:py-6 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground">
          <p className="text-center">
            © {new Date().getFullYear()} {site.brand.name}
            {site.credit && (
              <>
                {" "}· Developed By{" "}
                <a
                  href={site.credit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {site.credit.label}
                </a>
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 opacity-90">
            {["VISA", "MASTERCARD", "AMEX", "PAYPAL", "UPI"].map((p) => (
              <span key={p} className="px-2 py-1 rounded-md bg-background border border-border text-[10px] md:text-xs font-bold tracking-wider shadow-sm">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
