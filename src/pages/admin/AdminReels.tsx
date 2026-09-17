import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Upload, Eye, EyeOff, ArrowUp, ArrowDown, Film } from "lucide-react";
import { toast } from "sonner";

type Reel = {
  id: string;
  video_url: string;
  title: string | null;
  status: string;
  sort_order: number;
  created_at: string;
};

const BUCKET = "homepage-media";

const AdminReels = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Reel> | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: reels = [], isLoading } = useQuery({
    queryKey: ["admin-reels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reels_videos")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Reel[];
    },
  });

  const save = useMutation({
    mutationFn: async (payload: Partial<Reel>) => {
      if (editing?.id) {
        const { error } = await supabase.from("reels_videos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reels_videos").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing?.id ? "Reel updated" : "Reel added");
      qc.invalidateQueries({ queryKey: ["admin-reels"] });
      qc.invalidateQueries({ queryKey: ["reels-videos-public"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reels_videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reel deleted");
      qc.invalidateQueries({ queryKey: ["admin-reels"] });
      qc.invalidateQueries({ queryKey: ["reels-videos-public"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const quickUpdate = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Reel> }) => {
      const { error } = await supabase.from("reels_videos").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reels"] });
      qc.invalidateQueries({ queryKey: ["reels-videos-public"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });

  const uploadVideo = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `reels/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "video/mp4",
      });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      toast.success("Video uploaded");
      return data.publicUrl;
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: (fd.get("title") as string) || null,
      video_url: (fd.get("video_url") as string) || "",
      status: ((fd.get("status") as string) || "active"),
      sort_order: Number(fd.get("sort_order") || 0),
    };
    if (!payload.video_url) {
      toast.error("Video is required");
      return;
    }
    save.mutate(payload);
  };

  const move = (r: Reel, dir: -1 | 1) => {
    const next = (r.sort_order ?? 0) + dir;
    quickUpdate.mutate({ id: r.id, patch: { sort_order: next } });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Film className="w-7 h-7 text-pink-500" /> Reels Videos
          </h1>
          <p className="text-sm text-muted-foreground">{reels.length} reel{reels.length === 1 ? "" : "s"} on homepage</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing({ status: "active", sort_order: (reels[reels.length-1]?.sort_order ?? 0) + 10 }); setOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add reel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing?.id ? "Edit reel" : "Add new reel"}</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">

              <div className="space-y-1">
                <label className="text-sm font-medium">Title (optional)</label>
                <Input name="title" defaultValue={editing?.title ?? ""} placeholder="Festive picks for the season" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Video</label>
                <VideoField
                  defaultUrl={editing?.video_url ?? ""}
                  uploading={uploading}
                  onUpload={async (file) => {
                    const url = await uploadVideo(file);
                    if (url) setEditing((s) => ({ ...(s ?? {}), video_url: url }));
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Sort order</label>
                  <Input name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Status</label>
                  <select name="status" defaultValue={editing?.status ?? "active"} className="w-full rounded-md border border-input bg-background h-10 px-2 text-sm">
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={save.isPending || uploading}>
                  {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save reel
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 inline animate-spin mr-2" /> Loading…</div>
        ) : reels.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No reels yet. Add your first reel above.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {reels.map((r) => (
              <div key={r.id} className="group relative rounded-xl overflow-hidden bg-slate-100 ring-1 ring-slate-200">
                <div className="aspect-[9/16] bg-black">
                  <video src={r.video_url} muted loop autoPlay playsInline className="w-full h-full object-cover" />
                </div>
                <div className="p-2 space-y-2">
                  <div className="text-xs font-semibold line-clamp-1">{r.title || "Untitled"}</div>
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${r.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                      {r.status === "active" ? "Live" : "Hidden"}
                    </span>
                    <span className="font-mono text-muted-foreground">#{r.sort_order}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <Button size="sm" variant="ghost" onClick={() => move(r, -1)} title="Move up"><ArrowUp className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => move(r, 1)} title="Move down"><ArrowDown className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => quickUpdate.mutate({ id: r.id, patch: { status: r.status === "active" ? "disabled" : "active" } })} title="Toggle visibility">
                      {r.status === "active" ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this reel?")) del.mutate(r.id); }}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const VideoField = ({ defaultUrl, uploading, onUpload }: { defaultUrl: string; uploading: boolean; onUpload: (f: File) => Promise<void> }) => {
  const [url, setUrl] = useState(defaultUrl);
  useEffect(() => { setUrl(defaultUrl); }, [defaultUrl]);
  return (
    <div className="space-y-2">
      <input type="hidden" name="video_url" value={url} />
      <label className="block">
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center cursor-pointer hover:border-pink-400 hover:bg-pink-50/40 transition">
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /> Uploading video…</div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-slate-500">
              <Upload className="w-6 h-6" />
              <div className="text-sm font-medium">Click to upload video</div>
              <div className="text-xs">MP4 / MOV / WEBM • vertical 9:16 recommended</div>
            </div>
          )}
          <input
            type="file"
            accept="video/*"
            className="hidden"
            disabled={uploading}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) {
                await onUpload(f);
                e.target.value = "";
              }
            }}
          />
        </div>
      </label>
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Or paste a video URL (https://…)"
      />
      {url && (
        <div className="aspect-[9/16] max-w-[160px] rounded-lg overflow-hidden bg-black">
          <video src={url} muted loop autoPlay playsInline className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
};

export default AdminReels;
