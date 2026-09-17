import { resolveImage } from "@/lib/resolveImage";
import { useEffect, useState, ReactNode, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import type { CartItem, Product } from "@/lib/database.types";
import { toast } from "sonner";
import { CartContext } from "./cart-context";

type LocalCartItem = {
  id?: string;
  product_id: string;
  name?: string;
  image?: string;
  price?: number;
  quantity: number;
  size: string;
  color: string;
};

type ServerCartItem = CartItem & { product?: Product | null };

const STORAGE_KEY = "store_cart";
const SNAPSHOT_KEY = "store_cart_products";

type CartLineIdentity = { product_id: string; size: string; color: string };

const cleanVariantValue = (value: unknown) => String(value ?? "").trim();

const cartLineKey = ({ product_id, size, color }: CartLineIdentity) =>
  `local-${product_id}::${encodeURIComponent(cleanVariantValue(size))}::${encodeURIComponent(cleanVariantValue(color))}`;

const isSameCartLine = (
  item: Pick<CartLineIdentity, "product_id" | "size" | "color">,
  productId: string,
  size: string,
  color: string,
) =>
  item.product_id === productId &&
  cleanVariantValue(item.size) === cleanVariantValue(size) &&
  cleanVariantValue(item.color) === cleanVariantValue(color);


const readLocal = (): LocalCartItem[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const snapshots = readSnapshots();
    const normalized = parsed
      .filter((item) => item?.product_id)
      .map((item) => {
        const productId = String(item.product_id);
        const snapshot = snapshots[productId];
        const size = cleanVariantValue(item.size);
        const color = cleanVariantValue(item.color);
        return {
          id: cartLineKey({ product_id: productId, size, color }),
          product_id: productId,
          name: item.name ? String(item.name) : snapshot?.name,
          image: item.image ? String(item.image) : snapshot?.image,
          price: Number(item.price ?? snapshot?.price) || 0,
          quantity: Math.max(1, Number(item.quantity) || 1),
          size,
          color,
        };
      });
    const byVariant = new Map<string, LocalCartItem>();
    normalized.forEach((item) => {
      const key = cartLineKey(item);
      const existing = byVariant.get(key);
      if (existing) existing.quantity += item.quantity;
      else byVariant.set(key, { ...item, id: key });
    });
    return [...byVariant.values()];
  } catch {
    return [];
  }
};
const writeLocal = (items: LocalCartItem[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readLocalFromItems(items)));

const readLocalFromItems = (items: LocalCartItem[]) => {
  const byVariant = new Map<string, LocalCartItem>();
  items
    .filter((item) => item?.product_id)
    .forEach((item) => {
      const normalized = {
        ...item,
        product_id: String(item.product_id),
        quantity: Math.max(1, Number(item.quantity) || 1),
        size: cleanVariantValue(item.size),
        color: cleanVariantValue(item.color),
      };
      const key = cartLineKey(normalized);
      const existing = byVariant.get(key);
      if (existing) existing.quantity += normalized.quantity;
      else byVariant.set(key, { ...normalized, id: key });
    });
  return [...byVariant.values()];
};

const readSnapshots = (): Record<string, Pick<LocalCartItem, "id" | "product_id" | "name" | "image" | "price">> => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const primaryImage = (product?: Pick<Product, "images"> | null) =>
  product?.images?.find(Boolean) || resolveImage();

const productSnapshot = (product: Product): LocalCartItem => ({
  id: product.id,
  product_id: product.id,
  name: product.name,
  image: primaryImage(product),
  price: Number(product.price) || 0,
  quantity: 1,
  size: "",
  color: "",
});

const saveProductSnapshot = (product: Product) => {
  const snapshot = productSnapshot(product);
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ ...readSnapshots(), [product.id]: snapshot }));
};

const fallbackProduct = (item: LocalCartItem, product?: Product | null): Product => ({
  id: item.product_id,
  name: product?.name || item.name || "Product unavailable",
  description: product?.description || "",
  price: Number(product?.price ?? item.price ?? 0),
  category_id: product?.category_id || "",
  sizes: product?.sizes || (item.size ? [item.size] : []),
  colors: product?.colors || (item.color ? [item.color] : []),
  images: product?.images?.length ? product.images : [item.image || resolveImage()],
  stock: product?.stock ?? 0,
  rating: product?.rating ?? 0,
  created_at: product?.created_at || new Date().toISOString(),
  category: product?.category,
});

type VariantRow = { product_id: string; size: string; color_name: string | null; variant_price: number | null; discount_percent?: number | null };

const applyDiscount = (price: number, pct: number | null | undefined) => {
  const p = Number(pct) || 0;
  if (p <= 0 || price <= 0) return price;
  return Math.round(price * (1 - p / 100) * 100) / 100;
};

const resolveItemPrice = (
  productPrice: number,
  size: string,
  color: string,
  variants: VariantRow[],
) => {
  const pos = (n: number | null | undefined) => (Number(n) > 0 ? Number(n) : 0);
  const cleanSize = cleanVariantValue(size);
  const cleanColor = cleanVariantValue(color);
  const combo = variants.find((v) => cleanVariantValue(v.size) === cleanSize && cleanVariantValue(v.color_name) === cleanColor);
  if (pos(combo?.variant_price)) return applyDiscount(pos(combo?.variant_price), combo?.discount_percent);
  const hasColorRowsForSize = variants.some((v) => cleanVariantValue(v.size) === cleanSize && cleanVariantValue(v.color_name));
  if (cleanColor && hasColorRowsForSize) {
    const fallback = pos(productPrice) || pos(variants.find((v) => pos(v.variant_price))?.variant_price);
    return applyDiscount(fallback, combo?.discount_percent);
  }
  const sizeOnly = variants.find((v) => cleanVariantValue(v.size) === cleanSize && pos(v.variant_price));
  if (sizeOnly) return applyDiscount(pos(sizeOnly.variant_price), sizeOnly.discount_percent);
  // Any size-matching row with a discount but no explicit price → discount base
  const sizeDisc = variants.find((v) => cleanVariantValue(v.size) === cleanSize && Number(v.discount_percent) > 0);
  if (pos(productPrice)) return applyDiscount(pos(productPrice), sizeDisc?.discount_percent);
  const anyVariant = variants.find((v) => pos(v.variant_price));
  return applyDiscount(pos(anyVariant?.variant_price), sizeDisc?.discount_percent);
};

const fetchVariantsFor = async (productIds: string[]) => {
  if (productIds.length === 0) return [] as VariantRow[];
  const { data } = await supabase
    .from("product_variants")
    .select("product_id, size, color_name, variant_price, discount_percent")
    .in("product_id", productIds);
  return (data ?? []) as VariantRow[];
};

/** Mirror of the `enforce_cart_stock` DB trigger: latest variant stock with size→product fallback. */
const fetchVariantStock = async (productId: string, size: string, color: string): Promise<number> => {
  const cleanSize = cleanVariantValue(size);
  const cleanColor = cleanVariantValue(color);
  const { data: variantRows } = await supabase
    .from("product_variants")
    .select("color_name, stock_quantity")
    .eq("product_id", productId)
    .eq("size", cleanSize);
  const rows = (variantRows ?? []) as { color_name: string | null; stock_quantity: number | null }[];
  const combo = rows.find((v) => cleanVariantValue(v.color_name) === cleanColor);
  if (combo?.stock_quantity != null) return Number(combo.stock_quantity);
  const hasColorSpecificRows = rows.some((v) => cleanVariantValue(v.color_name));
  if (cleanColor && hasColorSpecificRows) return 0;
  const sizeOnly = rows.find((v) => cleanVariantValue(v.color_name) === "") ?? rows[0];
  if (sizeOnly?.stock_quantity != null) return Number(sizeOnly.stock_quantity);
  const { data: prod } = await supabase
    .from("products")
    .select("stock")
    .eq("id", productId)
    .maybeSingle();
  return Number(prod?.stock ?? 0);
};

/** Current in-app route (without the deploy base path), used as the post-login return target. */
const currentAppRoute = () => {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  const { pathname, search } = window.location;
  const path = base && pathname.startsWith(base) ? pathname.slice(base.length) || "/" : pathname;
  return `${path}${search}`;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<(CartItem & { product: Product })[]>([]);
  const [loading, setLoading] = useState(false);

  const loadServerCart = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("cart_items")
      .select("*, product:products(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      console.error(error);
      return;
    }
    const snapshots = readSnapshots();
    const rows = (data as ServerCartItem[]) ?? [];
    const variants = await fetchVariantsFor([...new Set(rows.map((r) => r.product_id))]);
    setItems(rows.map((item) => {
      const baseProduct = item.product || fallbackProduct({ ...snapshots[item.product_id], product_id: item.product_id, quantity: item.quantity, size: item.size, color: item.color });
      const vRows = variants.filter((v) => v.product_id === item.product_id);
      const price = resolveItemPrice(Number(baseProduct.price) || 0, item.size, item.color, vRows);
      return { ...item, product: { ...baseProduct, price } };
    }));
  }, [user]);

  const loadLocalCart = useCallback(async () => {
    const local = readLocal();
    if (local.length === 0) {
      setItems([]);
      return;
    }
    const toCartItems = (products: Product[] = [], variants: VariantRow[] = []) => (local
      .map((l) => {
        const product = products.find((p) => p.id === l.product_id);
        const base = fallbackProduct(l, product);
        const vRows = variants.filter((v) => v.product_id === l.product_id);
        const price = resolveItemPrice(Number(base.price) || 0, l.size, l.color, vRows);
        return {
          id: cartLineKey(l),
          user_id: "guest",
          product_id: l.product_id,
          quantity: l.quantity,
          size: l.size,
          color: l.color,
          created_at: new Date().toISOString(),
          product: { ...base, price },
        };
      })) as (CartItem & { product: Product })[];

    setItems(toCartItems());
    const ids = [...new Set(local.map((i) => i.product_id))];
    const [{ data, error }, variants] = await Promise.all([
      supabase.from("products").select("*, category:categories(*)").in("id", ids),
      fetchVariantsFor(ids),
    ]);
    if (error) console.error(error);
    const products = (data as Product[]) ?? [];
    setItems(toCartItems(products, variants));
  }, []);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    setLoading(false);
    if (user) {
      // Merge guest cart on login
      const local = readLocal();
      if (local.length > 0) {
        Promise.all(
          local.map((l) =>
            supabase.from("cart_items").upsert(
              {
                user_id: user.id,
                product_id: l.product_id,
                quantity: l.quantity,
                size: l.size,
                color: l.color,
              },
              { onConflict: "user_id,product_id,size,color" },
            ),
          ),
        ).then(() => {
          localStorage.removeItem(STORAGE_KEY);
          loadServerCart();
        });
      } else {
        loadServerCart();
      }
    } else {
      loadLocalCart();
    }
  }, [user, authLoading, loadServerCart, loadLocalCart]);

  const add = async (product: Product, size: string, color: string, qty = 1, opts: { silent?: boolean } = {}) => {
    if (!user) {
      toast.error("Please login to add products to your cart.");
      const from = currentAppRoute();
      if (!from.startsWith("/auth")) navigate("/auth", { state: { from } });
      return false;
    }
    const variantSize = cleanVariantValue(size);
    const variantColor = cleanVariantValue(color);
    saveProductSnapshot(product);

    // 1. Fetch latest per-variant inventory (size + color independent)
    const variantStock = await fetchVariantStock(product.id, variantSize, variantColor);

    if (user) {
      // 2. Check existing cart quantity for this exact variant (merge — no duplicate lines)
      const existing = items.find(
        (i) => isSameCartLine(i, product.id, variantSize, variantColor),
      );
      const inCart = existing?.quantity ?? 0;
      const remaining = Math.max(0, variantStock - inCart);

      // 3. Validate requested quantity, trim if partial
      if (remaining <= 0) {
        toast.error(
          variantStock <= 0
            ? "Out of stock for this variant"
            : "Maximum available quantity already in cart",
        );
        return false;
      }
      const addQty = Math.min(qty, remaining);
      if (addQty < qty) {
        toast.warning(`Only ${remaining} more available — added ${addQty}.`);
      }

      // 4. Save cart (trigger is the final safety net → HTTP 400 on race)
      const { error } = existing
        ? await supabase.from("cart_items").update({ quantity: inCart + addQty }).eq("id", existing.id)
        : await supabase.from("cart_items").insert({
            user_id: user.id, product_id: product.id, quantity: addQty, size: variantSize, color: variantColor,
          });
      if (error) {
        toast.error(/stock/i.test(error.message)
          ? "Requested quantity exceeds available stock."
          : "Could not add to cart");
        return false;
      }
      await loadServerCart();
    } else {
      const local = readLocal();
      const snapshot = productSnapshot(product);
      const existing = local.find(
        (i) => isSameCartLine(i, product.id, variantSize, variantColor),
      );
      const inCart = existing?.quantity ?? 0;
      const remaining = Math.max(0, variantStock - inCart);
      if (remaining <= 0) {
        toast.error(
          variantStock <= 0
            ? "Out of stock for this variant"
            : "Maximum available quantity already in cart",
        );
        return false;
      }
      const addQty = Math.min(qty, remaining);
      if (addQty < qty) {
        toast.warning(`Only ${remaining} more available — added ${addQty}.`);
      }
      if (existing) {
        existing.quantity = inCart + addQty;
        existing.name = snapshot.name;
        existing.image = snapshot.image;
        existing.price = snapshot.price;
      } else {
        local.push({ ...snapshot, id: cartLineKey({ product_id: product.id, size: variantSize, color: variantColor }), quantity: addQty, size: variantSize, color: variantColor });
      }
      writeLocal(local);
      await loadLocalCart();
    }
    if (!opts.silent) toast.success("Added to cart 🛒");
    return true;
  };

  const updateQty = async (id: string, qty: number) => {
    if (qty < 1) return;
    // Optimistic update to avoid the loading flash when tapping +/- quickly
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));
    if (user && !id.startsWith("local-")) {
      const { error } = await supabase.from("cart_items").update({ quantity: qty }).eq("id", id);
      if (error) {
        console.error(error);
        if (/stock/i.test(error.message)) {
          toast.error("Requested quantity exceeds available stock.");
        }
        await loadServerCart();
      }
    } else {
      const local = readLocal();
      const idx = local.findIndex((l) => cartLineKey(l) === id);
      if (idx >= 0) {
        local[idx].quantity = qty;
        writeLocal(local);
      }
    }
  };

  const updateVariant = async (id: string, patch: { size?: string; color?: string }) => {
    const current = items.find((i) => i.id === id);
    if (!current) return;
    const newSize = cleanVariantValue(patch.size ?? current.size);
    const newColor = cleanVariantValue(patch.color ?? current.color);
    if (newSize === cleanVariantValue(current.size) && newColor === cleanVariantValue(current.color)) return;

    // Fetch variants to recompute the price for the new size/color combo
    const variants = await fetchVariantsFor([current.product_id]);
    const basePrice = Number(current.product?.price) || 0;
    const newPrice = resolveItemPrice(basePrice, newSize, newColor, variants);

    // Optimistic update — patch in place so the UI reflects the change immediately.
    // If another row already has the same product+size+color, merge quantities locally too.
    setItems((prev) => {
      const mergeTarget = prev.find(
        (i) => i.id !== id && isSameCartLine(i, current.product_id, newSize, newColor),
      );
      if (mergeTarget) {
        return prev
          .filter((i) => i.id !== id)
          .map((i) => (i.id === mergeTarget.id ? { ...i, quantity: i.quantity + current.quantity } : i));
      }
      return prev.map((i) =>
        i.id === id
          ? { ...i, size: newSize, color: newColor, product: { ...i.product, price: newPrice } }
          : i,
      );
    });

    if (user && !id.startsWith("local-")) {
      const merge = items.find(
        (i) => i.id !== id && isSameCartLine(i, current.product_id, newSize, newColor),
      );
      if (merge) {
        await supabase.from("cart_items").update({ quantity: merge.quantity + current.quantity }).eq("id", merge.id);
        await supabase.from("cart_items").delete().eq("id", id);
      } else {
        await supabase.from("cart_items").update({ size: newSize, color: newColor }).eq("id", id);
      }
      // Re-sync silently in the background (don't await — avoids any loading flicker).
      loadServerCart();
    } else {
      const local = readLocal();
      const idx = local.findIndex((l) => cartLineKey(l) === id);
      if (idx < 0) return;
      const mergeIdx = local.findIndex(
        (l, i) => i !== idx && isSameCartLine(l, local[idx].product_id, newSize, newColor),
      );
      if (mergeIdx >= 0) {
        local[mergeIdx].quantity += local[idx].quantity;
        local.splice(idx, 1);
      } else {
        local[idx].size = newSize;
        local[idx].color = newColor;
      }
      writeLocal(local);
    }
  };


  const remove = async (id: string) => {
    if (user && !id.startsWith("local-")) {
      await supabase.from("cart_items").delete().eq("id", id);
      await loadServerCart();
    } else {
      const local = readLocal();
      const idx = local.findIndex((l) => cartLineKey(l) === id);
      if (idx >= 0) {
        local.splice(idx, 1);
        writeLocal(local);
        await loadLocalCart();
      }
    }
  };

  const clear = async () => {
    if (user) {
      await supabase.from("cart_items").delete().eq("user_id", user.id);
      setItems([]);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setItems([]);
    }
  };

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.quantity * (i.product?.price ?? 0), 0);

  const getInCartQty = (productId: string, size?: string, color?: string) =>
    items
      .filter((i) =>
        i.product_id === productId &&
        (size === undefined || cleanVariantValue(i.size) === cleanVariantValue(size)) &&
        (color === undefined || cleanVariantValue(i.color) === cleanVariantValue(color)),
      )
      .reduce((s, i) => s + i.quantity, 0);

  const getAvailableStock = (productId: string, inventoryStock: number, size?: string, color?: string) =>
    Math.max(0, (inventoryStock ?? 0) - getInCartQty(productId, size, color));

  return (
    <CartContext.Provider value={{ items, loading, add, updateQty, updateVariant, remove, clear, count, subtotal, getInCartQty, getAvailableStock }}>
      {children}
    </CartContext.Provider>
  );
};



