import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, ExternalLink, Link2, Search } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

type Cat = { id: string; name: string; slug: string; parent_id: string | null };

/**
 * Common static destinations across the storefront. These map labels users
 * understand ("Wedding sarees", "Silk Sarees") to the actual URL paths.
 */
const QUICK_LINKS: { label: string; path: string; hint?: string }[] = [
  { label: "Home page", path: "/" },
  { label: "Shop — All sarees", path: "/shop" },
  { label: "New arrivals", path: "/new" },
  { label: "Best sellers", path: "/shop?sort=popular" },
  { label: "Silk Sarees", path: "/category/silk-sarees" },
  { label: "Cotton & Handloom", path: "/category/handloom-sarees" },
  { label: "Designer Sarees", path: "/category/designer-sarees" },
  { label: "Wedding sarees", path: "/occasion/wedding" },
  { label: "Festive sarees", path: "/occasion/festive" },
  { label: "Party wear sarees", path: "/occasion/party" },
  { label: "Office wear sarees", path: "/occasion/office-wear" },
  { label: "Daily wear sarees", path: "/occasion/daily-wear" },
  { label: "Blog", path: "/blog" },
  { label: "About us", path: "/about" },
  { label: "Contact", path: "/contact" },
];

/**
 * A friendly picker for the "where should this banner link to?" field.
 * Admins pick from real categories / known pages instead of guessing URLs,
 * but they can still paste a custom URL if needed.
 */
export const LinkPicker = ({
  value,
  onChange,
  placeholder = "Pick a destination or paste a URL",
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const { data: cats = [] } = useQuery({
    queryKey: ["linkpicker-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id")
        .eq("visible", true)
        .order("name");
      return (data ?? []) as Cat[];
    },
    staleTime: 60_000,
  });

  const nameById = useMemo(() => {
    const m = new Map<string, Cat>();
    cats.forEach((c) => m.set(c.id, c));
    return m;
  }, [cats]);

  const labelFor = (c: Cat) => {
    const parts: string[] = [c.name];
    let p = c.parent_id;
    let guard = 0;
    while (p && guard++ < 5) {
      const parent = nameById.get(p);
      if (!parent) break;
      parts.unshift(parent.name);
      p = parent.parent_id;
    }
    return parts.join(" › ");
  };

  const categoryOptions = useMemo(
    () =>
      cats
        .map((c) => ({ label: labelFor(c), path: `/category/${c.slug}` }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [cats, nameById],
  );

  const allOptions = useMemo(
    () => [...QUICK_LINKS, ...categoryOptions],
    [categoryOptions],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return allOptions;
    return allOptions.filter(
      (o) => o.label.toLowerCase().includes(s) || o.path.toLowerCase().includes(s),
    );
  }, [allOptions, q]);

  const currentLabel = useMemo(() => {
    if (!value) return "";
    const match = allOptions.find((o) => o.path === value);
    return match ? match.label : "";
  }, [value, allOptions]);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between font-normal h-10"
          >
            <span className="flex items-center gap-2 truncate">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {currentLabel ? (
                <span className="truncate">
                  <span className="font-medium">{currentLabel}</span>
                  <span className="text-muted-foreground"> — {value}</span>
                </span>
              ) : value ? (
                <span className="truncate text-foreground">{value}</span>
              ) : (
                <span className="text-muted-foreground">Pick where this banner should go…</span>
              )}
            </span>
            <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(28rem,90vw)] p-0" align="start">
          <div className="p-2 border-b sticky top-0 bg-popover">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search pages or categories…"
                className="h-9 pl-8"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {!q && (
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Popular pages
              </div>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                Nothing matches "{q}". You can also paste a custom URL below.
              </div>
            ) : (
              filtered.map((opt) => {
                const active = opt.path === value;
                return (
                  <button
                    key={opt.path}
                    type="button"
                    onClick={() => {
                      onChange(opt.path);
                      setOpen(false);
                      setQ("");
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium truncate">{opt.label}</span>
                      <span className="block text-[11px] text-muted-foreground truncate">{opt.path}</span>
                    </span>
                    {active && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-2">
        <Input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 text-xs"
        />
        {value && (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1 shrink-0"
            title="Open in new tab"
          >
            Test <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Pick a page or category from the list above — that's where users go when they tap this banner.
        You can also type a custom path like <code className="px-1 rounded bg-muted">/birthday-bash</code> or a full URL.
      </p>
    </div>
  );
};
