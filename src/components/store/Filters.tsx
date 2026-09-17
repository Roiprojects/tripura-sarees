import React, { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ChevronDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { colorKey, getColorCss } from "@/lib/colorUtils";

export function FilterSection({
  label, children, defaultOpen = true,
}: { label: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/60 py-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between font-semibold text-sm"
      >
        <span>{label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pt-3">{children}</div>}
    </div>
  );
}

export type CatNode = { id: string; name: string; children?: CatNode[] };
export function CategoryTree({
  nodes, selected, onToggle, depth = 0,
}: { nodes: CatNode[]; selected: string[]; onToggle: (id: string) => void; depth?: number }) {
  return (
    <div className="space-y-1.5">
      {nodes.map(n => {
        const hasKids = !!n.children?.length;
        return (
          <div key={n.id} style={{ paddingLeft: depth * 12 }}>
            <label
              className={`flex items-center gap-2 cursor-pointer py-1 transition-colors ${
                depth === 0
                  ? "text-sm font-semibold text-foreground hover:text-primary"
                  : "text-sm text-muted-foreground hover:text-foreground"
              }`}
            >
              <Checkbox
                checked={selected.includes(n.id)}
                onCheckedChange={() => onToggle(n.id)}
              />
              <span>{n.name}</span>
            </label>
            {hasKids && (
              <CategoryTree
                nodes={n.children!}
                selected={selected}
                onToggle={onToggle}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FiltersPanel(props: {
  sizes: string[]; setSizes: (v: string[]) => void;
  colors: string[]; setColors: (v: string[]) => void;
  genders?: string[]; setGenders?: (v: string[]) => void;
  catFilters: string[]; setCatFilters: (v: string[]) => void;
  ages?: string[]; setAges?: (v: string[]) => void;
  occasions?: string[]; setOccasions?: (v: string[]) => void;
  price: [number, number]; setPrice: (v: [number, number]) => void; maxPrice: number;
  inStockOnly: boolean; setInStockOnly: (v: boolean) => void;
  preorderOnly?: boolean; setPreorderOnly?: (v: boolean) => void;
  sizeFacet: string[]; colorFacet: string[];
  genderFacet?: string[];
  categoryFacet: CatNode[];
  ageFacet?: string[]; occasionFacet?: string[];
  onClearAll: () => void;
}) {
  const [colorHexByName, setColorHexByName] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("product_color_variants")
      .select("color_name, hex_code")
      .then(({ data }) => {
        if (!cancelled && data) {
          setColorHexByName(
            new Map(
              (data as { color_name: string; hex_code: string | null }[])
                .filter((c) => c.color_name && c.hex_code)
                .map((c) => [colorKey(c.color_name), c.hex_code as string]),
            ),
          );
        }
      });
    return () => { cancelled = true; };
  }, []);

  const toggle = (arr: string[], v: string, set: (x: string[]) => void) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  const Row = ({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (v: string) => void }) => (
    <div className="space-y-2">
      {items.map(v => (
        <label key={v} className="flex items-center gap-2 cursor-pointer text-sm">
          <Checkbox checked={selected.includes(v)} onCheckedChange={() => onToggle(v)} />
          <span className="capitalize">{v}</span>
        </label>
      ))}
    </div>
  );

  // Sections are numbered in the order they are shown.
  let sectionNo = 0;
  const heading = (label: string) => {
    sectionNo += 1;
    return (
      <span className="font-display font-bold text-sm text-primary">
        {sectionNo}. {label}
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 text-sm">
      <div className="flex items-center justify-between pb-2">
        <h3 className="font-display text-lg font-bold">Filters</h3>
        <button onClick={props.onClearAll} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
          <X className="w-3 h-3" /> Reset
        </button>
      </div>

      {props.genderFacet && props.genders && props.setGenders && props.genderFacet.length > 0 && (
        <FilterSection label={heading("Gender")}>
          <Row items={props.genderFacet} selected={props.genders}
            onToggle={(v) => toggle(props.genders!, v, props.setGenders!)} />
        </FilterSection>
      )}

      <FilterSection label={heading("Price")}>
        <Slider min={0} max={Math.max(props.maxPrice, 1)} step={50}
          value={props.price} onValueChange={(v) => props.setPrice(v as any)} />
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1">
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Min</label>
            <input
              type="number"
              min={0}
              max={props.maxPrice}
              value={props.price[0]}
              onChange={(e) => {
                const n = Math.max(0, Math.min(Number(e.target.value) || 0, props.price[1]));
                props.setPrice([n, props.price[1]]);
              }}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
            />
          </div>
          <span className="text-muted-foreground mt-4">—</span>
          <div className="flex-1">
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Max</label>
            <input
              type="number"
              min={0}
              max={props.maxPrice}
              value={props.price[1]}
              onChange={(e) => {
                const n = Math.max(props.price[0], Math.min(Number(e.target.value) || 0, props.maxPrice));
                props.setPrice([props.price[0], n]);
              }}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
            />
          </div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>₹{props.price[0]}</span><span>₹{props.price[1]}</span>
        </div>
      </FilterSection>


      {props.categoryFacet.length > 0 && (
        <FilterSection label={heading("Weave")}>
          <CategoryTree
            nodes={props.categoryFacet}
            selected={props.catFilters}
            onToggle={(id) => {
              // Selecting a child auto-selects its ancestors so the main
              // category checkbox reflects the drilled-in choice.
              const parentOf = new Map<string, string | null>();
              const walk = (nodes: CatNode[], parent: string | null) => {
                for (const n of nodes) {
                  parentOf.set(n.id, parent);
                  if (n.children?.length) walk(n.children, n.id);
                }
              };
              walk(props.categoryFacet, null);
              if (props.catFilters.includes(id)) {
                props.setCatFilters(props.catFilters.filter((x) => x !== id));
              } else {
                const next = new Set(props.catFilters);
                next.add(id);
                let pid = parentOf.get(id) ?? null;
                while (pid) { next.add(pid); pid = parentOf.get(pid) ?? null; }
                props.setCatFilters(Array.from(next));
              }
            }}
          />
        </FilterSection>
      )}

      {props.occasionFacet && props.occasions && props.setOccasions && props.occasionFacet.length > 0 && (
        <FilterSection label={heading("Occasion")}>
          <Row items={props.occasionFacet} selected={props.occasions}
            onToggle={(v) => toggle(props.occasions!, v, props.setOccasions!)} />
        </FilterSection>
      )}

      {props.colorFacet.length > 0 && (
        <FilterSection label={heading("Colour")}>
          <div className="flex flex-wrap gap-2">
            {props.colorFacet.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                aria-label={c}
                aria-pressed={props.colors.includes(c)}
                onClick={() => toggle(props.colors, c, props.setColors)}
                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                  props.colors.includes(c) ? "border-primary scale-110" : "border-border"
                }`}
                style={{ background: getColorCss(c, colorHexByName.get(colorKey(c))) }}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {props.sizeFacet.length > 0 && (
        <FilterSection label={heading("Blouse Size")}>
          <div className="flex flex-wrap gap-2">
            {props.sizeFacet.map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => toggle(props.sizes, sz, props.setSizes)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  props.sizes.includes(sz)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary"
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

    </div>
  );
}

export async function collectDescendantIds(rootId: string): Promise<string[]> {
  const { data } = await supabase.from("categories").select("id,parent_id");
  const all = data ?? [];
  const out = new Set<string>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const c of all) {
      if (c.parent_id && out.has(c.parent_id) && !out.has(c.id)) {
        out.add(c.id); added = true;
      }
    }
  }
  return Array.from(out);
}
