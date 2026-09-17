import { createContext, useContext } from "react";
import type { CartItem, Product } from "@/lib/database.types";

export type CartContextValue = {
  items: (CartItem & { product: Product })[];
  loading: boolean;
  /** Resolves to true only when the item was actually saved to the cart. */
  add: (product: Product, size: string, color: string, qty?: number, opts?: { silent?: boolean }) => Promise<boolean>;
  updateQty: (id: string, qty: number) => Promise<void>;
  updateVariant: (id: string, patch: { size?: string; color?: string }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  count: number;
  subtotal: number;
  /** Live total quantity for a product in the cart. If size/color are passed, scopes to that variant. */
  getInCartQty: (productId: string, size?: string, color?: string) => number;
  /** Live available stock = inventory - quantity already in cart. */
  getAvailableStock: (productId: string, inventoryStock: number, size?: string, color?: string) => number;
};

export const CartContext = createContext<CartContextValue | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};
