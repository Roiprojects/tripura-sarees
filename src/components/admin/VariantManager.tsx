import { useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wand2, Package, AlertTriangle, Trash2 } from "lucide-react";

export type Variant = {
  size: string;
  sku_code: string;
  stock_quantity: number;
  variant_price: number | null;
};

type Props = {
  sizes: string[];
  basePrice: number;
  baseSku: string;
  variants: Variant[];
  onChange: (v: Variant[]) => void;
};

const slugSku = (s: string) =>
  s.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const VariantManager = ({ sizes, basePrice, baseSku, variants, onChange }: Props) => {
  const byKey = useMemo(() => new Map(variants.map((v) => [v.size, v])), [variants]);

  // Keep the variants list in sync with the selected sizes.
  // - add empty rows for newly-picked sizes
  // - drop rows for un-picked sizes (admin can re-add by re-picking)
  useEffect(() => {
    const next: Variant[] = sizes.map(
      (s) =>
        byKey.get(s) ?? {
          size: s,
          sku_code: "",
          stock_quantity: 0,
          variant_price: null,
        },
    );
    const sameLen = next.length === variants.length;
    const sameContent =
      sameLen && next.every((v, i) => variants[i]?.size === v.size);
    if (!sameContent) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizes.join("|")]);

  const update = (size: string, patch: Partial<Variant>) =>
    onChange(variants.map((v) => (v.size === size ? { ...v, ...patch } : v)));

  const autoGenerate = (size: string) => {
    const root = slugSku(baseSku || "SKU");
    update(size, { sku_code: `${root}-${slugSku(size)}` });
  };

  const autoGenerateAll = () => {
    const root = slugSku(baseSku || "SKU");
    onChange(
      variants.map((v) => ({
        ...v,
        sku_code: v.sku_code || `${root}-${slugSku(v.size)}`,
      })),
    );
  };

  const totalStock = variants.reduce(
    (sum, v) => sum + (Number(v.stock_quantity) || 0),
    0,
  );
  const missingSku = variants.filter((v) => !v.sku_code.trim()).length;

  if (sizes.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-600">
          No size variants yet
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Pick sizes in the <strong>Attributes</strong> tab to manage per-size
          SKU, stock & price here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-100 px-4 py-2.5">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-semibold text-slate-700">
            {variants.length} size variant{variants.length === 1 ? "" : "s"}
          </span>
          <span className="text-slate-500">
            Total stock:{" "}
            <strong className="text-slate-800">{totalStock}</strong>
          </span>
          {missingSku > 0 && (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <AlertTriangle className="w-3 h-3" />
              {missingSku} missing SKU
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={autoGenerateAll}
        >
          <Wand2 className="w-3 h-3" /> Auto-generate all SKUs
        </Button>
      </div>

      {/* Variant rows */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <div className="hidden md:grid grid-cols-[80px_1fr_120px_140px_40px] gap-3 px-4 py-2 bg-slate-50 border-b text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <div>Size</div>
          <div>SKU code</div>
          <div>Stock</div>
          <div>Price override (₹)</div>
          <div></div>
        </div>

        <div className="divide-y divide-slate-100">
          {variants.map((v) => {
            const oos = Number(v.stock_quantity) <= 0;
            return (
              <div
                key={v.size}
                className={`grid grid-cols-2 md:grid-cols-[80px_1fr_120px_140px_40px] gap-3 px-4 py-3 items-center transition ${
                  oos ? "bg-amber-50/40" : "hover:bg-slate-50/60"
                }`}
              >
                <div className="col-span-2 md:col-span-1 flex items-center">
                  <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-full bg-violet-600 text-white text-xs font-bold shadow-sm">
                    {v.size}
                  </span>
                  {oos && (
                    <span className="ml-2 text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      OUT
                    </span>
                  )}
                </div>

                <div className="col-span-2 md:col-span-1 relative">
                  <Input
                    value={v.sku_code}
                    onChange={(e) =>
                      update(v.size, { sku_code: e.target.value })
                    }
                    placeholder={`${slugSku(baseSku || "SKU")}-${slugSku(v.size)}`}
                    className="h-9 pr-8 text-sm font-mono"
                  />
                  <button
                    type="button"
                    title="Auto-generate SKU"
                    onClick={() => autoGenerate(v.size)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <Input
                  type="number"
                  min={0}
                  value={v.stock_quantity}
                  onChange={(e) =>
                    update(v.size, {
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
                    update(v.size, {
                      variant_price: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  placeholder={basePrice ? `${basePrice}` : "—"}
                  className="h-9 text-sm"
                />

                <button
                  type="button"
                  title="Reset row"
                  onClick={() =>
                    update(v.size, {
                      sku_code: "",
                      stock_quantity: 0,
                      variant_price: null,
                    })
                  }
                  className="justify-self-end p-2 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        💡 Each selected size gets its own SKU, stock count and (optional) price.
        Leave the price override blank to use the main product price. Sizes with{" "}
        <strong>0 stock</strong> are automatically hidden on the storefront.
      </p>
    </div>
  );
};
