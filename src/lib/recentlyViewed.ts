import { resolveImage } from "@/lib/resolveImage";
import type { Product } from "@/lib/database.types";

export type RecentlyViewedItem = {
  id: string;
  name: string;
  price: number;
  image: string;
};

const KEY = "recently_viewed_products";
const MAX = 8;
const EVENT = "recently-viewed-updated";

export const getRecentlyViewed = (): RecentlyViewedItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, MAX) : [];
  } catch {
    return [];
  }
};

export const trackRecentlyViewed = (product: Pick<Product, "id" | "name" | "price" | "images">) => {
  if (typeof window === "undefined" || !product?.id) return;
  const item: RecentlyViewedItem = {
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.images?.[0] || resolveImage(),
  };
  const current = getRecentlyViewed().filter((p) => p.id !== item.id);
  const next = [item, ...current].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* noop */
  }
};

export const subscribeRecentlyViewed = (cb: () => void) => {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
};
