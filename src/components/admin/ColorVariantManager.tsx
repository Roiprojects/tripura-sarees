import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { resolveImage } from "@/lib/resolveImage";
import { Palette, Plus, Trash2, ChevronDown, ChevronUp, Wand2, ImagePlus, Check } from "lucide-react";

export type ColorVariant = {
  color_name: string;
  hex_code: string;
  images: string[];
  stock_quantity: number;
  sku_code: string;
};

type Props = {
  baseSku: string;
  variants: ColorVariant[];
  onChange: (v: ColorVariant[]) => void;
  /** Optional: product-level media images so admins can pick instead of re-uploading. */
  mediaImages?: string[];
  /** Fires when a variant gets its first uploaded image — used to trigger AI auto-fill of product name/description. */
  onFirstVariantImage?: (url: string) => void;
};

// Curated kidswear-friendly palette
export const PRESET_COLORS: { name: string; hex: string }[] = [
  { name: "Pink", hex: "#F4A6B8" },
  { name: "Lavender", hex: "#C9B8E8" },
  { name: "Mint", hex: "#B5E0C8" },
  { name: "Peach", hex: "#FFD4A8" },
  { name: "Yellow", hex: "#FFE9A8" },
  { name: "Blue", hex: "#A8D5FF" },
  { name: "Sky", hex: "#7EC4FF" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Cream", hex: "#FFF4E6" },
  { name: "Red", hex: "#E84C3D" },
  { name: "Maroon", hex: "#7E2A2A" },
  { name: "Orange", hex: "#F39C12" },
  { name: "Gold", hex: "#D4A84B" },
  { name: "Olive", hex: "#7C8A3E" },
  { name: "Khaki", hex: "#C3B091" },
  { name: "Grey", hex: "#9AA0A6" },
  { name: "Black", hex: "#111111" },
  { name: "Purple", hex: "#8E5BD9" },
  { name: "Navy", hex: "#1E3A8A" },
  { name: "Brown", hex: "#7B4F2A" },
];

const slugSku = (s: string) =>
  s.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const isLight = (hex: string) => {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
};

// Extended reference palette used to auto-name custom hex picks.
const NAMED_COLORS: { name: string; hex: string }[] = [
  { name: "Pink", hex: "#F4A6B8" }, { name: "Hot Pink", hex: "#EC4899" },
  { name: "Rose", hex: "#F472B6" }, { name: "Blush", hex: "#FBCFE8" },
  { name: "Coral", hex: "#FB7185" }, { name: "Peach", hex: "#FFD4A8" },
  { name: "Red", hex: "#E84C3D" }, { name: "Maroon", hex: "#7E2A2A" },
  { name: "Burgundy", hex: "#800020" }, { name: "Orange", hex: "#F39C12" },
  { name: "Rust", hex: "#B7410E" }, { name: "Amber", hex: "#F59E0B" },
  { name: "Yellow", hex: "#FFE9A8" }, { name: "Mustard", hex: "#D4A017" },
  { name: "Gold", hex: "#D4A84B" }, { name: "Olive", hex: "#7C8A3E" },
  { name: "Lime", hex: "#84CC16" }, { name: "Mint", hex: "#B5E0C8" },
  { name: "Sage", hex: "#9CAF88" }, { name: "Green", hex: "#22C55E" },
  { name: "Emerald", hex: "#10B981" }, { name: "Forest", hex: "#14532D" },
  { name: "Teal", hex: "#14B8A6" }, { name: "Cyan", hex: "#22D3EE" },
  { name: "Turquoise", hex: "#06B6D4" }, { name: "Sky", hex: "#7EC4FF" },
  { name: "Blue", hex: "#A8D5FF" }, { name: "Royal Blue", hex: "#1D4ED8" },
  { name: "Navy", hex: "#1E3A8A" }, { name: "Indigo", hex: "#4F46E5" },
  { name: "Purple", hex: "#8E5BD9" }, { name: "Violet", hex: "#8B5CF6" },
  { name: "Lavender", hex: "#C9B8E8" }, { name: "Magenta", hex: "#D946EF" },
  { name: "Brown", hex: "#7B4F2A" }, { name: "Tan", hex: "#D2B48C" },
  { name: "Beige", hex: "#F5E6D3" }, { name: "Khaki", hex: "#C3B091" },
  { name: "Cream", hex: "#FFF4E6" }, { name: "Ivory", hex: "#FFFFF0" },
  { name: "White", hex: "#FFFFFF" }, { name: "Grey", hex: "#9AA0A6" },
  { name: "Charcoal", hex: "#36454F" }, { name: "Black", hex: "#111111" },
];

const hexToRgb = (hex: string) => {
  const h = hex.replace("#", "");
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
};

const nearestColorName = (hex: string): string => {
  const c = hexToRgb(hex);
  if (!c) return "";
  let best = NAMED_COLORS[0];
  let bestD = Infinity;
  for (const n of NAMED_COLORS) {
    const r = hexToRgb(n.hex)!;
    const d = (r.r - c.r) ** 2 + (r.g - c.g) ** 2 + (r.b - c.b) ** 2;
    if (d < bestD) { bestD = d; best = n; }
  }
  return best.name;
};

export const ColorVariantManager = ({ baseSku, variants, onChange, mediaImages = [], onFirstVariantImage }: Props) => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [customName, setCustomName] = useState("");
  const [customHex, setCustomHex] = useState("#F4A6B8");

  const selectedNames = new Set(variants.map((v) => v.color_name.toLowerCase()));

  const addPreset = (p: { name: string; hex: string }) => {
    if (selectedNames.has(p.name.toLowerCase())) {
      onChange(variants.filter((v) => v.color_name.toLowerCase() !== p.name.toLowerCase()));
      return;
    }
    onChange([
      ...variants,
      {
        color_name: p.name,
        hex_code: p.hex,
        images: [],
        stock_quantity: 0,
        sku_code: "",
      },
    ]);
  };

  const addCustom = () => {
    const name = customName.trim();
    if (!name) return; // require a real color name, not a hex id
    if (selectedNames.has(name.toLowerCase())) return;
    onChange([
      ...variants,
      { color_name: name, hex_code: customHex, images: [], stock_quantity: 0, sku_code: "" },
    ]);
    setCustomName("");
  };

  const update = (i: number, patch: Partial<ColorVariant>) =>
    onChange(variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  const remove = (i: number) => onChange(variants.filter((_, idx) => idx !== i));

  const autoSku = (i: number) => {
    const root = slugSku(baseSku || "SKU");
    update(i, { sku_code: `${root}-${slugSku(variants[i].color_name)}` });
  };

  return (
    <div className="space-y-4">
      {/* Palette */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-violet-600" />
          <span className="text-sm font-semibold text-slate-800">Quick palette</span>
          <span className="text-[11px] text-slate-500">Click a swatch to add or remove</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((p) => {
            const active = selectedNames.has(p.name.toLowerCase());
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => addPreset(p)}
                title={p.name}
                className={`group relative w-10 h-10 rounded-full transition-all hover:scale-110 ${
                  active ? "ring-2 ring-violet-600 ring-offset-2 ring-offset-slate-50 scale-105" : "ring-1 ring-slate-200"
                }`}
                style={{ backgroundColor: p.hex }}
              >
                {active && (
                  <span
                    className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
                      isLight(p.hex) ? "text-slate-900" : "text-white"
                    }`}
                  >
                    ✓
                  </span>
                )}
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 whitespace-nowrap opacity-0 group-hover:opacity-100 transition">
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom picker */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Custom</span>
          <input
            type="color"
            value={customHex}
            onChange={(e) => {
              const hex = e.target.value;
              setCustomHex(hex);
              // Auto-fill with the nearest named color so the swatch saves with a real name.
              const guess = nearestColorName(hex);
              if (guess) setCustomName(guess);
            }}
            className="w-10 h-9 rounded-md border border-slate-300 cursor-pointer bg-white"
          />
          <Input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Color name (e.g. Rose, Teal)"
            className="h-9 text-sm flex-1"
          />

          <Button type="button" size="sm" variant="outline" onClick={addCustom} disabled={!customName.trim()} className="h-9 gap-1">
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {variants.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-6 text-center">
          <p className="text-sm font-medium text-slate-600">No colors selected yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Pick from the palette above or add a custom color to create a color variant.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {variants.map((v, i) => {
            const expanded = openIdx === i;
            const totalImgs = v.images?.length ?? 0;
            const oos = Number(v.stock_quantity) <= 0;
            return (
              <div
                key={`${v.color_name}-${i}`}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm"
              >
                {/* Header row — now shows a thumbnail preview + stock pill */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setOpenIdx(expanded ? null : i)}
                    className="flex items-center gap-3 flex-1 text-left min-w-0"
                  >
                    {/* Color swatch */}
                    <span
                      className="w-9 h-9 rounded-full ring-2 ring-white shadow-md flex-shrink-0"
                      style={{ backgroundColor: v.hex_code }}
                    />
                    {/* Image thumbnail preview */}
                    <span className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center ring-1 ring-slate-200 flex-shrink-0">
                      {totalImgs > 0 ? (
                        <>
                          <img
                            src={resolveImage(v.images[0])}
                            alt={v.color_name}
                            className="w-full h-full object-cover"
                          />
                          {totalImgs > 1 && (
                            <span className="absolute bottom-0 right-0 text-[9px] font-bold bg-black/70 text-white px-1 rounded-tl">
                              +{totalImgs - 1}
                            </span>
                          )}
                        </>
                      ) : (
                        <ImagePlus className="w-4 h-4 text-slate-300" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{v.color_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap">
                        <span>{v.hex_code}</span>
                        <span>·</span>
                        <span>{totalImgs} img</span>
                        <span>·</span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-semibold ${
                            oos
                              ? "bg-red-50 text-red-600"
                              : Number(v.stock_quantity) <= 3
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          Stock {v.stock_quantity}{oos ? " · OUT" : ""}
                        </span>
                      </div>
                    </div>
                    {expanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="p-2 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                    title="Remove color"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Expanded editor */}
                {expanded && (
                  <div className="px-4 pb-4 pt-2 border-t bg-slate-50/40 space-y-4">
                    <div className="grid md:grid-cols-[1fr_120px_140px] gap-3">
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Color name
                        </label>
                        <Input
                          value={v.color_name}
                          onChange={(e) => update(i, { color_name: e.target.value })}
                          className="h-9 text-sm mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Hex
                        </label>
                        <div className="mt-1 flex items-center gap-1.5">
                          <input
                            type="color"
                            value={v.hex_code || "#ffffff"}
                            onChange={(e) => update(i, { hex_code: e.target.value })}
                            className="w-9 h-9 rounded-md border border-slate-300 cursor-pointer bg-white"
                          />
                          <Input
                            value={v.hex_code}
                            onChange={(e) => update(i, { hex_code: e.target.value })}
                            className="h-9 text-xs font-mono flex-1"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Stock
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={v.stock_quantity}
                          onChange={(e) =>
                            update(i, {
                              stock_quantity: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="h-9 text-sm mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        SKU code
                      </label>
                      <div className="mt-1 relative">
                        <Input
                          value={v.sku_code}
                          onChange={(e) => update(i, { sku_code: e.target.value })}
                          placeholder={`${slugSku(baseSku || "SKU")}-${slugSku(v.color_name)}`}
                          className="h-9 text-sm font-mono pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => autoSku(i)}
                          title="Auto-generate SKU"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
                        Images for this color
                      </label>
                      <p className="text-[11px] text-slate-500 mb-2">
                        These show on the storefront when a shopper clicks this swatch.
                      </p>

                      {/* Quick-pick from product media (Media tab) */}
                      {mediaImages.length > 0 && (
                        <div className="mb-3 rounded-lg border border-dashed border-violet-200 bg-violet-50/40 p-2.5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold text-violet-700 uppercase tracking-wider">
                              Pick from Media tab ({mediaImages.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => update(i, { images: Array.from(new Set([...(v.images ?? []), ...mediaImages])) })}
                              className="text-[11px] font-semibold text-violet-700 hover:underline"
                            >
                              Add all
                            </button>
                          </div>
                          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                            {mediaImages.map((url) => {
                              const selected = (v.images ?? []).includes(url);
                              return (
                                <button
                                  key={url}
                                  type="button"
                                  onClick={() =>
                                    update(i, {
                                      images: selected
                                        ? v.images.filter((u) => u !== url)
                                        : [...(v.images ?? []), url],
                                    })
                                  }
                                  title={selected ? "Remove from this color" : "Add to this color"}
                                  className={`relative aspect-square rounded-md overflow-hidden ring-2 transition ${
                                    selected
                                      ? "ring-violet-600 shadow-md"
                                      : "ring-transparent hover:ring-violet-300"
                                  }`}
                                >
                                  <img src={resolveImage(url)} alt="" className="w-full h-full object-cover" />
                                  {selected && (
                                    <span className="absolute inset-0 flex items-center justify-center bg-violet-600/40">
                                      <Check className="w-5 h-5 text-white drop-shadow" strokeWidth={3} />
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <ImageUploader
                        value={v.images ?? []}
                        onChange={(images) => {
                          const prev = v.images ?? [];
                          update(i, { images });
                          // First image across ALL variants → fire AI auto-fill so name/description populate once
                          const anyHad = variants.some((vv) => (vv.images ?? []).length > 0);
                          if (!anyHad && images.length > prev.length && images[0]) {
                            onFirstVariantImage?.(images[0]);
                          }
                        }}
                        bucket="product-images"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-slate-500 leading-relaxed">
        💡 Customers will see each color as a swatch on the product page. Clicking a swatch swaps the gallery to
        that color's images. Colors with <strong>0 stock</strong> are hidden automatically.
      </p>
    </div>
  );
};
