import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/database.types";

type Opts = {
  sectionKey?: string;
  gender?: string;
  collection?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  limit?: number;
};

/**
 * Fetches products from Supabase filtered by section_key/gender/collection/flags.
 * Used by every homepage section so newly-added admin products appear instantly.
 */
export const useSectionProducts = (opts: Opts) => {
  const { sectionKey, gender, collection, isFeatured, isNew, isTrending, limit = 12 } = opts;
  return useQuery({
    queryKey: ["section-products", sectionKey, gender, collection, isFeatured, isNew, isTrending, limit],
    queryFn: async () => {
      const aliasMap: Record<string, string[]> = {
        women: ["women", "woman", "female", "ladies"],
      };
      let q = supabase
        .from("products")
        .select("*")
        .eq("status", "active");
      if (sectionKey) q = q.contains("section_keys", [sectionKey]);
      if (gender) {
        const aliases = aliasMap[gender] ?? [gender];
        // Also match products whose category (or category ancestor) has matching gender,
        // since admin sometimes leaves product.gender unset / inconsistent.
        const { data: cats } = await supabase
          .from("categories")
          .select("id,gender,name,slug")
          .in("gender", aliases);
        const catIds = (cats ?? []).map((c: any) => c.id);
        if (catIds.length) {
          const inList = aliases.map((a) => `"${a}"`).join(",");
          const idList = catIds.join(",");
          q = q.or(`gender.in.(${inList}),category_id.in.(${idList})`);
        } else {
          q = q.in("gender", aliases);
        }
      }
      if (collection) q = q.eq("collection", collection);
      if (isFeatured) q = q.eq("is_featured", true);
      if (isNew) q = q.eq("is_new", true);
      if (isTrending) q = q.eq("is_trending", true);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return (data as Product[]) ?? [];
    },
    staleTime: 30_000,
  });
};


/**
 * Subscribe to ALL product/category/section changes once at app root and
 * invalidate React-Query caches so the UI refreshes instantly after admin edits.
 */
export const useRealtimeProductsSync = () => {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("realtime-catalog")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        qc.invalidateQueries({ queryKey: ["section-products"] });
        qc.invalidateQueries({ queryKey: ["products"] });
        qc.invalidateQueries({ queryKey: ["featured-products"] });
        qc.invalidateQueries({ queryKey: ["related"] });
        qc.invalidateQueries({ queryKey: ["product"] });
        qc.invalidateQueries({ queryKey: ["admin-products"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "product_variants" }, () => {
        qc.invalidateQueries({ queryKey: ["products"] });
        qc.invalidateQueries({ queryKey: ["product"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => {
        qc.invalidateQueries({ queryKey: ["categories"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "homepage_sections" }, () => {
        qc.invalidateQueries({ queryKey: ["homepage-sections"] });
        qc.invalidateQueries({ queryKey: ["admin-homepage-sections"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "homepage_banners" }, () => {
        qc.invalidateQueries({ queryKey: ["public-banners"] });
        qc.invalidateQueries({ queryKey: ["section-banners"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "section_products" }, () => {
        qc.invalidateQueries({ queryKey: ["public-section-products"] });
        qc.invalidateQueries({ queryKey: ["section-products-admin"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "section_categories" }, () => {
        qc.invalidateQueries({ queryKey: ["public-section-cats"] });
        qc.invalidateQueries({ queryKey: ["section-categories-admin"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "homepage_settings" }, () => {
        qc.invalidateQueries({ queryKey: ["homepage-settings"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
};
