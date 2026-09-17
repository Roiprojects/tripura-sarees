import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, X, GripVertical, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { resolveImage } from "@/lib/resolveImage";
import { ImageCropDialog } from "@/components/admin/ImageCropDialog";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  bucket?: string;
  multi?: boolean;
  /** Default crop aspect ratio (width/height). 0 = free. e.g. 21/9 for hero banners. */
  defaultAspect?: number;
  /** Optional hint shown under the dropzone (e.g. "Recommended: 2400×1000"). */
  hint?: string;
  /** Auto-open the crop editor immediately after upload (great for banners). */
  autoOpenCrop?: boolean;
};

export const ImageUploader = ({ value, onChange, bucket = "product-images", multi = true, defaultAspect = 0, hint, autoOpenCrop = false }: Props) => {
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ url: string; index: number } | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (error) throw error;
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      const nextValue = multi ? [...value, ...uploaded] : uploaded.slice(0, 1);
      onChange(nextValue);
      if (autoOpenCrop && uploaded[0]) {
        setEditing({ url: uploaded[0], index: multi ? value.length : 0 });
      }
      toast.success(`Uploaded ${uploaded.length} image${uploaded.length > 1 ? "s" : ""}${autoOpenCrop ? " — adjust crop now" : " — click ✨ to crop & style"}`);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const onDragStart = (i: number) => setDragIdx(i);
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    const next = [...value];
    const [m] = next.splice(dragIdx, 1);
    next.splice(i, 0, m);
    setDragIdx(i);
    onChange(next);
  };

  const replaceAt = (i: number, newUrl: string) => {
    const next = [...value];
    next[i] = newUrl;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition">
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" /> Uploading…
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-slate-500">
              <Upload className="w-6 h-6" />
              <div className="text-sm font-medium">Click or drop images</div>
              <div className="text-xs">{hint ?? "PNG, JPG, WEBP • multi-select OK • crop & style after upload"}</div>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            multiple={multi}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />
        </div>
      </label>

      {value.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {value.map((url, i) => (
            <div
              key={url + i}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragEnd={() => setDragIdx(null)}
              className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
            >
              <img src={resolveImage(url)} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-1 left-1 p-0.5 rounded bg-black/40 text-white opacity-0 group-hover:opacity-100 transition">
                <GripVertical className="w-3 h-3" />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-1 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition">
                <button
                  type="button"
                  onClick={() => setEditing({ url, index: i })}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 text-violet-700 text-[10px] font-semibold hover:bg-white"
                >
                  <Wand2 className="w-3 h-3" /> Edit
                </button>
                {i === 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-500 text-white text-[10px] font-semibold">
                    Cover
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ImageCropDialog
          src={resolveImage(editing.url)}
          bucket={bucket}
          defaultAspect={defaultAspect}
          onClose={() => setEditing(null)}
          onCropped={(newUrl) => replaceAt(editing.index, newUrl)}
        />
      )}
    </div>
  );
};
