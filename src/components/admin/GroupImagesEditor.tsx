import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ImageUploader } from "@/components/admin/ImageUploader";
import {
  Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { IMAGE_GROUPS, type ImageGroupDef } from "@/lib/imageGroups";
import { LinkPicker } from "@/components/admin/LinkPicker";
import { resolveImage } from "@/lib/resolveImage";

export type BannerRow = {
  id: string;
  group_key: string | null;
  title: string | null;
  subtitle: string | null;
  image_desktop: string | null;
  image_mobile: string | null;
  cta_url: string | null;
  cta_label: string | null;
  sort_order: number;
  visible: boolean;
};

const DEFAULT_GROUP_DEF: ImageGroupDef = {
  key: "",
  label: "Images",
  description: "",
  fields: { title: true, subtitle: true, href: true, ctaLabel: true, mobileImage: true },
};

// Image is optional for these (text-only) groups.
const REQUIRES_IMAGE: Record<string, boolean> = {
  testimonials: false,
  blog: false,
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    {children}
  </div>
);

const Editor = ({
  group, initial, onClose, onSaved,
}: {
  group: ImageGroupDef;
  initial: Partial<BannerRow> | null;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState<Partial<BannerRow>>(initial ?? { visible: true, sort_order: 0 });
  const set = (k: keyof BannerRow, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const isNew = !initial?.id;
  const requiresImage = REQUIRES_IMAGE[group.key] !== false;

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        group_key: group.key,
        title: form.title ?? null,
        subtitle: form.subtitle ?? null,
        image_desktop: form.image_desktop ?? null,
        image_mobile: form.image_mobile ?? null,
        cta_url: form.cta_url ?? null,
        cta_label: form.cta_label ?? null,
        sort_order: Number(form.sort_order ?? 0),
        visible: form.visible ?? true,
      };
      if (isNew) {
        const { error } = await supabase.from("homepage_banners").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("homepage_banners").update(payload).eq("id", initial!.id!);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(isNew ? "Image added" : "Saved"); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add image" : "Edit image"} — {group.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label={`Image${requiresImage ? " *" : " (optional)"}`}>
            <ImageUploader
              value={form.image_desktop ? [form.image_desktop] : []}
              onChange={(a) => set("image_desktop", a[0] ?? null)}
              bucket="homepage-media"
              multi={false}
            />
          </Field>
          {group.fields.mobileImage && (
            <Field label="Mobile image (optional)">
              <ImageUploader
                value={form.image_mobile ? [form.image_mobile] : []}
                onChange={(a) => set("image_mobile", a[0] ?? null)}
                bucket="homepage-media"
                multi={false}
              />
            </Field>
          )}
          {group.fields.title && (
            <Field label="Title / label">
              <Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} />
            </Field>
          )}
          {group.fields.subtitle && (
            <Field label="Subtitle / small label">
              <Input value={form.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} />
            </Field>
          )}
          {group.fields.href && (
            <Field label="Where should this banner go when tapped?">
              <LinkPicker value={form.cta_url ?? ""} onChange={(v) => set("cta_url", v)} />
            </Field>
          )}
          {group.fields.ctaLabel && (
            <Field label="Button text">
              <Input value={form.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} placeholder="Shop now" />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sort order">
              <Input type="number" value={form.sort_order ?? 0} onChange={(e) => set("sort_order", Number(e.target.value))} />
            </Field>
            <label className="flex items-center gap-2 pt-7">
              <Switch checked={!!form.visible} onCheckedChange={(v) => set("visible", v)} />
              <span className="text-sm">Visible</span>
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || (requiresImage && !form.image_desktop)}>
            {save.isPending ? "Saving…" : "Save image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Reusable images editor for a given `homepage_banners.group_key`.
 * Renders the same add/edit/delete/reorder/visibility UI used on
 * /admin/homepage-images, but scoped to a single group.
 */
export const GroupImagesEditor = ({ groupKey, label }: { groupKey: string; label?: string }) => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<BannerRow> | null>(null);

  const group: ImageGroupDef =
    IMAGE_GROUPS.find((g) => g.key === groupKey) ?? { ...DEFAULT_GROUP_DEF, key: groupKey, label: label ?? "Images" };

  const { data: rows = [] } = useQuery({
    queryKey: ["admin-image-group", groupKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_banners")
        .select("*")
        .eq("group_key", groupKey)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as BannerRow[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-image-group", groupKey] });
    qc.invalidateQueries({ queryKey: ["image-group", groupKey] });
  };

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homepage_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<BannerRow> }) => {
      const { error } = await supabase.from("homepage_banners").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refresh(),
  });

  const move = (idx: number, dir: -1 | 1) => {
    const a = rows[idx], b = rows[idx + dir];
    if (!a || !b) return;
    update.mutate({ id: a.id, patch: { sort_order: b.sort_order } });
    update.mutate({ id: b.id, patch: { sort_order: a.sort_order } });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">
          {group.label} <span className="text-muted-foreground font-normal">({rows.length})</span>
        </div>
        <Button size="sm" onClick={() => setEditing({ visible: true, sort_order: rows.length })}>
          <Plus className="w-3 h-3 mr-1" /> Add image
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground p-6 border border-dashed rounded text-center">
          No custom images yet. The site uses the built-in default images.
          Click <b>Add image</b> to override them.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((b, i) => (
            <Card key={b.id} className="p-2 flex gap-2">
              <div className="w-20 h-20 rounded overflow-hidden bg-muted shrink-0">
                {b.image_desktop ? (
                  <img src={resolveImage(b.image_desktop)} onError={(e) => { (e.currentTarget as HTMLImageElement).src = resolveImage(); }} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="text-sm font-semibold truncate">{b.title || b.subtitle || "Untitled"}</div>
                <div className="text-xs text-muted-foreground truncate">{b.cta_url || "—"}</div>
                <div className="flex gap-1 mt-auto pt-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => update.mutate({ id: b.id, patch: { visible: !b.visible } })}>
                    {b.visible ? <Eye className="w-3 h-3 text-emerald-600" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(b)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { if (confirm("Delete this image?")) del.mutate(b.id); }}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <Editor group={group} initial={editing} onClose={() => setEditing(null)} onSaved={refresh} />
      )}
    </div>
  );
};

/**
 * Compact horizontal preview strip of the live images for a group_key.
 * Used inline in section rows so admins can see the actual images at a glance.
 */
export const GroupImagesStrip = ({ groupKey }: { groupKey: string }) => {
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-image-group-strip", groupKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("homepage_banners")
        .select("id, image_desktop, title")
        .eq("group_key", groupKey)
        .order("sort_order")
        .limit(6);
      return data ?? [];
    },
  });
  if (rows.length === 0) return null;
  return (
    <div className="flex gap-1 ml-2 shrink-0">
      {rows.map((r: any) => (
        r.image_desktop ? (
          <img key={r.id} src={resolveImage(r.image_desktop)} alt={r.title || ""} title={r.title || ""} onError={(e) => { (e.currentTarget as HTMLImageElement).src = resolveImage(); }}
            className="w-9 h-9 rounded-md object-cover ring-1 ring-border" />
        ) : null
      ))}
    </div>
  );
};
