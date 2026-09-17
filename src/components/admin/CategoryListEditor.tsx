import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Item = { id: string; name: string; _label?: string };

type Props = {
  items: Item[];
  levelLabel: string;
  selectedId?: string | null;
  onDeleted?: (id: string) => void;
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const CategoryListEditor = ({ items, levelLabel, selectedId, onDeleted }: Props) => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Item | null>(null);
  const [name, setName] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-categories-tree"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const update = useMutation({
    mutationFn: async ({ id, n }: { id: string; n: string }) => {
      const { error } = await supabase
        .from("categories")
        .update({ name: n, slug: slugify(n) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); refresh(); setEditing(null); setName(""); },
    onError: (e: any) => toast.error(e.message ?? "Failed to update"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => { toast.success("Deleted"); refresh(); onDeleted?.(id); },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  if (!items.length) return null;

  return (
    <div className="mt-2 rounded-md border bg-muted/30 divide-y max-h-44 overflow-auto">
      {items.map((it) => (
        <div key={it.id} className="flex items-center justify-between gap-2 px-2 py-1 text-xs">
          <span className={`truncate ${selectedId === it.id ? "font-semibold text-primary" : ""}`}>
            {it._label ?? it.name}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button" size="sm" variant="ghost" className="h-6 w-6 p-0"
              onClick={() => { setEditing(it); setName(it.name); }}
              title={`Edit ${levelLabel}`}
            >
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              type="button" size="sm" variant="ghost" className="h-6 w-6 p-0"
              disabled={remove.isPending}
              onClick={() => {
                if (confirm(`Delete "${it.name}"? Sub-items underneath may also be removed.`)) {
                  remove.mutate(it.id);
                }
              }}
              title={`Delete ${levelLabel}`}
            >
              {remove.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3 text-destructive" />}
            </Button>
          </div>
        </div>
      ))}

      <Dialog open={editing !== null} onOpenChange={(v) => { if (!v) { setEditing(null); setName(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit {levelLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              type="button"
              disabled={!name.trim() || update.isPending}
              onClick={() => editing && update.mutate({ id: editing.id, n: name.trim() })}
            >
              {update.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryListEditor;
