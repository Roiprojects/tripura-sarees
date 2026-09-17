import { useCallback, useMemo, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Crop as CropIcon, RotateCw, Wand2, Sliders, RotateCcw } from "lucide-react";

const ASPECTS = [
  { label: "Free", value: 0 },
  { label: "1:1", value: 1 },
  { label: "16:9", value: 16 / 9 },
  { label: "21:9", value: 21 / 9 },
  { label: "3:2", value: 3 / 2 },
  { label: "4:5", value: 4 / 5 },
  { label: "3:4", value: 3 / 4 },
];

type Filters = {
  brightness: number;   // 100 = no change
  contrast: number;
  saturate: number;
  grayscale: number;    // 0..100
  sepia: number;
  blur: number;         // px
  hueRotate: number;    // deg
};

const DEFAULT_FILTERS: Filters = {
  brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, blur: 0, hueRotate: 0,
};

type Preset = { name: string; label: string; emoji: string; filters: Filters };

const PRESETS: Preset[] = [
  { name: "original", label: "Original", emoji: "🖼️", filters: DEFAULT_FILTERS },
  { name: "bw", label: "B&W", emoji: "⚫", filters: { ...DEFAULT_FILTERS, grayscale: 100, contrast: 115 } },
  { name: "noir", label: "Noir", emoji: "🌑", filters: { ...DEFAULT_FILTERS, grayscale: 100, contrast: 140, brightness: 90 } },
  { name: "vintage", label: "Vintage", emoji: "📷", filters: { ...DEFAULT_FILTERS, sepia: 60, contrast: 95, saturate: 80, brightness: 105 } },
  { name: "sepia", label: "Sepia", emoji: "🟤", filters: { ...DEFAULT_FILTERS, sepia: 100, contrast: 105 } },
  { name: "warm", label: "Warm", emoji: "🔥", filters: { ...DEFAULT_FILTERS, saturate: 120, brightness: 105, sepia: 15, hueRotate: -10 } },
  { name: "cool", label: "Cool", emoji: "❄️", filters: { ...DEFAULT_FILTERS, saturate: 110, brightness: 102, hueRotate: 20 } },
  { name: "vivid", label: "Vivid", emoji: "✨", filters: { ...DEFAULT_FILTERS, saturate: 160, contrast: 115, brightness: 105 } },
  { name: "muted", label: "Muted", emoji: "🌫️", filters: { ...DEFAULT_FILTERS, saturate: 60, brightness: 102, contrast: 95 } },
  { name: "fade", label: "Fade", emoji: "🌅", filters: { ...DEFAULT_FILTERS, saturate: 80, brightness: 110, contrast: 88 } },
  { name: "pop", label: "Pop", emoji: "💥", filters: { ...DEFAULT_FILTERS, saturate: 180, contrast: 125 } },
  { name: "dream", label: "Dreamy", emoji: "☁️", filters: { ...DEFAULT_FILTERS, brightness: 110, saturate: 90, blur: 0.5, contrast: 92 } },
];

const filterString = (f: Filters) =>
  `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) grayscale(${f.grayscale}%) sepia(${f.sepia}%) blur(${f.blur}px) hue-rotate(${f.hueRotate}deg)`;

async function getCroppedBlob(src: string, area: Area, rotation: number, filters: Filters): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bW = img.width * cos + img.height * sin;
  const bH = img.width * sin + img.height * cos;

  const tmp = document.createElement("canvas");
  tmp.width = bW;
  tmp.height = bH;
  const tctx = tmp.getContext("2d")!;
  tctx.filter = filterString(filters);
  tctx.translate(bW / 2, bH / 2);
  tctx.rotate(rad);
  tctx.drawImage(img, -img.width / 2, -img.height / 2);

  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(area.width));
  out.height = Math.max(1, Math.round(area.height));
  const octx = out.getContext("2d")!;
  octx.drawImage(tmp, area.x, area.y, area.width, area.height, 0, 0, out.width, out.height);
  return new Promise((res) => out.toBlob((b) => res(b!), "image/jpeg", 0.92));
}

export const ImageCropDialog = ({
  src,
  bucket = "homepage-media",
  defaultAspect = 0,
  onClose,
  onCropped,
}: {
  src: string;
  bucket?: string;
  defaultAspect?: number;
  onClose: () => void;
  onCropped: (url: string) => void;
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number>(defaultAspect);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [tab, setTab] = useState<"presets" | "manual">("presets");

  const onComplete = useCallback((_: Area, px: Area) => setAreaPx(px), []);
  const cssFilter = useMemo(() => filterString(filters), [filters]);

  const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!areaPx) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(src, areaPx, rotation, filters);
      const path = `${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from(bucket).upload(path, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg",
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      toast.success("Image saved with edits");
      onCropped(data.publicUrl);
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-violet-600" /> Edit image — crop, rotate & apply styles
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-[1fr_320px] gap-0">
          {/* Live crop canvas */}
          <div className="p-4 md:p-5 md:pr-0">
            <div className="relative w-full h-[300px] sm:h-[400px] md:h-[480px] bg-black rounded-xl overflow-hidden ring-1 ring-border">
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect || undefined}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onComplete}
                restrictPosition={false}
                objectFit="contain"
                style={{ mediaStyle: { filter: cssFilter } as any }}
              />
            </div>

            {/* Aspect + rotate toolbar */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ratio</span>
              {ASPECTS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => setAspect(a.value)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                    aspect === a.value ? "bg-violet-600 text-white border-violet-600" : "bg-card hover:bg-muted border-border"
                  }`}
                >
                  {a.label}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1">
                <Button size="sm" variant="outline" className="h-7" onClick={() => setRotation((r) => (r - 90 + 360) % 360)}>
                  <RotateCcw className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7" onClick={() => setRotation((r) => (r + 90) % 360)}>
                  <RotateCw className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right side panel: presets / manual / zoom-rotate */}
          <div className="border-l bg-muted/20 p-4 space-y-4 md:max-h-[560px] md:overflow-y-auto">
            {/* Tabs */}
            <div className="flex p-1 bg-muted rounded-lg">
              <button
                onClick={() => setTab("presets")}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition flex items-center justify-center gap-1 ${
                  tab === "presets" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Wand2 className="w-3 h-3" /> Style presets
              </button>
              <button
                onClick={() => setTab("manual")}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition flex items-center justify-center gap-1 ${
                  tab === "manual" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Sliders className="w-3 h-3" /> Manual
              </button>
            </div>

            {tab === "presets" ? (
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((p) => {
                  const active =
                    p.filters.brightness === filters.brightness &&
                    p.filters.contrast === filters.contrast &&
                    p.filters.saturate === filters.saturate &&
                    p.filters.grayscale === filters.grayscale &&
                    p.filters.sepia === filters.sepia &&
                    p.filters.hueRotate === filters.hueRotate;
                  return (
                    <button
                      key={p.name}
                      onClick={() => setFilters(p.filters)}
                      className={`group rounded-lg overflow-hidden border-2 transition text-left ${
                        active ? "border-violet-600 ring-2 ring-violet-300" : "border-border hover:border-violet-400"
                      }`}
                    >
                      <div className="aspect-square bg-muted overflow-hidden">
                        <img
                          src={src}
                          alt={p.label}
                          className="w-full h-full object-cover"
                          style={{ filter: filterString(p.filters) }}
                          crossOrigin="anonymous"
                        />
                      </div>
                      <div className="px-1.5 py-1 text-[10px] font-semibold text-center bg-card">
                        {p.emoji} {p.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { k: "brightness" as const, label: "Brightness", min: 0, max: 200, suffix: "%" },
                  { k: "contrast" as const, label: "Contrast", min: 0, max: 200, suffix: "%" },
                  { k: "saturate" as const, label: "Saturation", min: 0, max: 200, suffix: "%" },
                  { k: "grayscale" as const, label: "Grayscale", min: 0, max: 100, suffix: "%" },
                  { k: "sepia" as const, label: "Sepia", min: 0, max: 100, suffix: "%" },
                  { k: "hueRotate" as const, label: "Hue shift", min: 0, max: 360, suffix: "°" },
                  { k: "blur" as const, label: "Blur", min: 0, max: 10, suffix: "px" },
                ].map((s) => (
                  <div key={s.k}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <Label className="text-[11px]">{s.label}</Label>
                      <span className="text-muted-foreground font-mono">{filters[s.k]}{s.suffix}</span>
                    </div>
                    <Slider
                      value={[filters[s.k]]}
                      min={s.min}
                      max={s.max}
                      step={s.k === "blur" ? 0.1 : 1}
                      onValueChange={(v) => setFilter(s.k, v[0])}
                    />
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full" onClick={() => setFilters(DEFAULT_FILTERS)}>
                  Reset all filters
                </Button>
              </div>
            )}

            {/* Zoom + rotation */}
            <div className="pt-3 border-t space-y-3">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <Label className="text-[11px]">Zoom</Label>
                  <span className="text-muted-foreground font-mono">{zoom.toFixed(2)}x</span>
                </div>
                <Slider value={[zoom]} min={0.5} max={4} step={0.01} onValueChange={(v) => setZoom(v[0])} />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <Label className="text-[11px]">Rotation</Label>
                  <span className="text-muted-foreground font-mono">{rotation}°</span>
                </div>
                <Slider value={[rotation]} min={0} max={360} step={1} onValueChange={(v) => setRotation(v[0])} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={save}
            disabled={saving || !areaPx}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving…</> : <><CropIcon className="w-4 h-4 mr-1" /> Apply & save</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
