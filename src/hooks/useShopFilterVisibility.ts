import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FilterSectionKey =
  | "gender" | "age" | "price" | "category"
  | "occasion" | "color" | "size" | "availability";

export type FilterVisibilityRow = {
  id: string;
  section_key: FilterSectionKey;
  label: string;
  visible: boolean;
  sort_order: number;
};

const DEFAULTS: Record<FilterSectionKey, boolean> = {
  gender: false, age: false, price: true, category: true,
  occasion: true, color: true, size: true, availability: false,
};

export function useShopFilterVisibility() {
  const [map, setMap] = useState<Record<FilterSectionKey, boolean>>(DEFAULTS);
  const [rows, setRows] = useState<FilterVisibilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("shop_filter_visibility")
      .select("id, section_key, label, visible, sort_order")
      .order("sort_order");
    if (data) {
      const next = { ...DEFAULTS };
      (data as FilterVisibilityRow[]).forEach((r) => {
        next[r.section_key as FilterSectionKey] = r.visible;
      });
      setMap(next);
      setRows(data as FilterVisibilityRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();

    // Guard against duplicate channel registration which throws
    // "cannot add postgres_changes callbacks ... after subscribe()".
    if (channelRef.current) return;

    try {
      // Unique channel name per hook instance so parallel mounts
      // (drawer + sidebar, StrictMode double-invoke) never collide.
      const uniqueName = `shop_filter_visibility:${
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2)
      }`;
      const ch = supabase
        .channel(uniqueName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "shop_filter_visibility" },
          load,
        )
        .subscribe();
      channelRef.current = ch;
    } catch (err) {
      // Never let a realtime failure crash the React tree.
      console.error("shop_filter_visibility realtime subscribe failed:", err);
    }

    return () => {
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current); } catch { /* ignore */ }
        channelRef.current = null;
      }
    };
  }, []);

  return { map, rows, loading, reload: load };
}
