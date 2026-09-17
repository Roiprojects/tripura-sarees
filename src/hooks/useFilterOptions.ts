import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FilterField = "collection" | "gender" | "brand" | "age" | "size" | "color" | (string & {});

export function useFilterOptions(field: FilterField) {
  const [values, setValues] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (supabase as any)
      .from("filter_options")
      .select("value, sort_order, active")
      .eq("field", field)
      .eq("active", true)
      .order("sort_order")
      .then(({ data }: any) => {
        if (!cancelled && data) {
          setValues(data.map((r: any) => r.value as string));
        }
      });
    return () => { cancelled = true; };
  }, [field]);

  return values;
}

/**
 * Gender-scoped filter options. Returns admin-configured values that are
 * either shared (gender IS NULL) or scoped to any of the passed genders.
 * If `genders` is empty, returns ALL active values for the field.
 */
export function useFilterOptionsByGender(field: FilterField, genders: string[]) {
  const [values, setValues] = useState<string[]>([]);
  const key = genders.map((g) => g.toLowerCase()).sort().join(",");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = (supabase as any)
        .from("filter_options")
        .select("value, sort_order, active, gender")
        .eq("field", field)
        .eq("active", true)
        .order("sort_order");
      const { data } = await q;
      if (cancelled || !data) return;
      const norm = key ? new Set(key.split(",")) : null;
      const filtered = (data as any[]).filter((r) => {
        const g = (r.gender ?? "").toLowerCase();
        if (!norm) return true;
        if (!g) return true; // shared
        return norm.has(g);
      });
      // Dedupe preserving order
      const seen = new Set<string>();
      const out: string[] = [];
      for (const r of filtered) {
        const v = String(r.value);
        const k = v.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(v);
      }
      setValues(out);
    })();
    return () => { cancelled = true; };
  }, [field, key]);

  return values;
}
