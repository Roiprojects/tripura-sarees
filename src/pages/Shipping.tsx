import { Layout } from "@/components/Layout";
import { MagicalPageHero, MagicalInfoCard } from "@/components/MagicalPageHero";
import { Truck, Package, MapPin, Clock, ShieldCheck, Plane } from "lucide-react";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/format";
import { content } from "@/config/content";

const cards = [
  { Icon: Truck, title: "Standard delivery", body: `3 – 5 business days across India.\nFree on orders above ₹${FREE_SHIPPING_THRESHOLD}.`, accent: "from-sky-400 to-indigo-500" },
  { Icon: Plane, title: "Express delivery", body: "1 – 2 business days for Metro cities.\nFlat ₹149 surcharge applies.", accent: "from-rose-400 to-fuchsia-500" },
  { Icon: Package, title: "Safe packaging", body: "Every saree is folded with care and\npacked in protective, recyclable wrap.", accent: "from-emerald-400 to-teal-500" },
  { Icon: MapPin, title: "Pan-India shipping", body: "We deliver to 27,000+ pincodes\nincluding remote locations.", accent: "from-amber-400 to-orange-500" },
  { Icon: Clock, title: "Same-day dispatch", body: "Orders placed before 2 PM are\nshipped the very same day.", accent: "from-fuchsia-400 to-pink-500" },
  { Icon: ShieldCheck, title: "Insured in transit", body: "Every parcel is fully insured\nuntil it reaches your doorstep.", accent: "from-indigo-400 to-purple-500" },
];

const Shipping = () => (
  <Layout>
    <MagicalPageHero
      eyebrow="Shipping & Delivery"
      title="Delivered with"
      highlight="care."
      subtitle={content.shippingPageSubtitle}
      Icon={Truck}
    />
    <section className="container pb-16 md:pb-24">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c, i) => <MagicalInfoCard key={c.title} {...c} delay={i * 70} />)}
      </div>
      <div className="mt-10 max-w-3xl mx-auto rounded-2xl border border-border/50 bg-card/70 backdrop-blur p-6 text-sm text-muted-foreground leading-relaxed">
        <h3 className="font-display font-bold text-foreground text-lg mb-2">Order tracking</h3>
        <p>You'll receive a tracking link via SMS and email as soon as your order ships. You can also track live updates from your Account → Orders page anytime.</p>
      </div>
    </section>
  </Layout>
);

export default Shipping;
