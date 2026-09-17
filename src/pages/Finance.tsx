import { Layout } from "@/components/Layout";
import { MagicalPageHero, MagicalInfoCard } from "@/components/MagicalPageHero";
import { CreditCard, Wallet, CalendarClock, BadgePercent, ShieldCheck, Sparkles } from "lucide-react";

const cards = [
  { Icon: CalendarClock, title: "Split into 3", body: "Pay in 3 equal interest-free\ninstallments, automatically.", accent: "from-rose-400 to-fuchsia-500" },
  { Icon: BadgePercent, title: "0% interest", body: "No hidden charges, no late fees\non eligible orders above ₹2,000.", accent: "from-emerald-400 to-teal-500" },
  { Icon: ShieldCheck, title: "Instant approval", body: "Soft credit check — won't affect\nyour score. Approved in seconds.", accent: "from-sky-400 to-indigo-500" },
  { Icon: Wallet, title: "Cards & UPI", body: "Use any major debit/credit card\nor UPI to set up your plan.", accent: "from-amber-400 to-orange-500" },
  { Icon: CreditCard, title: "EMI partners", body: "Razorpay Pay-Later, Simpl,\nLazyPay, ZestMoney supported.", accent: "from-fuchsia-400 to-pink-500" },
  { Icon: Sparkles, title: "No paperwork", body: "100% digital. No documents,\nno waiting, no headaches.", accent: "from-indigo-400 to-purple-500" },
];

const Finance = () => (
  <Layout>
    <MagicalPageHero
      eyebrow="Interest-Free Finance"
      title="Shop now, pay"
      highlight="later."
      subtitle="Bring home the silk you love — and split it into easy, zero-interest payments."
      Icon={CreditCard}
    />
    <section className="container pb-16 md:pb-24">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c, i) => <MagicalInfoCard key={c.title} {...c} delay={i * 70} />)}
      </div>
      <div className="mt-10 max-w-3xl mx-auto rounded-2xl border border-border/50 bg-gradient-to-br from-fuchsia-500/5 via-rose-500/5 to-indigo-500/5 backdrop-blur p-6 text-sm text-muted-foreground leading-relaxed">
        <h3 className="font-display font-bold text-foreground text-lg mb-2">How it works</h3>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>Add your favourite items to cart and head to checkout.</li>
          <li>Select <b className="text-foreground">Pay in 3</b> as your payment method.</li>
          <li>Pay the first installment today — we collect the rest every 30 days, automatically.</li>
        </ol>
      </div>
    </section>
  </Layout>
);

export default Finance;
