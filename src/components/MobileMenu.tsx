import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu, ChevronRight, Home, Sparkles, Gem, Flower2,
  Heart, ShoppingBag, User, Package, LogOut, Phone, Info,
  Crown, Sun, Trophy, RotateCcw, CalendarHeart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/providers/AuthProvider";
import { playMagicSound } from "@/lib/magicSound";
import { supabase } from "@/integrations/supabase/client";
import { isPhonePlaceholderEmail } from "@/lib/authEmail";

type Group = {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  items: { label: string; to: string }[];
};

const groups: Group[] = [
  {
    label: "Silk Sarees",
    Icon: Gem,
    color: "text-emerald-700 bg-emerald-600/10",
    items: [
      { label: "Banarasi Silk", to: "/category/banarasi-silk" },
      { label: "Kanjeevaram Silk", to: "/category/kanjeevaram-silk" },
      { label: "Tussar Silk", to: "/category/tussar-silk" },
      { label: "View All Silk", to: "/category/silk-sarees" },
    ],
  },
  {
    label: "Cotton & Handloom",
    Icon: Sun,
    color: "text-amber-700 bg-amber-500/15",
    items: [
      { label: "Tripura Handloom", to: "/category/tripura-handloom" },
      { label: "Cotton Sarees", to: "/category/cotton-sarees" },
      { label: "Linen Sarees", to: "/category/linen-sarees" },
      { label: "View All Handloom", to: "/category/handloom-sarees" },
    ],
  },
  {
    label: "Designer Sarees",
    Icon: Flower2,
    color: "text-rose-700 bg-rose-600/10",
    items: [
      { label: "Georgette & Chiffon", to: "/category/georgette-chiffon" },
      { label: "Organza Sarees", to: "/category/organza-sarees" },
      { label: "Party Wear Sarees", to: "/category/party-wear-sarees" },
      { label: "View All Designer", to: "/category/designer-sarees" },
    ],
  },
  {
    label: "Shop by Occasion",
    Icon: CalendarHeart,
    color: "text-emerald-700 bg-emerald-600/10",
    items: [
      { label: "Wedding", to: "/occasion/wedding" },
      { label: "Festive", to: "/occasion/festive" },
      { label: "Party", to: "/occasion/party" },
      { label: "Office Wear", to: "/occasion/office-wear" },
      { label: "Daily Wear", to: "/occasion/daily-wear" },
    ],
  },
  {
    label: "Collections",
    Icon: Sparkles,
    color: "text-amber-700 bg-amber-500/15",
    items: [
      { label: "New Arrivals", to: "/new" },
      { label: "Best Sellers", to: "/shop?sort=popular" },
      { label: "Trending Now", to: "/trending" },
      { label: "All Sarees", to: "/shop" },
    ],
  },
];

const quickLinks = [
  { label: "Home", to: "/", Icon: Home },
  { label: "New", to: "/new", Icon: Sparkles },
  { label: "Wishlist", to: "/wishlist", Icon: Heart },
  { label: "Cart", to: "/cart", Icon: ShoppingBag },
];

const featuredStores = [
  { label: "Silk Sarees", to: "/category/silk-sarees", Icon: Gem, color: "text-emerald-700 bg-emerald-600/10" },
  { label: "Handloom", to: "/category/handloom-sarees", Icon: Sun, color: "text-amber-700 bg-amber-500/15" },
  { label: "Designer", to: "/category/designer-sarees", Icon: Flower2, color: "text-rose-700 bg-rose-600/10" },
  { label: "Wedding", to: "/occasion/wedding", Icon: Crown, color: "text-emerald-700 bg-emerald-600/10" },
  { label: "Festive", to: "/occasion/festive", Icon: Sparkles, color: "text-amber-700 bg-amber-500/15" },
  { label: "Best Sellers", to: "/shop?sort=popular", Icon: Trophy, color: "text-rose-700 bg-rose-600/10" },
];

export const MobileMenu = () => {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    if (!user?.id) { setDisplayName(""); return; }
    let cancelled = false;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const n = (data?.full_name ?? "").trim();
        if (n) setDisplayName(n);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  const go = (to: string) => {
    playMagicSound();
    setOpen(false);
    navigate(to);
  };

  const emailLocal = (() => {
    const e = user?.email ?? "";
    if (!e || isPhonePlaceholderEmail(e)) return "";
    return e.split("@")[0];
  })();
  const nameForDisplay = displayName || emailLocal || "Account";
  const initials = (displayName || emailLocal || "?").slice(0, 2).toUpperCase();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Menu"
          className="rounded-full h-11 w-11 [&_svg]:w-6 [&_svg]:h-6 hover:bg-sky/15 active:scale-95 transition-all"
          onClick={() => playMagicSound()}
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[88vw] max-w-[360px] p-0 bg-background/95 backdrop-blur-xl border-r border-border/60"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        {/* Profile header */}
        <div className="relative p-5 pb-7 bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-900 text-white overflow-hidden border-b-2 border-sky">
          <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-sky/25 blur-3xl" />
          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => go(user ? "/account" : "/auth")}
              className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-base font-bold ring-2 ring-white/40 active:scale-95 transition"
            >
              {user ? initials : <User className="w-6 h-6" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-white/80 font-medium">
                {user ? "Welcome back" : "Hello, sign in"}
              </div>
              <div className="text-sm font-semibold truncate capitalize">
                {user ? nameForDisplay : "Tap to login or register"}
              </div>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="px-3 pt-3 pb-1 grid grid-cols-4 gap-1">
          {quickLinks.map(({ label, to, Icon }) => (
            <button
              key={label}
              onClick={() => go(to)}
              className="flex flex-col items-center gap-1 py-3 rounded-xl hover:bg-muted/60 active:scale-95 transition"
            >
              <Icon className="w-5 h-5 text-primary" />
              <span className="text-[10.5px] font-semibold text-foreground/80">{label}</span>
            </button>
          ))}
        </div>

        <div className="h-px bg-border/60 mx-4 my-1" />

        {/* Featured stores */}
        <div className="px-3 pt-2 pb-1">
          <div className="text-[10.5px] uppercase tracking-wider font-bold text-foreground/50 px-1 mb-1.5">
            Shop Sarees
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {featuredStores.map(({ label, to, Icon, color }) => (
              <button
                key={label}
                onClick={() => go(to)}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-border/50 hover:border-sky/40 hover:shadow-sm active:scale-95 transition"
              >
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-[10.5px] font-semibold text-foreground/80 text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-border/60 mx-4 my-2" />

        {/* Categories accordion */}
        <div className="px-2 overflow-y-auto max-h-[calc(100vh-460px)]">
          <Accordion type="single" collapsible className="w-full">
            {groups.map((g) => (
              <AccordionItem key={g.label} value={g.label} className="border-b border-border/40">
                <AccordionTrigger className="px-3 py-3 hover:no-underline">
                  <span className="flex items-center gap-3">
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${g.color}`}>
                      <g.Icon className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-semibold">{g.label}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pl-14 pb-2">
                  <ul className="space-y-1">
                    {g.items.map((it) => (
                      <li key={it.label}>
                        <button
                          onClick={() => go(it.to)}
                          className="w-full flex items-center justify-between py-2 pr-3 text-sm text-foreground/75 hover:text-primary transition"
                        >
                          <span>{it.label}</span>
                          <ChevronRight className="w-4 h-4 opacity-50" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="py-2">
            {[
              { label: "My Orders", to: "/orders", Icon: Package },
              { label: "About Us", to: "/about", Icon: Info },
              { label: "Return Policy", to: "/return-policy", Icon: RotateCcw },
              { label: "Contact", to: "/contact", Icon: Phone },
            ].map(({ label, to, Icon }) => (
              <button
                key={label}
                onClick={() => go(to)}
                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/60 rounded-lg transition"
              >
                <Icon className="w-5 h-5 text-foreground/60" />
                <span className="text-sm font-medium">{label}</span>
                <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
              </button>
            ))}

            {user && (
              <button
                onClick={async () => { playMagicSound(); await signOut(); setOpen(false); navigate("/"); }}
                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-destructive/10 rounded-lg transition text-destructive"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-semibold">Sign out</span>
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
