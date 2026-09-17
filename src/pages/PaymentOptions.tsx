import { Layout } from "@/components/Layout";
import { MagicalPageHero, MagicalInfoCard } from "@/components/MagicalPageHero";
import { CreditCard, Smartphone, Wallet, Banknote, ShieldCheck, Lock } from "lucide-react";

const cards = [
  { Icon: CreditCard, title: "Cards", body: "Visa, Mastercard, Amex, Rupay.\nDebit & credit, all welcome.", accent: "from-sky-400 to-indigo-500" },
  { Icon: Smartphone, title: "UPI", body: "Google Pay, PhonePe, Paytm,\nBHIM and every UPI app.", accent: "from-emerald-400 to-teal-500" },
  { Icon: Wallet, title: "Wallets", body: "Paytm, Amazon Pay, Mobikwik,\nFreecharge — pay in a tap.", accent: "from-rose-400 to-fuchsia-500" },
  { Icon: Banknote, title: "Net banking", body: "All 50+ major Indian banks\nsupported via Razorpay.", accent: "from-amber-400 to-orange-500" },
  { Icon: Lock, title: "256-bit SSL", body: "Every transaction is encrypted\nend-to-end. PCI-DSS certified.", accent: "from-fuchsia-400 to-pink-500" },
  { Icon: ShieldCheck, title: "Money-back promise", body: "Not happy? Full refund to your\noriginal payment method.", accent: "from-indigo-400 to-purple-500" },
];

const PaymentOptions = () => (
  <Layout>
    <MagicalPageHero
      eyebrow="Payment Options"
      title="Pay your way,"
      highlight="securely."
      subtitle="Every checkout is encrypted, certified, and effortless — choose what works best for you."
      Icon={Lock}
    />
    <section className="container pb-16 md:pb-24">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c, i) => <MagicalInfoCard key={c.title} {...c} delay={i * 70} />)}
      </div>
      <div className="mt-10 max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-3">
        {["VISA", "MASTERCARD", "AMEX", "RUPAY", "UPI", "PAYTM", "GPAY", "PHONEPE"].map((p) => (
          <span key={p} className="px-3 py-1.5 rounded-lg bg-card/80 backdrop-blur border border-border text-xs font-bold tracking-wider shadow-sm">
            {p}
          </span>
        ))}
      </div>
    </section>
  </Layout>
);

export default PaymentOptions;
