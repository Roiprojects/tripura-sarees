import { useEffect, useMemo, useRef, useState, MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, Check, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCart } from "@/providers/cart-context";
import type { Product } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { playMagicSound } from "@/lib/magicSound";
import { supabase } from "@/lib/supabase";
import { formatINR } from "@/lib/format";
import { getColorCss } from "@/lib/colorUtils";
import { resolveImage } from "@/lib/resolveImage";
import { useAuth } from "@/providers/AuthProvider";

type Props = {
  product: Product;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
  fullWidth?: boolean;
  className?: string;
};


type Stage = "idle" | "loading" | "added" | "go";

type VariantRow = {
  size: string;
  color_name: string | null;
  stock_quantity: number;
  variant_price: number | null;
  discount_percent?: number | null;
};

type ColorRow = { color_name: string; hex_code: string | null; images: string[] | null };

const FALLBACK_SIZES = ["Free Size"];

const uniq = (values: string[]) => [...new Set(values.map((v) => String(v ?? "").trim()).filter(Boolean))];
const cleanVariantValue = (value: unknown) => String(value ?? "").trim();

export const AddToCartButton = ({
  product,
  disabled,
  size = "sm",
  fullWidth,
  className,
}: Props) => {
  const { add, getAvailableStock } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stage, setStage] = useState<Stage>("idle");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [colorRows, setColorRows] = useState<ColorRow[]>([]);
  const [soldMap, setSoldMap] = useState<Record<string, number>>({});
  const timeoutRef = useRef<number | null>(null);

  const sizes = useMemo(
    () => uniq([...variants.map((v) => v.size), ...(product.sizes?.length ? product.sizes : FALLBACK_SIZES)]),
    [product.sizes, variants],
  );
  const colors = useMemo(
    () => uniq([
      ...variants.map((v) => v.color_name ?? ""),
      ...colorRows.map((c) => c.color_name),
      ...(product.colors?.length ? product.colors : ["Default"]),
    ]),
    [colorRows, product.colors, variants],
  );

  // Pre-select single options (a saree's "Free Size", a one-colour weave).
  useEffect(() => {
    if (!pickerOpen) return;
    if (sizes.length === 1) setSelectedSize(sizes[0]);
    if (colors.length === 1) setSelectedColor(colors[0]);
  }, [pickerOpen, sizes, colors]);

  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    Promise.all([
      supabase
        .from("product_variants")
        .select("size, color_name, stock_quantity, variant_price, discount_percent")
        .eq("product_id", product.id)
        .order("sort_order"),
      supabase
        .from("product_color_variants")
        .select("color_name, hex_code, images")
        .eq("product_id", product.id)
        .order("sort_order"),
      supabase
        .from("order_items")
        .select("size, color, quantity, status")
        .eq("product_id", product.id),
    ]).then(([variantResult, colorResult, soldResult]) => {
      if (cancelled) return;
      setVariants((variantResult.data ?? []) as VariantRow[]);
      setColorRows((colorResult.data ?? []) as ColorRow[]);
      const map: Record<string, number> = {};
      ((soldResult.data ?? []) as { size: string | null; color: string | null; quantity: number; status: string | null }[])
        .filter((r) => (r.status ?? "active") !== "cancelled")
        .forEach((r) => {
          const key = `${cleanVariantValue(r.size)}|${cleanVariantValue(r.color)}`;
          map[key] = (map[key] ?? 0) + Number(r.quantity ?? 0);
        });
      setSoldMap(map);
    });
    return () => { cancelled = true; };
  }, [pickerOpen, product.id]);

  const soldFor = (chosenSize: string, chosenColor: string) =>
    soldMap[`${cleanVariantValue(chosenSize)}|${cleanVariantValue(chosenColor)}`] ?? 0;

  const rawStockFor = (chosenSize: string, chosenColor: string) => {
    const exact = variants.find((v) => cleanVariantValue(v.size) === cleanVariantValue(chosenSize) && cleanVariantValue(v.color_name) === cleanVariantValue(chosenColor));
    if (exact) return Number(exact.stock_quantity ?? 0);
    const hasColorRowsForSize = variants.some((v) => cleanVariantValue(v.size) === cleanVariantValue(chosenSize) && cleanVariantValue(v.color_name));
    if (cleanVariantValue(chosenColor) && hasColorRowsForSize) return 0;
    const sizeOnly = variants.find((v) => cleanVariantValue(v.size) === cleanVariantValue(chosenSize) && !cleanVariantValue(v.color_name));
    if (sizeOnly) return Number(sizeOnly.stock_quantity ?? 0);
    if (variants.length > 0) return 0;
    return Number(product.stock ?? 0);
  };

  const availableFor = (chosenSize: string, chosenColor: string) =>
    getAvailableStock(product.id, rawStockFor(chosenSize, chosenColor), chosenSize, chosenColor);

  const priceFor = (chosenSize: string, chosenColor: string) => {
    const exact = variants.find((v) => cleanVariantValue(v.size) === cleanVariantValue(chosenSize) && cleanVariantValue(v.color_name) === cleanVariantValue(chosenColor));
    const hasColorRowsForSize = variants.some((v) => cleanVariantValue(v.size) === cleanVariantValue(chosenSize) && cleanVariantValue(v.color_name));
    const rawBase = cleanVariantValue(chosenColor) && hasColorRowsForSize
      ? Number(exact?.variant_price || product.price || 0)
      : (() => {
          const sizeOnly = variants.find((v) => cleanVariantValue(v.size) === cleanVariantValue(chosenSize) && Number(v.variant_price) > 0);
          return Number(exact?.variant_price || sizeOnly?.variant_price || product.price || 0);
        })();
    const sizeMatch = variants.find((v) => cleanVariantValue(v.size) === cleanVariantValue(chosenSize) && Number(v.discount_percent) > 0);
    const pct = Number(exact?.discount_percent ?? sizeMatch?.discount_percent ?? 0);
    if (pct > 0 && rawBase > 0) return Math.round(rawBase * (1 - pct / 100) * 100) / 100;
    return rawBase;
  };

  const ready = !!selectedSize && !!selectedColor;
  const selectedAvailable = ready ? availableFor(selectedSize, selectedColor) : 0;
  const selectedPrice = priceFor(selectedSize, selectedColor);
  const selectedSold = ready ? soldFor(selectedSize, selectedColor) : 0;

  // Partial stock: when only one of size/color is picked, sum stock across matching variants
  const partialStock = useMemo(() => {
    if (ready || (!selectedSize && !selectedColor)) return null;
    const rows = variants.filter((v) => {
      const sOk = selectedSize ? cleanVariantValue(v.size) === cleanVariantValue(selectedSize) : true;
      const cOk = selectedColor ? cleanVariantValue(v.color_name) === cleanVariantValue(selectedColor) : true;
      return sOk && cOk;
    });
    if (rows.length === 0) return null;
    return rows.reduce((sum, r) => sum + Number(r.stock_quantity ?? 0), 0);
  }, [ready, selectedSize, selectedColor, variants]);

  // Image swap by selected color (or first available color image)
  const colorImage = useMemo(() => {
    const target = selectedColor
      ? colorRows.find((c) => cleanVariantValue(c.color_name) === cleanVariantValue(selectedColor))
      : undefined;
    const src = (target?.images && target.images[0]) || product.images?.[0];
    return resolveImage(src);
  }, [selectedColor, colorRows, product.images]);

  const doAdd = async () => {
    if (!ready) return;
    playMagicSound();
    if (selectedAvailable <= 0) {
      toast.error(
        (product.stock ?? 0) <= 0
          ? "Out of stock for this variant"
          : "Maximum available quantity already in cart",
      );
      return;
    }
    setStage("loading");
    try {
      // add() shows its own error toasts and resolves false when nothing was saved.
      const added = await add(product, selectedSize, selectedColor, 1, { silent: true });
      if (!added) {
        setStage("idle");
        return;
      }
      toast.success("Added to cart", { description: `${product.name} • ${selectedSize} • ${selectedColor}` });
      setStage("added");
      setPickerOpen(false);
      setSelectedSize("");
      setSelectedColor("");
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setStage("go"), 1400);
    } catch (err) {
      toast.error("Could not add to cart");
      setStage("idle");
    }
  };

  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) {
      toast.error("This product is out of stock");
      return;
    }
    if (authLoading) return;
    if (!user) {
      toast.error("Please login to add products to your cart.");
      navigate("/auth", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    if (stage === "go") {
      navigate("/cart");
      return;
    }
    if (stage !== "idle") return;

    setPickerOpen(true);
  };

  const isAdded = stage === "added";
  const isGo = stage === "go";
  const isLoading = stage === "loading";

  const preorderStatus = (product as any).preorder_status as string | undefined;
  const isPreorder = preorderStatus === "preorder";
  const isComingSoon = preorderStatus === "coming_soon";
  const isDeclaredOOS = preorderStatus === "out_of_stock";
  const label = isComingSoon
    ? "Coming soon"
    : isDeclaredOOS
      ? "Sold out"
      : isPreorder
        ? (isLoading ? "Placing preorder" : isAdded ? "Preorder placed" : isGo ? "Go to cart" : "Preorder now")
        : (isLoading ? "Adding to cart" : isAdded ? "Added to cart" : isGo ? "Go to cart" : "Add to cart");

  const buttonEl = (
    <Button
      type="button"
      size="icon"
      onClick={handleClick}
      disabled={disabled || isLoading || isComingSoon || isDeclaredOOS}
      aria-label={label}
      title={label}
      className={cn(
        "relative overflow-hidden rounded-full text-white shrink-0",
        "h-10 w-10 md:h-11 md:w-11 p-0",
        "transition-all duration-300 ease-out shadow-md hover:shadow-lg active:scale-95",
        !isAdded && !isGo &&
          "bg-gradient-to-br from-primary via-primary to-primary-glow hover:brightness-110 hover:scale-[1.06]",
        isAdded &&
          "bg-gradient-to-br from-emerald-500 to-green-600 scale-[1.06]",
        isGo &&
          "bg-gradient-to-br from-foreground to-foreground/80 hover:scale-[1.06]",
        className,
      )}
    >
      {isLoading && <Loader2 className="w-[18px] h-[18px] animate-spin" />}
      {isAdded && <Check className="w-[18px] h-[18px] animate-scale-in" />}
      {isGo && <ArrowRight className="w-[18px] h-[18px]" />}
      {!isLoading && !isAdded && !isGo && <ShoppingBag className="w-[18px] h-[18px]" />}
    </Button>
  );

  

  return (
    <Popover open={pickerOpen} onOpenChange={(open) => {
      setPickerOpen(open);
      if (!open) {
        setSelectedSize("");
        setSelectedColor("");
      }
    }}>
      <PopoverTrigger asChild>{buttonEl}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-4 rounded-3xl border-primary/15 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-3">
          <div className="h-16 w-16 shrink-0 rounded-2xl overflow-hidden bg-muted ring-1 ring-border">
            <img
              key={colorImage}
              src={colorImage}
              alt={product.name}
              className="h-full w-full object-cover transition-opacity duration-300 animate-fade-in"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Choose variant</p>
            <p className="font-display text-sm font-semibold line-clamp-2 mt-0.5">{product.name}</p>
            <p className="text-sm font-display font-bold text-primary mt-0.5">{formatINR(selectedPrice)}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">Size</span>
              {selectedSize && <span className="text-xs text-primary font-semibold">{selectedSize}</span>}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {sizes.map((s) => {
                const out = selectedColor ? availableFor(s, selectedColor) <= 0 : false;
                const active = selectedSize === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={out}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSize(active ? "" : s);
                    }}
                    className={cn(
                      "h-9 rounded-full border text-xs font-semibold transition-all",
                      out
                        ? "border-border text-muted-foreground line-through cursor-not-allowed opacity-50"
                        : active
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-background hover:border-primary hover:bg-primary/5",
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">Color</span>
              {selectedColor && <span className="text-xs text-primary font-semibold capitalize">{selectedColor}</span>}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {colors.map((c) => {
                const colorMeta = colorRows.find((row) => row.color_name === c);
                const out = selectedSize ? availableFor(selectedSize, c) <= 0 : false;
                const active = selectedColor === c;
                return (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    disabled={out}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedColor(active ? "" : c);
                    }}
                    className={cn(
                      "relative h-9 w-9 rounded-full p-1 transition-all ring-offset-2 ring-offset-background",
                      out
                        ? "opacity-35 cursor-not-allowed ring-1 ring-border"
                        : active
                          ? "ring-2 ring-primary scale-110 shadow-md"
                          : "ring-1 ring-border hover:ring-primary hover:scale-105",
                    )}
                  >
                    <span className="block h-full w-full rounded-full ring-1 ring-black/10" style={{ background: getColorCss(c, colorMeta?.hex_code) }} />
                    {out && <span className="absolute left-1/2 top-1/2 h-0.5 w-10 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-destructive/70" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-primary/5 border border-primary/10 p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">
                {ready ? (
                  <>
                    <span className={cn("font-semibold", selectedAvailable <= 0 ? "text-destructive" : selectedAvailable <= 5 ? "text-amber-600" : "text-emerald-600")}>
                      {selectedAvailable} left
                    </span>
                    <span className="mx-1.5 text-muted-foreground/60">•</span>
                    <span>{selectedSold} sold</span>
                  </>
                ) : partialStock !== null ? (
                  <span className={cn("font-semibold", partialStock <= 0 ? "text-destructive" : partialStock <= 5 ? "text-amber-600" : "text-emerald-600")}>
                    {partialStock > 0 ? `${partialStock} in stock` : "Out of stock"}
                  </span>
                ) : (
                  "Select size and color"
                )}
              </span>
              <span className="font-display font-bold text-foreground">{formatINR(selectedPrice)}</span>
            </div>
            {(selectedSize || selectedColor) && (
              <p className="text-[10px] text-muted-foreground/70">Tap a selected chip again to clear it.</p>
            )}
          </div>

          <Button
            type="button"
            variant="pill"
            className="w-full"
            disabled={!ready || selectedAvailable <= 0 || isLoading}
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await doAdd();
            }}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <ShoppingBag className="w-4 h-4" />
            {ready ? "Add selected variant" : "Select size & color"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AddToCartButton;

