import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { site } from "@/config/site";
import { content } from "@/config/content";

const SUPPORT_EMAIL = site.contact.email;

const openEmailSupport = (subject: string) => {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
  // Use a temporary anchor with target=_top so it works even inside the
  // Lovable preview iframe (where window.location.href = "mailto:" is blocked).
  const a = document.createElement("a");
  a.href = mailto;
  a.target = "_top";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Always copy the address as a fallback for in-app browsers / no mail client.
  navigator.clipboard?.writeText(SUPPORT_EMAIL).catch(() => {});
  toast.success("Email copied to clipboard", {
    description: `${SUPPORT_EMAIL} — paste into your mail app if it didn't open.`,
  });
};
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  PackageCheck,
  Clock,
  Wallet,
  Mail,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  Truck,
  RefreshCcw,
  Phone,
  MessageCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

const policyPoints = [
  { icon: Clock, title: "3-Day Return Window", text: "Return requests accepted within 3 days of delivery, subject to quality check approval." },
  { icon: PackageCheck, title: "Original Condition", text: "Sarees must be unused, unwashed, undamaged and unstitched (including the blouse piece), with all tags and original packaging intact." },
  { icon: Truck, title: "Return Charges", text: "Return charges apply per item (not per order). Shipping & payment gateway fees are non-refundable." },
  { icon: ShieldCheck, title: "Quality Check First", text: "Refunds are processed only after our team approves the quality check inspection." },
  { icon: Wallet, title: "Wallet Refund", text: `Approved refunds are credited directly to your ${site.brand.walletName.toUpperCase()} for future shopping.` },
  { icon: RefreshCcw, title: "No Direct Exchange", text: "We do not offer exchanges — simply place a new order for the replacement you want." },
  { icon: CreditCard, title: "Cancellation Fees", text: "Before dispatch: 2% bank processing fee. After dispatch: ₹149 cancellation fee." },
  { icon: AlertTriangle, title: "COD Charges", text: "For COD orders, the ₹100 COD charge is non-refundable in all cases." },
];

const processSteps = [
  { step: "01", title: "Email Us", text: `Currently we do not offer reverse pickup. Email ${SUPPORT_EMAIL} with your Order ID and issue details.` },
  { step: "02", title: "Get Return Address", text: "Our team will share the return address and detailed shipping instructions via email reply." },
  { step: "03", title: "Ship Securely", text: "Pack the item securely with original tags & packaging to avoid any transit damage." },
  { step: "04", title: "Inspection & Refund", text: `Once received and inspected, your refund is credited to your ${site.brand.walletName} as store credit.` },
];

const faqs = [
  {
    q: "How long does the refund take?",
    a: `Once your returned item passes our quality inspection, the refund is credited to your ${site.brand.walletName} within 3–5 business days.`,
  },
  {
    q: "Can I get a refund to my bank account instead of wallet?",
    a: `All approved refunds are credited to your ${site.brand.walletName} only. You can use the wallet balance on any future order across the store.`,
  },
  {
    q: "What if my return is rejected during quality check?",
    a: "If the returned item fails the quality check (used, damaged, missing tags, or not in original condition), the return will be rejected and no refund will be issued.",
  },
  {
    q: "Do you offer exchanges?",
    a: "We do not offer direct exchanges. Please return the item as per policy and place a new order for the size/style you need.",
  },
  {
    q: "Why are shipping & payment gateway fees non-refundable?",
    a: "These are third-party charges already paid to logistics and payment providers, and cannot be recovered once the order is processed.",
  },
  {
    q: "What is the cancellation fee?",
    a: "Cancellations before dispatch incur a 2% bank processing fee. After dispatch, a flat ₹149 cancellation fee is applicable.",
  },
];

const ReturnPolicy = () => {
  return (
    <Layout>
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky/20 via-secondary/30 to-primary/10 border-b border-border">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-sky/30 blur-3xl" />
        </div>
        <div className="container relative py-14 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-background/80 backdrop-blur border border-border/60 shadow-sm mb-5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider">Customer Protection</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Return & Refund Policy
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            Shop with confidence. We've made our return process simple, transparent, and fair —
            because your trust matters more than anything.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
            <Button asChild variant="pill" size="lg">
              <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Return Request")}`}>
                <Mail className="w-4 h-4" /> Request a Return
              </a>
            </Button>
            <Button asChild variant="pillOutline" size="lg">
              <Link to="/account?tab=wallet">
                <Wallet className="w-4 h-4" /> View My Wallet
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Key Policy Points */}
      <section className="container py-12 md:py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Policy at a Glance</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Everything you need to know about returns, refunds, and cancellations.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {policyPoints.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border/60 bg-card p-5 shadow-sm hover:shadow-lift hover:-translate-y-0.5 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-1.5 text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Wallet Refund Explanation */}
      <section className="container pb-12 md:pb-16">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-r from-primary/10 via-sky/10 to-secondary/30 p-6 md:p-10">
          <div className="grid md:grid-cols-[auto_1fr_auto] items-center gap-6">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-background shadow-lift flex items-center justify-center shrink-0">
              <Wallet className="w-10 h-10 md:w-12 md:h-12 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-xl md:text-2xl font-bold mb-2">
                Refunds are credited to your {site.brand.walletName}
              </h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Once your return passes our quality check, the refund amount is instantly added to
                your {site.brand.walletName} as store credit. Use your wallet balance on your next order —
                no waiting for bank transfers, no hidden fees, just seamless shopping.
              </p>
            </div>
            <Button asChild variant="pill" size="lg" className="md:self-center">
              <Link to="/account?tab=wallet">Open Wallet</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Return Process */}
      <section className="bg-secondary/20 border-y border-border">
        <div className="container py-12 md:py-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">How to Return an Item</h2>
            <p className="text-muted-foreground text-sm md:text-base">
              A simple 4-step process to get your refund credited.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {processSteps.map(({ step, title, text }) => (
              <div
                key={step}
                className="relative rounded-2xl bg-background border border-border/60 p-5 shadow-sm"
              >
                <div className="absolute -top-3 left-5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold tracking-wider shadow-soft">
                  STEP {step}
                </div>
                <h3 className="font-semibold mt-3 mb-1.5 text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Notes */}
      <section className="container py-12 md:py-16">
        <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 md:p-8">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <h2 className="font-display text-xl md:text-2xl font-bold">Important Notes</h2>
          </div>
          <ul className="space-y-3 text-sm md:text-base text-muted-foreground leading-relaxed pl-9">
            <li className="list-disc">
              Customers must <span className="text-foreground font-medium">securely pack the return item</span> to avoid transit damage.
            </li>
            <li className="list-disc">
              Refunds are strictly issued <span className="text-foreground font-medium">post quality-check approval</span>.
            </li>
            <li className="list-disc">
              <span className="text-foreground font-medium">Rejected returns will not be refunded</span> and the item will be returned to the customer at their cost.
            </li>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="container pb-12 md:pb-16">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Frequently Asked Questions</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Quick answers to common return & refund queries.
          </p>
        </div>
        <div className="max-w-3xl mx-auto rounded-2xl border border-border/60 bg-card px-5 md:px-7 shadow-sm">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-b last:border-b-0 border-border/60">
                <AccordionTrigger className="text-left text-sm md:text-base font-semibold hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Contact Support */}
      <section className="container pb-16 md:pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8 md:p-12 text-center shadow-lift">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
              Still need help?
            </h2>
            <p className="text-primary-foreground/90 max-w-xl mx-auto mb-6 text-sm md:text-base">
              Our support team is here to help you with any return, refund, or order related queries.
              We respond within 24 hours.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-[#25D366] text-white hover:bg-[#1ebe5d]"
              >
                <a
                  href={`https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(content.whatsapp.returns)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp Support
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                <a href={`tel:${site.contact.phoneE164}`}>
                  <Phone className="w-4 h-4" /> {site.contact.phoneDisplay}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ReturnPolicy;
