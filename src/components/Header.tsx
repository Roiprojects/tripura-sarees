import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingBag, User, Heart, Bell, LogOut, Package, Compass, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/providers/cart-context";
import { useAuth } from "@/providers/AuthProvider";
import { useWishlist } from "@/providers/WishlistProvider";
import { BrandLogo } from "./BrandLogo";
import { MobileMenu } from "./MobileMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEffect, useRef, useState } from "react";
import { playMagicSound } from "@/lib/magicSound";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";
import { resolveImage } from "@/lib/resolveImage";

const magicBtn =
  "rounded-full h-10 w-10 md:h-12 md:w-12 [&_svg]:w-5 [&_svg]:h-5 md:[&_svg]:w-6 md:[&_svg]:h-6 transition-all duration-300 hover:scale-110 hover:bg-sky/15 hover:shadow-[0_0_20px_hsl(var(--sky)/0.45)] active:scale-95";


type ProductHit = { id: string; name: string; price: number; images: string[] | null };

export const Header = () => {
  const { count } = useCart();
  const { user, signOut } = useAuth();
  const { items: wishItems, toggle: toggleWish } = useWishlist();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [productHits, setProductHits] = useState<ProductHit[]>([]);
  const [loadingHits, setLoadingHits] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const SEARCH_ROUTES: { keywords: string[]; label: string; path: string }[] = [
    { keywords: ["silk", "pure silk"], label: "Silk Sarees", path: "/category/silk-sarees" },
    { keywords: ["banarasi", "benarasi", "banaras"], label: "Banarasi Silk", path: "/category/banarasi-silk" },
    { keywords: ["kanjeevaram", "kanjivaram", "kanchipuram"], label: "Kanjeevaram Silk", path: "/category/kanjeevaram-silk" },
    { keywords: ["tussar", "tussore"], label: "Tussar Silk", path: "/category/tussar-silk" },
    { keywords: ["handloom", "handwoven", "tripura"], label: "Tripura Handloom", path: "/category/tripura-handloom" },
    { keywords: ["cotton", "tant", "mul"], label: "Cotton Sarees", path: "/category/cotton-sarees" },
    { keywords: ["linen"], label: "Linen Sarees", path: "/category/linen-sarees" },
    { keywords: ["georgette", "chiffon"], label: "Georgette & Chiffon", path: "/category/georgette-chiffon" },
    { keywords: ["organza"], label: "Organza Sarees", path: "/category/organza-sarees" },
    { keywords: ["designer", "party wear", "sequin"], label: "Designer Sarees", path: "/category/designer-sarees" },
    { keywords: ["wedding", "bridal", "marriage"], label: "Wedding Sarees", path: "/occasion/wedding" },
    { keywords: ["festive", "festival", "puja", "diwali"], label: "Festive Sarees", path: "/occasion/festive" },
    { keywords: ["party", "reception"], label: "Party Sarees", path: "/occasion/party" },
    { keywords: ["office", "work", "formal"], label: "Office Wear Sarees", path: "/occasion/office-wear" },
    { keywords: ["daily", "casual", "everyday"], label: "Daily Wear Sarees", path: "/occasion/daily-wear" },
    { keywords: ["new", "latest"], label: "New Arrivals", path: "/new" },
    { keywords: ["trending", "popular"], label: "Trending", path: "/trending" },
    { keywords: ["featured"], label: "Featured", path: "/featured" },
    { keywords: ["wishlist"], label: "Wishlist", path: "/wishlist" },
    { keywords: ["cart", "bag"], label: "Cart", path: "/cart" },
    { keywords: ["order", "orders"], label: "My Orders", path: "/orders" },
    { keywords: ["account", "profile"], label: "My Account", path: "/account" },
    { keywords: ["contact"], label: "Contact Us", path: "/contact" },
    { keywords: ["about"], label: "About Us", path: "/about" },
    { keywords: ["shipping", "delivery"], label: "Shipping & Delivery", path: "/shipping" },
    { keywords: ["finance", "emi"], label: "Finance & EMI", path: "/finance" },
    { keywords: ["payment", "pay"], label: "Payment Options", path: "/payment-options" },
    { keywords: ["return", "refund"], label: "Return Policy", path: "/return-policy" },
    { keywords: ["press"], label: "Press", path: "/press" },
    { keywords: ["blog"], label: "Blog", path: "/blog" },
  ];

  const q = query.trim().toLowerCase();
  const pageHits = q
    ? SEARCH_ROUTES.filter((r) =>
        r.label.toLowerCase().includes(q) || r.keywords.some((k) => k.includes(q) || q.includes(k)),
      ).slice(0, 6)
    : [];

  // Debounced product search
  useEffect(() => {
    if (!q) {
      setProductHits([]);
      setLoadingHits(false);
      return;
    }
    setLoadingHits(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,price,images")
        .or(`name.ilike.%${q}%,description.ilike.%${q}%,collection.ilike.%${q}%,sku.ilike.%${q}%,sku_id.ilike.%${q}%,design_number.ilike.%${q}%,brand.ilike.%${q}%`)
        .eq("status", "active")
        .limit(6);
      setProductHits((data as ProductHit[]) ?? []);
      setLoadingHits(false);
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Reset scroll synchronously before navigating so the sticky header stays
  // pinned at the viewport top and the new (often shorter) page doesn't cause
  // a visible header "jump" while the route swaps.
  const navTo = (path: string) => {
    if (typeof window !== "undefined" && window.scrollY > 0) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
    navigate(path);
  };

  const go = (path: string) => {
    setOpen(false);
    setMobileSearchOpen(false);
    setQuery("");
    playMagicSound();
    navTo(path);
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q) {
      navigate("/products");
      setMobileSearchOpen(false);
      return;
    }
    if (pageHits[0]) {
      go(pageHits[0].path);
      return;
    }
    if (productHits[0]) {
      go(`/product/${productHits[0].id}`);
      return;
    }
    setOpen(false);
    setMobileSearchOpen(false);
    navigate(`/products?q=${encodeURIComponent(query.trim())}`);
  };

  const showDropdown = open && q.length > 0;

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/60 shadow-[0_2px_20px_-10px_hsl(var(--sky)/0.25)] supports-[backdrop-filter]:bg-background/70">
      <div className="container flex items-center gap-2 md:gap-6 py-2.5 md:py-4">
        <BrandLogo />


        <div ref={boxRef} className="relative flex-1 max-w-2xl mx-auto hidden sm:block">
          <form onSubmit={onSearch} className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="Search: banarasi, handloom, wedding, organza…"
              className="rounded-full h-11 pl-11 pr-5 bg-muted/60 border-border text-foreground placeholder:text-muted-foreground"
              maxLength={120}
            />
          </form>

          {showDropdown && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-border/70 bg-popover/95 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--sky)/0.5)] overflow-hidden animate-in fade-in-0 zoom-in-95">
              {pageHits.length > 0 && (
                <div className="py-2">
                  <div className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pages</div>
                  {pageHits.map((p) => (
                    <button
                      key={p.path}
                      type="button"
                      onClick={() => go(p.path)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-sky/10 transition-colors"
                    >
                      <Compass className="w-4 h-4 text-sky" />
                      <span className="text-sm text-foreground">{p.label}</span>
                      
                    </button>
                  ))}
                </div>
              )}

              {(pageHits.length > 0 && (productHits.length > 0 || loadingHits)) && (
                <div className="h-px bg-border/60" />
              )}

              <div className="py-2">
                <div className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  Products {loadingHits && <Loader2 className="w-3 h-3 animate-spin" />}
                </div>
                {productHits.length === 0 && !loadingHits && (
                  <div className="px-4 py-2 text-xs text-muted-foreground">No products match "{query}"</div>
                )}
                {productHits.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => go(`/product/${p.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-sky/10 transition-colors"
                  >
                    {p.images?.[0] ? (
                      <img src={resolveImage(p.images[0])} alt="" className="w-10 h-10 rounded-lg object-cover bg-muted" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-sm text-foreground line-clamp-1 flex-1">{p.name}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => { setOpen(false); navigate(`/products?q=${encodeURIComponent(query.trim())}`); }}
                className="w-full text-center text-xs font-semibold text-primary py-3 border-t border-border/60 hover:bg-sky/10 transition-colors"
              >
                See all results for "{query}" →
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 md:gap-2 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className={`${magicBtn} sm:hidden`}
            aria-label="Search"
            onClick={() => { playMagicSound(); setMobileSearchOpen(true); }}
          >
            <Search />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`${magicBtn} hidden sm:inline-flex`}
            aria-label={user ? "My account" : "Sign in"}
            onClick={() => {
              playMagicSound();
              navTo(user ? "/account" : "/auth");
            }}
          >
            <User />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`${magicBtn} relative`}
                aria-label="Wishlist"
                onClick={() => playMagicSound()}
              >
                <Heart />
                {wishItems.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-pink-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md ring-2 ring-background">
                    {wishItems.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-80 p-0 rounded-2xl shadow-[0_20px_60px_-20px_hsl(var(--sky)/0.45)] overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" fill="currentColor" />
                  <span className="text-sm font-semibold">Your Wishlist</span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {wishItems.length} item{wishItems.length === 1 ? "" : "s"}
                </span>
              </div>

              {!user ? (
                <div className="p-6 text-center">
                  <Heart className="w-8 h-8 text-primary/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Sign in to save your favorites</p>
                  <Button size="sm" onClick={() => navTo("/auth")} className="rounded-full">
                    Sign in
                  </Button>
                </div>
              ) : wishItems.length === 0 ? (
                <div className="p-6 text-center">
                  <Heart className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No favorites yet</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full mt-3"
                    onClick={() => navTo("/shop")}
                  >
                    Browse shop
                  </Button>
                </div>
              ) : (
                <>
                  <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
                    {wishItems.slice(0, 6).map((i) => (
                      <div key={i.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors">
                        <Link
                          to={`/product/${i.product.id}`}
                          className="shrink-0"
                          onClick={() => playMagicSound()}
                        >
                          <img
                            src={resolveImage(i.product.images?.[0])}
                            alt={i.product.name}
                            className="w-12 h-12 rounded-lg object-cover bg-muted"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                          />
                        </Link>
                        <Link
                          to={`/product/${i.product.id}`}
                          className="flex-1 min-w-0"
                          onClick={() => playMagicSound()}
                        >
                          <p className="text-sm font-medium text-foreground line-clamp-1">{i.product.name}</p>
                          <p className="text-xs text-primary font-semibold mt-0.5">{formatINR(Number(i.product.price))}</p>
                        </Link>
                        <button
                          type="button"
                          aria-label="Remove"
                          onClick={() => toggleWish(i.product)}
                          className="p-1.5 rounded-full hover:bg-destructive/10 text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => navTo("/wishlist")}
                    className="w-full text-center text-xs font-semibold text-primary py-3 border-t border-border/60 hover:bg-sky/10 transition-colors"
                  >
                    View all wishlist →
                  </button>
                </>
              )}
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className={`${magicBtn} relative bg-gradient-to-br from-primary/15 to-fuchsia-500/15 ring-2 ring-primary/40 hover:from-primary/25 hover:to-fuchsia-500/25 hover:ring-primary/60 shadow-md shadow-primary/20`}
            aria-label="Cart"
            data-cart-target
            onClick={() => { playMagicSound(); navTo("/cart"); }}
          >
            <ShoppingBag className="text-primary" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md ring-2 ring-background">
                {count}
              </span>
            )}
          </Button>

          {/* Mobile menu trigger — right side */}
          <div className="md:hidden">
            <MobileMenu />
          </div>
        </div>
      </div>

      {/* Mobile search sheet */}
      <Sheet open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <SheetContent side="top" className="p-4 pt-6">
          <SheetHeader>
            <SheetTitle>Search</SheetTitle>
          </SheetHeader>
          <form onSubmit={onSearch} className="relative mt-3">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sarees, weaves, occasions…"
              className="rounded-full h-12 pl-11 pr-5"
              maxLength={120}
            />
          </form>
          <div className="mt-3 max-h-[60vh] overflow-y-auto">
            {pageHits.length > 0 && (
              <div className="py-1">
                <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pages</div>
                {pageHits.map((p) => (
                  <button
                    key={p.path}
                    type="button"
                    onClick={() => go(p.path)}
                    className="w-full flex items-center gap-3 px-2 py-2 text-left rounded-lg hover:bg-muted"
                  >
                    <Compass className="w-4 h-4 text-sky" />
                    <span className="text-sm">{p.label}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="py-1">
              <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                Products {loadingHits && <Loader2 className="w-3 h-3 animate-spin" />}
              </div>
              {q && productHits.length === 0 && !loadingHits && (
                <div className="px-2 py-2 text-xs text-muted-foreground">No products match "{query}"</div>
              )}
              {productHits.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => go(`/product/${p.id}`)}
                  className="w-full flex items-center gap-3 px-2 py-2 text-left rounded-lg hover:bg-muted"
                >
                  {p.images?.[0] ? (
                    <img src={resolveImage(p.images[0])} alt="" className="w-10 h-10 rounded-lg object-cover bg-muted" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-sm line-clamp-1 flex-1">{p.name}</span>
                </button>
              ))}
            </div>
            {q && (
              <button
                type="button"
                onClick={() => { setMobileSearchOpen(false); navigate(`/products?q=${encodeURIComponent(query.trim())}`); }}
                className="w-full text-center text-xs font-semibold text-primary py-3 mt-1 border-t border-border/60"
              >
                See all results for "{query}" →
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};
