import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wand2, Grid3x3, AlertTriangle, Plus, Trash2, Palette } from "lucide-react";

export type ComboVariant = {
  size: string;
  color_name: string;
  sku_code: string;
  design_id: string;
  stock_quantity: number;
  variant_price: number | null;
  discount_percent?: number | null;
};


type ColorOpt = { color_name: string; hex_code: string };

type Props = {
  sizes: string[];
  colors: ColorOpt[];
  basePrice: number;
  baseSku: string;
  variants: ComboVariant[];
  onChange: (v: ComboVariant[]) => void;
  onSizesChange?: (sizes: string[]) => void;
  onColorsChange?: (colors: ColorOpt[]) => void;
};

const slugSku = (s: string) =>
  s.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const SIZE_SUGGESTIONS = [
  "XS", "S", "M", "L", "XL", "XXL", "3XL",
  "10(0-3 m)", "12(3-6m)", "14(6-12m)", "16(12-18m)", "18(18-24m)",
  "20(2-3y)", "22(3-4y)", "24(4-5y)", "26(5-6y)", "28(6-7y)",
  "30(7-8y)", "32(8-9y)", "34(9-10y)", "36(10-12y)", "38(12-14y)",
  "preme", "nb", "0000", "000", "00", "0",
  "1-2", "2-3", "3-4", "4-5", "5-6", "6-7", "7-8", "8-9", "9-10", "10-12", "12-14", "6-8", "8-10",
  "50", "55", "60", "65", "70", "75", "80",
  "Free Size",
];


export const SizeColorMatrix = ({
  sizes,
  colors,
  basePrice,
  baseSku,
  variants,
  onChange,
  onSizesChange,
  onColorsChange,
}: Props) => {
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newColorHex, setNewColorHex] = useState("#F4A6B8");
  const [groupBy, setGroupBy] = useState<"color" | "size">("color");
  // Per-color size membership: which sizes belong to which color.
  // Lets the admin add a new size to ONE color without it appearing under other colors.
  const [colorSizes, setColorSizes] = useState<Record<string, string[]>>({});
  const [newSizeBy, setNewSizeBy] = useState<Record<string, string>>({});

  // Build a key map for quick lookup
  const keyOf = (s: string, c: string) => `${s}__${c}`;
  const byKey = useMemo(
    () => new Map(variants.map((v) => [keyOf(v.size, v.color_name), v])),
    [variants],
  );

  // Initialise / clean up the per-color size map whenever colors or global sizes change.
  // - A brand-new color starts off with sizes it already has variants for (or all global sizes if none yet).
  // - Removing a color drops its entry.
  // - Removing a global size also removes it from every color that owned it.
  useEffect(() => {
    setColorSizes((prev) => {
      const next: Record<string, string[]> = {};
      for (const c of colors) {
        const existing = prev[c.color_name];
        if (existing) {
          next[c.color_name] = existing.filter((s) => sizes.includes(s));
        } else {
          const fromVariants = variants
            .filter((v) => v.color_name === c.color_name)
            .map((v) => v.size)
            .filter((s) => sizes.includes(s));
          next[c.color_name] = fromVariants.length ? Array.from(new Set(fromVariants)) : [...sizes];
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors.map((c) => c.color_name).join("|"), sizes.join("|")]);

  // Keep variant list in sync with (color × that color's own sizes).
  useEffect(() => {
    const next: ComboVariant[] = [];
    for (const c of colors) {
      const csz = colorSizes[c.color_name] ?? sizes;
      for (const s of csz) {
        const existing = byKey.get(keyOf(s, c.color_name));
        next.push(
          existing ?? {
            size: s,
            color_name: c.color_name,
            sku_code: "",
            design_id: "",
            stock_quantity: 0,
            variant_price: null,
            discount_percent: 0,
          },
        );
      }
    }
    const sameLen = next.length === variants.length;
    const sameContent =
      sameLen &&
      next.every(
        (v, i) =>
          variants[i]?.size === v.size && variants[i]?.color_name === v.color_name,
      );
    if (!sameContent) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    colors.map((c) => c.color_name).join("|"),
    Object.entries(colorSizes).map(([k, v]) => `${k}:${v.join(",")}`).join("|"),
  ]);

  const update = (size: string, color: string, patch: Partial<ComboVariant>) => {
    const exists = variants.some(
      (v) => v.size === size && v.color_name === color,
    );
    if (exists) {
      onChange(
        variants.map((v) =>
          v.size === size && v.color_name === color ? { ...v, ...patch } : v,
        ),
      );
    } else {
      // Row was rendered from a fallback (variant not yet in state) — append it
      // so user edits like SKU code / design id / stock / price actually persist.
      onChange([
        ...variants,
        {
          size,
          color_name: color,
          sku_code: "",
          design_id: "",
          stock_quantity: 0,
          variant_price: null,
          discount_percent: 0,
          ...patch,
        },
      ]);
      // Make sure this size is tracked under that color so the row keeps rendering.
      setColorSizes((prev) => {
        const cur = prev[color] ?? [];
        if (cur.includes(size)) return prev;
        return { ...prev, [color]: [...cur, size] };
      });
    }
  };

  const autoSku = (size: string, color: string) => {
    const root = slugSku(baseSku || "SKU");
    update(size, color, {
      sku_code: `${root}-${slugSku(color)}-${slugSku(size)}`,
    });
  };

  const autoSkuAll = () => {
    const root = slugSku(baseSku || "SKU");
    onChange(
      variants.map((v) => ({
        ...v,
        sku_code:
          v.sku_code || `${root}-${slugSku(v.color_name)}-${slugSku(v.size)}`,
      })),
    );
  };

  const fillStockAll = (n: number) =>
    onChange(variants.map((v) => ({ ...v, stock_quantity: Math.max(0, n) })));

  const fillPriceAll = (n: number | null) =>
    onChange(variants.map((v) => ({ ...v, variant_price: n })));

  const addSize = () => {
    const s = newSize.trim();
    if (!s || sizes.includes(s) || !onSizesChange) return;
    onSizesChange([...sizes, s]);
    setNewSize("");
  };

  const removeSize = (size: string) => {
    if (!onSizesChange) return;
    onSizesChange(sizes.filter((s) => s !== size));
  };

  // Add a size to a single color only — does not propagate to other colors.
  const addSizeForColor = (colorName: string, sizeRaw: string) => {
    const s = (sizeRaw ?? "").trim();
    if (!s) return;
    setColorSizes((prev) => {
      const cur = prev[colorName] ?? [];
      if (cur.includes(s)) return prev;
      return { ...prev, [colorName]: [...cur, s] };
    });
    if (!sizes.includes(s) && onSizesChange) onSizesChange([...sizes, s]);
    setNewSizeBy((prev) => ({ ...prev, [colorName]: "" }));
  };

  // Remove a size from a single color. If no other color still uses it, drop it from the global list too.
  const removeSizeForColor = (colorName: string, size: string) => {
    setColorSizes((prev) => {
      const next = { ...prev, [colorName]: (prev[colorName] ?? []).filter((s) => s !== size) };
      const stillUsed = Object.entries(next).some(([k, list]) => k !== colorName && list.includes(size))
        || next[colorName].includes(size);
      if (!stillUsed && onSizesChange) onSizesChange(sizes.filter((s) => s !== size));
      return next;
    });
  };

  const addColor = () => {
    const name = newColor.trim();
    if (!name || !onColorsChange) return;
    if (colors.some((c) => c.color_name.toLowerCase() === name.toLowerCase())) return;
    onColorsChange([...colors, { color_name: name, hex_code: newColorHex || "#cccccc" }]);
    setNewColor("");
  };

  const removeColor = (name: string) => {
    if (!onColorsChange) return;
    onColorsChange(colors.filter((c) => c.color_name !== name));
  };

  const renameColor = (oldName: string) => {
    if (!onColorsChange) return;
    const next = prompt("Rename color:", oldName)?.trim();
    if (!next || next === oldName) return;
    if (colors.some((c) => c.color_name.toLowerCase() === next.toLowerCase())) return;
    onColorsChange(colors.map((c) => (c.color_name === oldName ? { ...c, color_name: next } : c)));
    onChange(variants.map((v) => (v.color_name === oldName ? { ...v, color_name: next } : v)));
  };

  const recolorColor = (name: string, hex: string) => {
    if (!onColorsChange) return;
    onColorsChange(colors.map((c) => (c.color_name === name ? { ...c, hex_code: hex } : c)));
  };

  const renameSize = (oldSize: string) => {
    if (!onSizesChange) return;
    const next = prompt("Rename size:", oldSize)?.trim();
    if (!next || next === oldSize) return;
    if (sizes.includes(next)) return;
    onSizesChange(sizes.map((s) => (s === oldSize ? next : s)));
    onChange(variants.map((v) => (v.size === oldSize ? { ...v, size: next } : v)));
  };

  const totalStock = variants.reduce(
    (s, v) => s + (Number(v.stock_quantity) || 0),
    0,
  );
  const missing = variants.filter((v) => !v.sku_code.trim()).length;

  if (sizes.length === 0 || colors.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 space-y-4">
        <div className="text-center">
          <Grid3x3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">
            Add main sizes and at least one color to enable the product variant table
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Every selected size will open color rows with separate SKU, price and stock.
          </p>
        </div>
        {onSizesChange && (
          <div className="max-w-md mx-auto flex gap-2">
            <Input
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSize();
                }
              }}
              placeholder="Add main size (e.g. 28, 30, 3-4Y)"
              className="h-9 text-sm bg-white"
            />
            <Button type="button" variant="outline" size="sm" onClick={addSize} className="h-9 gap-1">
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-100 px-4 py-2.5">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-semibold text-slate-700">
            {variants.length} SKU{variants.length === 1 ? "" : "s"}
          </span>
          <span className="text-slate-500">
            Total stock: <strong className="text-slate-800">{totalStock}</strong>
          </span>
          {missing > 0 && (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <AlertTriangle className="w-3 h-3" />
              {missing} missing SKU
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={autoSkuAll}
          >
            <Wand2 className="w-3 h-3" /> Auto-SKU all
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              const n = Number(prompt("Set stock for ALL combos to:", "10"));
              if (!Number.isNaN(n)) fillStockAll(n);
            }}
          >
            Fill stock
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              const raw = prompt(
                "Set price for ALL combos (leave blank to clear and use base price):",
                basePrice ? String(basePrice) : "",
              );
              if (raw === null) return;
              const n = raw.trim() === "" ? null : Number(raw);
              if (n === null || !Number.isNaN(n)) fillPriceAll(n);
            }}
          >
            Fill price
          </Button>
        </div>

      </div>

      {/* Base price reference */}
      <div className="rounded-lg border border-violet-100 bg-violet-50/50 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-slate-600">
          Base product price (used when a combo price is left blank):
        </span>
        <span className="text-base font-bold text-violet-700">
          ₹{basePrice || 0}
        </span>
      </div>

      {/* Main size selector inside the variant table */}
      {onSizesChange && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Palette className="w-3.5 h-3.5 text-violet-600" />
            Main size options for this product
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-600 text-white text-xs font-semibold">
                {s}
                <button type="button" onClick={() => removeSize(s)} className="hover:bg-white/20 rounded-full w-4 h-4 leading-none">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 max-w-md">
            <Input
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSize();
                }
              }}
              placeholder="Add another size to this product"
              className="h-9 text-sm bg-white"
            />
            <Button type="button" variant="outline" size="sm" onClick={addSize} className="h-9 gap-1">
              <Plus className="w-3.5 h-3.5" /> Add size
            </Button>
          </div>
        </div>
      )}

      <datalist id="size-suggestions">
        {SIZE_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* View grouping toggle */}
      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <span className="text-xs font-semibold text-slate-600">Group variants by</span>
        <div className="inline-flex rounded-md border border-slate-200 overflow-hidden bg-slate-50">
          <button
            type="button"
            onClick={() => setGroupBy("color")}
            className={`px-3 py-1 text-xs font-semibold transition ${
              groupBy === "color" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-white"
            }`}
          >
            Color → Sizes
          </button>
          <button
            type="button"
            onClick={() => setGroupBy("size")}
            className={`px-3 py-1 text-xs font-semibold transition ${
              groupBy === "size" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-white"
            }`}
          >
            Size → Colors
          </button>
        </div>
      </div>

      {/* Matrix grouped by SIZE — one column per size with all colors inside */}
      {groupBy === "size" && (
      <div className="grid 2xl:grid-cols-2 gap-3">
        {sizes.map((s) => {
          const rows = colors.map((c) =>
            byKey.get(keyOf(s, c.color_name)) ?? {
              size: s,
              color_name: c.color_name,
              sku_code: "",
              design_id: "",
              stock_quantity: 0,
              variant_price: null,
            },
          );
          const sizeTotal = rows.reduce((acc, v) => acc + (Number(v.stock_quantity) || 0), 0);
          return (
            <div key={s} className="min-w-0 rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-b">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => onSizesChange && renameSize(s)}
                    title={onSizesChange ? "Rename size" : undefined}
                    className="inline-flex items-center justify-center min-w-[2.75rem] px-3 py-1 rounded-full bg-violet-600 text-white text-xs font-bold shadow-sm hover:bg-violet-700 transition"
                  >
                    {s}
                  </button>
                  <div className="text-[11px] text-slate-500">
                    {colors.length} color{colors.length === 1 ? "" : "s"} · stock {sizeTotal}
                  </div>
                </div>
                {onSizesChange && (
                  <button
                    type="button"
                    title="Remove this size"
                    onClick={() => removeSize(s)}
                    className="p-2 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="hidden md:grid grid-cols-[140px_1fr_130px_90px_110px] gap-3 px-4 py-2 bg-slate-50/40 border-b text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <div>Color</div>
                <div>SKU code</div>
                <div>Design ID</div>
                <div>Stock</div>
                <div>Price (₹)</div>
              </div>

              <div className="divide-y divide-slate-100">
                {rows.map((v) => {
                  const cMeta = colors.find((cc) => cc.color_name === v.color_name);
                  const oos = Number(v.stock_quantity) <= 0;
                  return (
                    <div
                      key={`${s}-${v.color_name}`}
                      className={`grid grid-cols-2 md:grid-cols-[140px_1fr_130px_90px_110px] gap-3 px-4 py-2.5 items-center transition ${
                        oos ? "bg-amber-50/40" : "hover:bg-slate-50/40"
                      }`}
                    >
                      <div className="col-span-2 md:col-span-1 flex items-center gap-2 min-w-0">
                        <label className="relative cursor-pointer flex-shrink-0" title="Change color">
                          <span
                            className="block w-6 h-6 rounded-full ring-2 ring-white shadow"
                            style={{ backgroundColor: cMeta?.hex_code || "#cccccc" }}
                          />
                          {onColorsChange && (
                            <input
                              type="color"
                              value={cMeta?.hex_code || "#cccccc"}
                              onChange={(e) => recolorColor(v.color_name, e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={() => onColorsChange && renameColor(v.color_name)}
                          title={onColorsChange ? "Rename color" : undefined}
                          className="text-xs font-semibold text-slate-700 truncate hover:text-violet-700 transition text-left"
                        >
                          {v.color_name}
                        </button>
                        {oos && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            OUT
                          </span>
                        )}
                        {onColorsChange && (
                          <button
                            type="button"
                            title="Remove this color"
                            onClick={() => removeColor(v.color_name)}
                            className="ml-auto p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="col-span-2 md:col-span-1 relative">
                        <Input
                          value={v.sku_code}
                          onChange={(e) =>
                            update(v.size, v.color_name, { sku_code: e.target.value })
                          }
                          placeholder={`${slugSku(baseSku || "SKU")}-${slugSku(v.color_name)}-${slugSku(v.size)}`}
                          className="h-9 pr-8 text-sm font-mono"
                        />
                        <button
                          type="button"
                          title="Auto-generate SKU"
                          onClick={() => autoSku(v.size, v.color_name)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <Input
                        value={v.design_id}
                        onChange={(e) =>
                          update(v.size, v.color_name, { design_id: e.target.value })
                        }
                        placeholder="Design ID"
                        className="h-9 text-sm font-mono"
                      />

                      <Input
                        type="number"
                        min={0}
                        value={v.stock_quantity}
                        onChange={(e) =>
                          update(v.size, v.color_name, {
                            stock_quantity: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="h-9 text-sm"
                      />

                      <Input
                        type="number"
                        step="any"
                        min={0}
                        value={v.variant_price ?? ""}
                        onChange={(e) =>
                          update(v.size, v.color_name, {
                            variant_price: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        placeholder={basePrice ? `${basePrice}` : "—"}
                        className="h-9 text-sm"
                      />
                    </div>
                  );
                })}
              </div>

              {onColorsChange && (
                <div className="px-4 py-2.5 border-t bg-slate-50/60">
                  <div className="flex gap-2 items-center">
                    <label className="relative cursor-pointer flex-shrink-0">
                      <span
                        className="block w-8 h-8 rounded-full ring-2 ring-white shadow border border-slate-200"
                        style={{ backgroundColor: newColorHex }}
                      />
                      <input
                        type="color"
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>
                    <Input
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addColor();
                        }
                      }}
                      placeholder="Add color to this product"
                      className="h-8 text-xs bg-white"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addColor} className="h-8 gap-1 text-xs">
                      <Plus className="w-3 h-3" /> Color
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* Matrix grouped by COLOR — one column per color with all its sizes inside */}
      {groupBy === "color" && (
      <div className="grid 2xl:grid-cols-2 gap-3">
        {colors.map((c) => {
          const ownSizes = colorSizes[c.color_name] ?? sizes;
          const rows = ownSizes.map((s) =>
            byKey.get(keyOf(s, c.color_name)) ?? {
              size: s,
              color_name: c.color_name,
              sku_code: "",
              design_id: "",
              stock_quantity: 0,
              variant_price: null,
              discount_percent: 0,
            },
          );
          const colorTotal = rows.reduce(
            (s, v) => s + (Number(v.stock_quantity) || 0),
            0,
          );
          return (
            <div key={c.color_name} className="min-w-0 rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-b">
                <div className="flex items-center gap-2 min-w-0">
                  <label className="relative cursor-pointer flex-shrink-0" title="Change color">
                    <span
                      className="block w-7 h-7 rounded-full ring-2 ring-white shadow"
                      style={{ backgroundColor: c.hex_code || "#cccccc" }}
                    />
                    {onColorsChange && (
                      <input
                        type="color"
                        value={c.hex_code || "#cccccc"}
                        onChange={(e) => recolorColor(c.color_name, e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    )}
                  </label>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onColorsChange && renameColor(c.color_name)}
                      className="text-sm font-semibold text-slate-800 truncate hover:text-violet-700 transition text-left"
                      title={onColorsChange ? "Rename color" : undefined}
                    >
                      {c.color_name}
                    </button>
                    <div className="text-[11px] text-slate-500">
                      {ownSizes.length} size{ownSizes.length === 1 ? "" : "s"} · stock {colorTotal}
                    </div>
                  </div>
                </div>
                {onColorsChange && (
                  <button
                    type="button"
                    title="Remove this color"
                    onClick={() => removeColor(c.color_name)}
                    className="p-2 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="hidden md:grid grid-cols-[78px_minmax(140px,1fr)_96px_72px_110px_80px] gap-2 px-4 py-2 bg-slate-50/40 border-b text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <div>Size</div>
                <div>SKU code</div>
                <div>Design ID</div>
                <div>Stock</div>
                <div>Price (₹)</div>
                <div>Disc %</div>
              </div>

              <div className="divide-y divide-slate-100">
                {rows.map((v) => {
                  const oos = Number(v.stock_quantity) <= 0;
                  return (
                    <div
                      key={`${c.color_name}-${v.size}`}
                      className={`grid grid-cols-1 md:grid-cols-[78px_minmax(140px,1fr)_96px_72px_110px_80px] gap-2 px-4 py-2.5 items-center transition ${
                        oos ? "bg-amber-50/40" : "hover:bg-slate-50/40"
                      }`}
                    >
                      <div className="col-span-2 md:col-span-1 flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() => onSizesChange && renameSize(v.size)}
                          title={onSizesChange ? "Rename size" : undefined}
                          className="inline-flex items-center justify-center min-w-[2.75rem] px-2.5 py-1 rounded-full bg-violet-600 text-white text-xs font-bold shadow-sm hover:bg-violet-700 transition"
                        >
                          {v.size}
                        </button>
                        {oos && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            OUT
                          </span>
                        )}
                        {onSizesChange && (
                          <button
                            type="button"
                            title="Remove this size from this color only"
                            onClick={() => removeSizeForColor(c.color_name, v.size)}
                            className="ml-auto p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="col-span-2 md:col-span-1 relative">
                        <Input
                          value={v.sku_code}
                          onChange={(e) =>
                            update(v.size, v.color_name, {
                              sku_code: e.target.value,
                            })
                          }
                          placeholder={`${slugSku(baseSku || "SKU")}-${slugSku(v.color_name)}-${slugSku(v.size)}`}
                          className="h-9 pr-8 text-sm font-mono"
                        />
                        <button
                          type="button"
                          title="Auto-generate SKU"
                          onClick={() => autoSku(v.size, v.color_name)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <Input
                        value={v.design_id}
                        onChange={(e) =>
                          update(v.size, v.color_name, { design_id: e.target.value })
                        }
                        placeholder="Design ID"
                        className="h-9 text-sm font-mono"
                      />

                      <Input
                        type="number"
                        min={0}
                        value={v.stock_quantity}
                        onChange={(e) =>
                          update(v.size, v.color_name, {
                            stock_quantity: Math.max(
                              0,
                              Number(e.target.value) || 0,
                            ),
                          })
                        }
                        className="h-9 text-sm"
                      />

                      <div className="relative">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
                        <Input
                          type="number"
                          step="any"
                          min={0}
                          value={v.variant_price ?? ""}
                          onChange={(e) =>
                            update(v.size, v.color_name, {
                              variant_price: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                          placeholder={basePrice ? `${basePrice}` : "Price"}
                          className="h-9 pl-6 text-sm"
                        />
                      </div>

                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="any"
                          value={v.discount_percent ?? ""}
                          onChange={(e) =>
                            update(v.size, v.color_name, {
                              discount_percent: e.target.value
                                ? Math.min(100, Math.max(0, Number(e.target.value) || 0))
                                : 0,
                            })
                          }
                          placeholder="0"
                          className="h-9 pr-6 text-sm"
                          title="Discount % for this size — applied on top of variant price"
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">%</span>
                      </div>

                    </div>
                  );
                })}
              </div>

              {onSizesChange && (
                <div className="px-4 py-2.5 border-t bg-slate-50/60 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      list="size-suggestions"
                      value={newSizeBy[c.color_name] ?? ""}
                      onChange={(e) =>
                        setNewSizeBy((prev) => ({ ...prev, [c.color_name]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSizeForColor(c.color_name, newSizeBy[c.color_name] ?? "");
                        }
                      }}
                      placeholder={`Add new size to ${c.color_name}`}
                      className="h-8 text-xs bg-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSizeForColor(c.color_name, newSizeBy[c.color_name] ?? "")}
                      className="h-8 gap-1 text-xs"
                    >
                      <Plus className="w-3 h-3" /> Size
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {SIZE_SUGGESTIONS.filter((s) => !ownSizes.includes(s)).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addSizeForColor(c.color_name, s)}
                        className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-medium text-slate-600 hover:border-violet-400 hover:text-violet-700 transition"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add new color tile */}
        {onColorsChange && (
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4 flex flex-col gap-3 justify-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Palette className="w-3.5 h-3.5 text-violet-600" />
              Add a new color to this product
            </div>
            <div className="flex gap-2 items-center">
              <label className="relative cursor-pointer flex-shrink-0">
                <span
                  className="block w-9 h-9 rounded-full ring-2 ring-white shadow border border-slate-200"
                  style={{ backgroundColor: newColorHex }}
                />
                <input
                  type="color"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
              <Input
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addColor();
                  }
                }}
                placeholder="Color name (e.g. Sky Blue)"
                className="h-9 text-sm bg-white"
              />
              <Button type="button" variant="outline" size="sm" onClick={addColor} className="h-9 gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
          </div>
        )}
      </div>
      )}

      <p className="text-[11px] text-slate-500 leading-relaxed">
        💡 Click a size pill or color name to rename. Use the color dot to change its hex, the trash icon to delete,
        and the inputs at the bottom of each column to add another size or color. Every Size × Color row is its own
        SKU with its own stock and price. Leave price blank to fall back to the base price.
      </p>

    </div>
  );
};
