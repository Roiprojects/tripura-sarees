import { NavLink, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Heart, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/providers/cart-context";
import { playMagicSound } from "@/lib/magicSound";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", Icon: Home, end: true },
  { to: "/shop", label: "Categories", Icon: LayoutGrid },
  { to: "/wishlist", label: "Wishlist", Icon: Heart },
  { to: "/cart", label: "Cart", Icon: ShoppingBag, badge: true },
  { to: "/account", label: "Profile", Icon: User },
];

export const BottomNav = () => {
  const { count } = useCart();
  const { pathname } = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/85 backdrop-blur-xl border-t border-border/60 rounded-t-2xl shadow-[0_-8px_30px_-10px_hsl(var(--sky)/0.35)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5 px-1 pt-1.5">
        {items.map(({ to, label, Icon, end, badge }) => {
          const active = end ? pathname === to : pathname === to || pathname.startsWith(`${to}?`) || pathname.startsWith(`${to}/`);
          return (
            <li key={label}>
              <NavLink
                to={to}
                end={end}
                onClick={() => playMagicSound()}
                {...(badge ? { "data-cart-target": "" } : {})}
                className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 active:scale-95 transition-transform"
              >
                <span
                  className={cn(
                    "relative flex items-center justify-center w-10 h-9 rounded-full transition-all",
                    active && "bg-sky/15 shadow-[0_0_18px_hsl(var(--sky)/0.45)]"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-[22px] h-[22px] transition-colors",
                      active ? "text-sky" : "text-foreground/65"
                    )}
                  />
                  {badge && count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shadow">
                      {count}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-semibold tracking-wide transition-colors",
                    active ? "text-sky" : "text-foreground/65"
                  )}
                >
                  {label}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
