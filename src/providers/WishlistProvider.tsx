import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import type { Product } from "@/lib/database.types";
import { toast } from "sonner";

type WishlistContextValue = {
  productIds: Set<string>;
  toggle: (product: Product) => Promise<void>;
  items: { id: string; product: Product }[];
  refresh: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<{ id: string; product: Product }[]>([]);
  const [productIds, setProductIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setProductIds(new Set());
      return;
    }
    const { data } = await supabase
      .from("wishlist")
      .select("id, product:products(*)")
      .eq("user_id", user.id);
    const list = ((data as any) ?? []).filter((r: any) => r.product) as {
      id: string;
      product: Product;
    }[];
    setItems(list);
    setProductIds(new Set(list.map((i) => i.product.id)));
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = async (product: Product) => {
    if (!user) {
      toast.error("Please sign in to use your wishlist");
      return;
    }
    const alreadyWished = productIds.has(product.id);

    // Optimistic UI — flip the heart immediately so the user sees the change.
    setProductIds((prev) => {
      const next = new Set(prev);
      if (alreadyWished) next.delete(product.id);
      else next.add(product.id);
      return next;
    });
    if (alreadyWished) {
      setItems((prev) => prev.filter((i) => i.product.id !== product.id));
    } else {
      setItems((prev) =>
        prev.some((i) => i.product.id === product.id)
          ? prev
          : [...prev, { id: `optimistic-${product.id}`, product }],
      );
    }

    // Supabase reports failures via `error` instead of throwing, so check it
    // explicitly; refresh() below rolls the optimistic change back on failure.
    const { error } = alreadyWished
      ? await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", product.id)
      : await supabase.from("wishlist").insert({ user_id: user.id, product_id: product.id });
    if (error) toast.error("Couldn't update wishlist");
    else toast.success(alreadyWished ? "Removed from wishlist" : "Added to wishlist 💕");
    refresh();
  };

  return (
    <WishlistContext.Provider value={{ productIds, toggle, items, refresh }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
};
