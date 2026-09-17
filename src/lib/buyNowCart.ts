import type { CartItem, Product } from "@/lib/database.types";

export const BUY_NOW_CART_KEY = "th_buy_now_v1";

export type BuyNowCartItem = Pick<CartItem, "id" | "product_id" | "quantity" | "size" | "color"> & {
  user_id?: string;
  created_at?: string;
  product: Product;
};

type StoredBuyNowCart = {
  item: BuyNowCartItem;
  updatedAt: number;
};

const hasSessionStorage = () => typeof window !== "undefined" && !!window.sessionStorage;

export const clearBuyNowItem = () => {
  if (!hasSessionStorage()) return;
  window.sessionStorage.removeItem(BUY_NOW_CART_KEY);
};

export const replaceBuyNowItem = (item: BuyNowCartItem) => {
  if (!hasSessionStorage()) return;
  clearBuyNowItem();
  const payload: StoredBuyNowCart = { item, updatedAt: Date.now() };
  window.sessionStorage.setItem(BUY_NOW_CART_KEY, JSON.stringify(payload));
};

export const readBuyNowItem = (): BuyNowCartItem | null => {
  if (!hasSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(BUY_NOW_CART_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const item = parsed?.item ?? parsed;
    if (!item?.product_id || !item?.product) return null;
    return item as BuyNowCartItem;
  } catch {
    clearBuyNowItem();
    return null;
  }
};

export const getCheckoutItems = <TCartItem>(
  cartItems: TCartItem[],
  buyNowItem: TCartItem | null | undefined,
) => (buyNowItem ? [buyNowItem] : cartItems);

/**
 * Identity of the cart line promoted from the most recent Buy Now flow, so
 * the next Buy Now → Back can remove the prior temporary line and replace it
 * with only the latest Buy Now selection.
 */
export const BUY_NOW_CART_LINE_KEY = "th_buy_now_cart_line_v1";

export type BuyNowCartLine = { product_id: string; size: string; color: string };

const trim = (v: unknown) => String(v ?? "").trim();

export const setBuyNowCartLine = (line: BuyNowCartLine) => {
  if (!hasSessionStorage()) return;
  window.sessionStorage.setItem(
    BUY_NOW_CART_LINE_KEY,
    JSON.stringify({ product_id: line.product_id, size: trim(line.size), color: trim(line.color) }),
  );
};

export const readBuyNowCartLine = (): BuyNowCartLine | null => {
  if (!hasSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(BUY_NOW_CART_LINE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.product_id) return null;
    return { product_id: String(parsed.product_id), size: trim(parsed.size), color: trim(parsed.color) };
  } catch {
    return null;
  }
};

export const clearBuyNowCartLine = () => {
  if (!hasSessionStorage()) return;
  window.sessionStorage.removeItem(BUY_NOW_CART_LINE_KEY);
};