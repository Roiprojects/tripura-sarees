import { useEffect, useRef, useState } from "react";
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
  Image as ImageIcon, Search, Info,
} from "lucide-react";
import { toast } from "sonner";
import { IMAGE_GROUPS, type ImageGroupDef } from "@/lib/imageGroups";
import { DEFAULT_GROUP_IMAGES } from "@/lib/defaultGroupImages";
import { resolveImage } from "@/lib/resolveImage";
import { ImageCropDialog } from "@/components/admin/ImageCropDialog";
import { Crop as CropIcon } from "lucide-react";

type BannerRow = {
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

const REQUIRES_IMAGE: Record<string, boolean> = {
  testimonials: false,
  blog: false,
};

const Field = ({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-semibold text-foreground">{label}</label>
    {hint && <p className="text-[11px] text-muted-foreground -mt-1">{hint}</p>}
    {children}
  </div>
);

const StepBadge = ({ n }: { n: number }) => (
  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
    {n}
  </span>
);

const ImageEditor = ({
  group, initial, onClose, onSaved,
}: {
  group: ImageGroupDef;
  initial: Partial<BannerRow> | null;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState<Partial<BannerRow>>(initial ?? { visible: true, sort_order: 0 });
  const [cropOpen, setCropOpen] = useState(false);
  const set = (k: keyof BannerRow, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const isNew = !initial?.id;
  const requiresImage = REQUIRES_IMAGE[group.key] !== false;

  // Decide which optional things to even show — keep the form short.
  const showTitle = !!group.fields.title;
  const showSubtitle = !!group.fields.subtitle;
  const showLink = !!group.fields.href;
  const showButton = !!group.fields.ctaLabel;
  const showMobile = !!group.fields.mobileImage;
  const hasAdvanced = showLink || showButton || showMobile;

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
    onSuccess: () => { toast.success(isNew ? "Image added to your site" : "Saved — your site is updated"); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {isNew ? "Add a new image" : "Edit image"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Section: <b>{group.label}</b>
          </p>
        </DialogHeader>

        <div className="space-y-5">
          {/* Step 1: Image */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StepBadge n={1} />
              <span className="font-semibold text-sm">
                {requiresImage ? "Choose your image" : "Choose an image (optional)"}
              </span>
            </div>
            <div className="pl-8 space-y-2">
              <p className="text-xs text-muted-foreground">
                Click the box below to pick a picture from your computer, or drag one in.
              </p>
              <ImageUploader
                value={form.image_desktop ? [form.image_desktop] : []}
                onChange={(a) => set("image_desktop", a[0] ?? null)}
                bucket="homepage-media"
                multi={false}
              />
              {form.image_desktop && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCropOpen(true)}
                >
                  <CropIcon className="w-3 h-3 mr-1.5" /> Adjust size / zoom
                </Button>
              )}
            </div>
          </div>

          {/* Step 2: Text (only if this section uses text) */}
          {(showTitle || showSubtitle) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StepBadge n={2} />
                <span className="font-semibold text-sm">Add a label (optional)</span>
              </div>
              <div className="pl-8 space-y-3">
                {showTitle && (
                  <Field label="Title" hint="The big text shown on the image.">
                    <Input
                      value={form.title ?? ""}
                      onChange={(e) => set("title", e.target.value)}
                      placeholder="e.g. Wedding Wear"
                    />
                  </Field>
                )}
                {showSubtitle && (
                  <Field label="Small text" hint="A short tagline under the title.">
                    <Input
                      value={form.subtitle ?? ""}
                      onChange={(e) => set("subtitle", e.target.value)}
                      placeholder="e.g. Festive collection"
                    />
                  </Field>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Visibility — always shown, very simple */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StepBadge n={(showTitle || showSubtitle) ? 3 : 2} />
              <span className="font-semibold text-sm">Show on website?</span>
            </div>
            <label className="pl-8 flex items-center gap-3 cursor-pointer">
              <Switch checked={!!form.visible} onCheckedChange={(v) => set("visible", v)} />
              <span className="text-sm">
                {form.visible ? "Yes — visible to customers" : "No — hidden for now"}
              </span>
            </label>
          </div>

          {/* Advanced — collapsed by default to avoid overwhelming clients */}
          {hasAdvanced && (
            <details className="rounded-lg border bg-muted/30 group">
              <summary className="cursor-pointer select-none text-xs font-medium px-3 py-2 text-muted-foreground hover:text-foreground flex items-center justify-between">
                <span>⚙️ Advanced options (most users can skip this)</span>
                <span className="text-[10px] group-open:hidden">Show</span>
                <span className="text-[10px] hidden group-open:inline">Hide</span>
              </summary>
              <div className="p-3 pt-1 space-y-3 border-t">
                {showLink && (
                  <Field label="Where should this image link to?" hint="Paste a page address. Leave empty if the image shouldn't be clickable.">
                    <Input
                      value={form.cta_url ?? ""}
                      onChange={(e) => set("cta_url", e.target.value)}
                      placeholder="/birthday-bash"
                    />
                  </Field>
                )}
                {showButton && (
                  <Field label="Button text" hint="Text inside the button on the image, e.g. Shop now.">
                    <Input
                      value={form.cta_label ?? ""}
                      onChange={(e) => set("cta_label", e.target.value)}
                      placeholder="Shop now"
                    />
                  </Field>
                )}
                {showMobile && (
                  <Field label="Different image for phones" hint="Optional. Use a portrait image so it looks great on small screens.">
                    <ImageUploader
                      value={form.image_mobile ? [form.image_mobile] : []}
                      onChange={(a) => set("image_mobile", a[0] ?? null)}
                      bucket="homepage-media"
                      multi={false}
                    />
                  </Field>
                )}
              </div>
            </details>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            size="lg"
            onClick={() => save.mutate()}
            disabled={save.isPending || (requiresImage && !form.image_desktop)}
          >
            {save.isPending ? "Saving…" : isNew ? "✓ Add to website" : "✓ Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {cropOpen && form.image_desktop && (
      <ImageCropDialog
        src={resolveImage(form.image_desktop)}
        onClose={() => setCropOpen(false)}
        onCropped={(url) => set("image_desktop", url)}
      />
    )}
    </>
  );
};

const GroupSection = ({ group }: { group: ImageGroupDef }) => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<BannerRow> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-image-group", group.key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_banners")
        .select("*")
        .eq("group_key", group.key)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as BannerRow[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-image-group", group.key] });
    qc.invalidateQueries({ queryKey: ["image-group", group.key] });
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

  const seedDefaults = useMutation({
    mutationFn: async (opts: { skipIndex?: number; silent?: boolean } = {}) => {
      const defaults = DEFAULT_GROUP_IMAGES[group.key] ?? [];
      const payload = defaults
        .map((d, i) => ({ d, i }))
        .filter(({ i }) => i !== opts.skipIndex)
        .map(({ d, i }) => ({
          group_key: group.key,
          image_desktop: resolveImage(d.image),
          title: d.title ?? null,
          subtitle: d.subtitle ?? null,
          cta_url: d.href ?? null,
          cta_label: d.ctaLabel ?? null,
          sort_order: i,
          visible: true,
        }));
      if (payload.length === 0) return { silent: opts.silent };
      const { error } = await supabase.from("homepage_banners").insert(payload);
      if (error) throw error;
      return { silent: opts.silent };
    },
    onSuccess: (res) => {
      refresh();
      if (!res?.silent) toast.success("Defaults imported — you can now edit / delete each one");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Auto-import built-in defaults into the DB the first time this section is
  // opened with no rows. This makes the admin grid show exactly what visitors
  // see on the live site, and lets the admin edit / delete / replace each one
  // normally instead of staring at a read-only "defaults preview".
  const autoSeedRef = useRef(false);
  useEffect(() => {
    if (autoSeedRef.current) return;
    if (isLoading) return;
    if (rows.length > 0) return;
    if ((DEFAULT_GROUP_IMAGES[group.key]?.length ?? 0) === 0) return;
    autoSeedRef.current = true;
    seedDefaults.mutate({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, rows.length, group.key]);

  const revertToDefaults = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("homepage_banners").delete().eq("group_key", group.key);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast.success("Reverted to built-in defaults"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="overflow-hidden border-2">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 border-b">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base">{group.label}</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300">
              {rows.length} / {group.recommended ?? "∞"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rows.length > 0 && (DEFAULT_GROUP_IMAGES[group.key]?.length ?? 0) > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30"
              onClick={() => {
                if (confirm(`Revert "${group.label}" to the original built-in images?\n\nThis will remove all ${rows.length} edited image${rows.length > 1 ? "s" : ""} for this section and bring back the defaults.`)) {
                  revertToDefaults.mutate();
                }
              }}
              disabled={revertToDefaults.isPending}
            >
              ↶ {revertToDefaults.isPending ? "Reverting…" : "Revert to defaults"}
            </Button>
          )}
          <Button
            size="sm"
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-md"
            onClick={() => setEditing({ visible: true, sort_order: rows.length })}
          >
            <Plus className="w-4 h-4 mr-1" /> Add image
          </Button>
        </div>
      </div>

      {/* Built-in defaults currently live (only shown when admin has no overrides) */}
      {rows.length === 0 && (DEFAULT_GROUP_IMAGES[group.key]?.length ?? 0) > 0 && (
        <div className="px-4 pt-4 bg-amber-50/40 dark:bg-amber-950/10 border-b">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Currently live on the site (built-in defaults)
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{DEFAULT_GROUP_IMAGES[group.key].length} images</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => seedDefaults.mutate({})}
                disabled={seedDefaults.isPending}
              >
                {seedDefaults.isPending ? "Importing…" : "Make all editable"}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pb-4">
            {DEFAULT_GROUP_IMAGES[group.key].map((d, i) => (
              <div key={i} className="group relative aspect-square rounded-lg overflow-hidden ring-1 ring-border bg-muted hover:ring-2 hover:ring-violet-500 transition">
                <img src={resolveImage(d.image)} alt={d.title || ""} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition" />
                <span className="absolute top-1 left-1 text-[9px] font-mono px-1 py-0.5 rounded bg-black/60 text-white">
                  #{i + 1}
                </span>
                {/* Action buttons */}
                <div className="absolute inset-x-0 top-0 flex justify-end gap-0.5 p-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    title="Replace this image"
                    onClick={() => setEditing({
                      visible: true,
                      sort_order: i,
                      title: d.title ?? null,
                      subtitle: d.subtitle ?? null,
                      cta_url: d.href ?? null,
                      cta_label: d.ctaLabel ?? null,
                    })}
                    className="w-6 h-6 rounded bg-white/95 shadow flex items-center justify-center"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    title="Remove this default from the site"
                    onClick={() => {
                      if (confirm(`Remove "${d.title || d.subtitle || "this image"}" from the homepage?\n\nThis will import the remaining defaults as editable images and drop this one.`)) {
                        seedDefaults.mutate({ skipIndex: i });
                      }
                    }}
                    className="w-6 h-6 rounded bg-white/95 shadow flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
                <span className="absolute bottom-0 inset-x-0 px-1.5 py-0.5 bg-gradient-to-t from-black/80 to-transparent text-white text-[9px] truncate pointer-events-none">
                  {d.title || d.subtitle || `#${i + 1}`}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground pb-3">
            💡 Tip: click <b>Make all editable</b> to copy these defaults into your library — then you can freely edit, reorder, hide or delete each one.
          </p>
        </div>
      )}

      {/* Tiles grid */}
      <div className="p-4 bg-muted/10">
        {isLoading ? (
          <div className="text-xs text-muted-foreground text-center py-6">Loading…</div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {/* Existing image tiles */}
            {rows.map((b, i) => (
              <div key={b.id} className="group relative">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted ring-1 ring-border relative">
                  {b.image_desktop ? (
                    <img src={resolveImage(b.image_desktop)} alt={b.title || ""} onError={(e) => { (e.currentTarget as HTMLImageElement).src = resolveImage(); }} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-1">
                      <ImageIcon className="w-5 h-5" />
                      <span className="text-[10px]">Text only</span>
                    </div>
                  )}
                  {!b.visible && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold uppercase tracking-wider">Hidden</span>
                    </div>
                  )}
                  <span className="absolute top-1 left-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-white">
                    #{i + 1}
                  </span>
                </div>
                <div className="mt-1.5 text-xs font-medium truncate" title={b.title || ""}>
                  {b.title || b.subtitle || "Untitled"}
                </div>
                {b.cta_url && <div className="text-[10px] text-muted-foreground truncate">{b.cta_url}</div>}

                {/* Hover actions */}
                <div className="absolute inset-x-0 top-0 flex justify-end gap-0.5 p-1 opacity-0 group-hover:opacity-100 transition">
                  <button title="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="w-6 h-6 rounded bg-white/95 shadow flex items-center justify-center disabled:opacity-30">
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button title="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="w-6 h-6 rounded bg-white/95 shadow flex items-center justify-center disabled:opacity-30">
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button title={b.visible ? "Hide" : "Show"} onClick={() => update.mutate({ id: b.id, patch: { visible: !b.visible } })} className="w-6 h-6 rounded bg-white/95 shadow flex items-center justify-center">
                    {b.visible ? <Eye className="w-3 h-3 text-emerald-600" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                  </button>
                  <button title="Edit" onClick={() => setEditing(b)} className="w-6 h-6 rounded bg-white/95 shadow flex items-center justify-center">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button title="Delete" onClick={() => { if (confirm("Delete this image?")) del.mutate(b.id); }} className="w-6 h-6 rounded bg-white/95 shadow flex items-center justify-center">
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              </div>
            ))}

            {/* Always-visible "Add new" tile */}
            <button
              onClick={() => setEditing({ visible: true, sort_order: rows.length })}
              className="aspect-square rounded-lg border-2 border-dashed border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20 hover:border-violet-500 hover:bg-violet-100/70 dark:hover:bg-violet-900/30 transition flex flex-col items-center justify-center gap-2 text-violet-700 dark:text-violet-300"
            >
              <div className="w-10 h-10 rounded-full bg-violet-500 text-white flex items-center justify-center shadow-md">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">Add new image</span>
              <span className="text-[10px] text-muted-foreground px-2 text-center">
                to "{group.label.split("—")[0].trim()}"
              </span>
            </button>
          </div>
        )}

        {rows.length === 0 && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              No custom images yet — the site is showing the <b>built-in default images</b>.
              Click <b>+ Add new image</b> above to replace them with your own.
            </span>
          </div>
        )}
      </div>

      {editing && (
        <ImageEditor group={group} initial={editing} onClose={() => setEditing(null)} onSaved={refresh} />
      )}
    </Card>
  );
};

const AdminHomepageImages = () => {
  const [search, setSearch] = useState("");
  const filtered = IMAGE_GROUPS.filter(
    (g) => !search || g.label.toLowerCase().includes(search.toLowerCase()) || g.key.includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-display font-bold">🖼️ Homepage Images</h1>
          <p className="text-sm text-white/90 mt-1 max-w-2xl">
            Every image you see on the homepage lives here. Pick a section below and click
            <b className="mx-1 px-1.5 py-0.5 rounded bg-white/20">+ Add new image</b>
            to upload your own. Empty sections automatically use the built-in defaults.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
      </div>

      {/* How-to strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { n: "1", title: "Find your section", body: "Each card below = one part of the homepage." },
          { n: "2", title: "Click + Add new image", body: "Either the button or the dashed tile inside the section." },
          { n: "3", title: "Upload & save", body: "Drop an image, add title/link, hit Save. It appears live instantly." },
        ].map((s) => (
          <div key={s.n} className="p-4 rounded-xl border bg-card flex gap-3">
            <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-bold flex items-center justify-center">
              {s.n}
            </div>
            <div>
              <div className="font-semibold text-sm">{s.title}</div>
              <div className="text-xs text-muted-foreground">{s.body}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search a section… (e.g. hero, birthday, footer)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filtered.map((g) => <GroupSection key={g.key} group={g} />)}
        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">
            No sections match "{search}".
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHomepageImages;
