import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "@/lib/resolveImage";

export type ImageSlot = {
  image: string;
  title?: string;
  subtitle?: string;
  href?: string;
  ctaLabel?: string;
};

/**
 * Fetches admin-managed images for a group_key from homepage_banners.
 * If the admin has added rows for this group, those replace the fallback.
 * Otherwise the hard-coded fallback list is used as-is.
 */
export function useImageGroup(groupKey: string, fallback: ImageSlot[]) {
  const { data } = useQuery({
    queryKey: ["image-group", groupKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_banners")
        .select("title, subtitle, image_desktop, image_mobile, cta_url, cta_label, sort_order, visible")
        .eq("group_key", groupKey)
        .eq("visible", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  if (!data || data.length === 0) return fallback;

  return data
    .filter((r: any) => r.image_desktop || r.image_mobile)
    .map((r: any) => ({
      image: resolveImage(r.image_desktop || r.image_mobile || ""),
      title: r.title ?? undefined,
      subtitle: r.subtitle ?? undefined,
      href: r.cta_url ?? undefined,
      ctaLabel: r.cta_label ?? undefined,
    }));
}

/**
 * Index-merge variant: for each fallback entry, if the admin uploaded an image
 * at the same index, override the image/title/subtitle/href/ctaLabel fields while
 * preserving the rest of the fallback's structure (styling, decorative metadata).
 */
export function useImageGroupOverlay<T extends { image: string; href?: string; title?: string; subtitle?: string; ctaLabel?: string }>(
  groupKey: string,
  fallback: T[],
  apply?: (fb: T, slot: ImageSlot) => T,
): T[] {
  const slots = useImageGroup(groupKey, []);
  if (!slots || slots.length === 0) return fallback;
  return fallback.map((fb, i) => {
    const slot = slots[i];
    if (!slot) return fb;
    if (apply) return apply(fb, slot);
    return {
      ...fb,
      image: slot.image || fb.image,
      ...(slot.href ? { href: slot.href } : {}),
      ...(slot.title ? { title: slot.title } : {}),
      ...(slot.subtitle ? { subtitle: slot.subtitle } : {}),
      ...(slot.ctaLabel ? { ctaLabel: slot.ctaLabel } : {}),
    };
  });
}

/**
 * Global bridge: subscribes to realtime changes on homepage_banners and
 * invalidates every image-group query so the storefront refreshes instantly
 * whenever an admin saves a change. Mount once at app root.
 */
export function useImageGroupRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("homepage_banners_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "homepage_banners" },
        () => qc.invalidateQueries({ queryKey: ["image-group"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}
