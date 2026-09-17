import { ReactNode, useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useStaff } from "@/hooks/useStaff";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Package, Tag, ShoppingBag, Image as ImageIcon,
  Ticket, Users, Layers, LogOut, Loader2, Crown, Shield, BarChart3, Settings, Headphones, Bell, Wallet,
  Sparkles, Star, Heart, LayoutGrid, X, Film, Menu as MenuIcon, UserCog, Mail, Plug, Video, Ruler, Filter as FilterIcon, IndianRupee,
} from "lucide-react";
import { toast } from "sonner";
import { site } from "@/config/site";
import { media } from "@/config/media";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { StaffPermKey } from "@/lib/staffModules";

// `anyOf` lists the staff permissions that allow visibility. Items with
// `adminOnly: true` are visible to admins only (staff never sees them, even
// with permissions). Items with no `anyOf` are visible to everyone signed in
// to the admin panel (e.g. Dashboard).
type NavItem = { to: string; label: string; icon: any; anyOf?: StaffPermKey[]; adminOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/categories", label: "Categories", icon: Tag, anyOf: ["categories.manage"] },
  { to: "/admin/categories/tree", label: "Category Tree", icon: Layers, anyOf: ["categories.manage"] },
  { to: "/admin/category-banners", label: "Category Banners", icon: ImageIcon, anyOf: ["categories.manage", "homepage.manage"] },
  { to: "/admin/products", label: "Products", icon: Package, anyOf: ["products.add", "products.edit", "products.delete"] },
  { to: "/admin/size-guides", label: "Size Guides", icon: Ruler, anyOf: ["products.add", "products.edit"] },
  { to: "/admin/users", label: "Users", icon: Users, anyOf: ["customers.manage"] },
  { to: "/admin/staff", label: "Staff", icon: UserCog, adminOnly: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag, anyOf: ["orders.manage"] },
  { to: "/admin/refunds", label: "Refunds & Wallet", icon: Wallet, anyOf: ["refunds.manage"] },
  { to: "/admin/wallet-confirmation", label: "Wallet Confirmation", icon: Wallet, anyOf: ["refunds.manage"] },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket, anyOf: ["coupons.manage"] },
  { to: "/admin/homepage", label: "Homepage", icon: Layers, anyOf: ["homepage.manage"] },
  { to: "/admin/homepage-images", label: "Homepage Images", icon: ImageIcon, anyOf: ["homepage.manage"] },
  { to: "/admin/reels", label: "Reels Videos", icon: Film, anyOf: ["homepage.manage"] },
  
  
  { to: "/admin/occasions", label: "Shop by Occasion", icon: Sparkles, anyOf: ["homepage.manage"] },
  { to: "/admin/nav-bar", label: "Nav Bar", icon: MenuIcon, anyOf: ["homepage.manage"] },
  { to: "/admin/filters", label: "Storefront Filters", icon: FilterIcon, anyOf: ["products.edit"] },
  { to: "/admin/payment-methods", label: "Payment Methods", icon: IndianRupee, adminOnly: true },

  { to: "/admin/subscribers", label: "Subscribers", icon: Mail, adminOnly: true },
  { to: "/admin/video-consultations", label: "Video Consultations", icon: Video, adminOnly: true },
  // { to: "/admin/erp-integration", label: "ERP Integration", icon: Plug, adminOnly: true },
];

export const AdminLayout = ({ children }: { children?: ReactNode }) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const { isStaff, active: staffActive, profile: staffProfile, hasAny, loading: staffLoading } = useStaff();

  // Magical "open the shop" intro on first entry after login
  const [intro, setIntro] = useState(() => sessionStorage.getItem("admin_intro") === "1");
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!intro) return;
    sessionStorage.removeItem("admin_intro");
    const t1 = setTimeout(() => setDoorsOpen(true), 450);
    const t2 = setTimeout(() => setIntro(false), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [intro]);

  if (authLoading || roleLoading || staffLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground bg-slate-50">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading admin…
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;

  // Admins always get in. Staff get in if their account is active. Anyone
  // else gets bounced to the admin login.
  const isActiveStaff = isStaff && staffActive;
  if (!isAdmin && !isActiveStaff) return <Navigate to="/admin/login" replace />;

  // Filter the nav: admins see everything; staff only see items that match a
  // granted permission (and never the admin-only items).
  const visibleNav = isAdmin
    ? NAV
    : NAV.filter((n) => !n.adminOnly && n.anyOf && hasAny(...n.anyOf));

  const onLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {intro && (
        <>
          <style>{`
            @keyframes admin-door-left  { from { transform: translateX(0) } to { transform: translateX(-110%) } }
            @keyframes admin-door-right { from { transform: translateX(0) } to { transform: translateX(110%) } }
            @keyframes admin-logo-pop   { 0%{transform:scale(.2) rotate(-12deg);opacity:0;filter:blur(6px)} 60%{transform:scale(1.15) rotate(4deg);opacity:1;filter:blur(0)} 100%{transform:scale(1) rotate(0);opacity:0} }
            @keyframes admin-twinkle    { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
          `}</style>
          <div className="fixed inset-0 z-[100] pointer-events-none">
            {/* Centered logo burst */}
            <div className="absolute inset-0 flex items-center justify-center z-[101]">
              <div
                className="relative"
                style={{ animation: "admin-logo-pop 2s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
              >
                <div className="absolute inset-0 -m-10 bg-gradient-to-br from-pink-300/60 via-fuchsia-400/50 to-indigo-300/60 blur-3xl rounded-full" />
                <div className="relative bg-white/95 rounded-3xl p-4 shadow-[0_30px_80px_-15px_rgba(201,162,39,0.7)] border border-white/40">
                  <img src={media.logo} alt={site.brand.name} className="h-24 md:h-28 w-auto object-contain" />
                </div>
                <Sparkles className="absolute -top-3 -right-3 w-8 h-8 text-yellow-300 fill-yellow-200" style={{ animation: "admin-twinkle 1.4s ease-in-out infinite" }} />
                <Star className="absolute -bottom-2 -left-4 w-6 h-6 text-pink-200 fill-pink-300" style={{ animation: "admin-twinkle 1.8s ease-in-out 0.3s infinite" }} />
                <Heart className="absolute -top-4 left-1/2 -translate-x-1/2 w-6 h-6 text-pink-300 fill-pink-400" style={{ animation: "admin-twinkle 2s ease-in-out 0.6s infinite" }} />
              </div>
            </div>
            {/* Left door */}
            <div
              className="absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(135deg,hsl(46_68%_45%),hsl(166_72%_18%))] shadow-[inset_-20px_0_60px_rgba(0,0,0,0.4)] border-r-2 border-white/30"
              style={{ animation: doorsOpen ? "admin-door-left 1.4s cubic-bezier(0.7,0,0.3,1) forwards" : undefined }}
            >
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-16 rounded-full bg-white/40" />
            </div>
            {/* Right door */}
            <div
              className="absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(225deg,hsl(46_68%_45%),hsl(166_72%_18%))] shadow-[inset_20px_0_60px_rgba(0,0,0,0.4)] border-l-2 border-white/30"
              style={{ animation: doorsOpen ? "admin-door-right 1.4s cubic-bezier(0.7,0,0.3,1) forwards" : undefined }}
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-16 rounded-full bg-white/40" />
            </div>
          </div>
        </>
      )}
      {/* Gradient top bar */}
      <header className="bg-gradient-to-r from-slate-900 via-purple-900 to-purple-700 text-white shadow-lg">
        <div className="px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shrink-0">
              <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm sm:text-lg leading-tight truncate">Admin Panel</div>
              <div className="hidden sm:block text-xs text-white/60">{site.admin.panelName}</div>
            </div>
            <span className="hidden md:inline-flex ml-3 items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-medium">
              <Shield className="w-3 h-3" /> {isAdmin ? "Administrator" : "Staff"}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <NotificationBell />
            <div className="flex items-center gap-2.5">
              <span className="hidden sm:block text-sm font-medium truncate max-w-[160px]">
                {isAdmin ? "Admin" : (staffProfile?.name || "Staff")}
              </span>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-xs font-bold ring-2 ring-white/30">
                <Shield className="w-4 h-4" />
              </div>
            </div>
            <button onClick={onLogout} className="flex items-center gap-1.5 text-sm hover:text-white/80 transition">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tab nav — desktop horizontal, mobile hamburger */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        {/* Mobile: trigger button */}
        <div className="sm:hidden flex items-center justify-between px-3 py-2">
          <button
            onClick={() => setMenuOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold shadow"
          >
            <LayoutGrid className="w-4 h-4" /> Menu
          </button>
          <span className="text-xs text-slate-500">Admin navigation</span>
        </div>

        {/* Desktop: wrapping tabs so every nav item is visible */}
        <div className="hidden sm:flex px-4 lg:px-6 py-2 items-center gap-1.5 flex-wrap">
          {visibleNav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium whitespace-nowrap rounded-lg transition ${
                  isActive
                    ? "text-white bg-gradient-to-r from-blue-500 to-blue-600 shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`
              }
            >
              <n.icon className="w-4 h-4 shrink-0" />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div className="sm:hidden fixed inset-0 z-50" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="absolute top-0 inset-x-0 bg-white rounded-b-2xl shadow-2xl p-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-slate-900">Admin Menu</div>
              <button onClick={() => setMenuOpen(false)} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {visibleNav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl text-[11px] font-semibold text-center leading-tight min-h-[72px] ${
                      isActive
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`
                  }
                >
                  <n.icon className="w-5 h-5" />
                  <span className="line-clamp-2">{n.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="p-3 sm:p-6 max-w-[1600px] mx-auto overflow-x-hidden">{children ?? <Outlet />}</main>


    </div>
  );
};
