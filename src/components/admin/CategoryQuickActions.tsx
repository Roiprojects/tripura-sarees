import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Cat = { id: string; name: string; parent_id: string | null; sort_order?: number };

type Props = {
  /** The currently-selected category in this slot (null if none). */
  selected: Cat | null;
  /** parent_id for newly-created categories at this level (null for top-level). */
  parentForNew: string | null;
  /** Friendly noun, e.g. "Main Category" / "Subcategory" / "Sub-subcategory". */
  levelLabel: string;
  /** Called after a new category is created so the form can auto-select it. */
  onCreated?: (cat: Cat) => void;
  /** Called after the selected category is deleted. */
  onDeleted?: () => void;
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const CategoryQuickActions = ({
  selected, parentForNew, levelLabel, onCreated, onDeleted,
}: Props) => {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"add" | "edit" | null>(null);
  const [name, setName] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-categories-tree"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const create = useMutation({
    mutationFn: async (n: string) => {
      const { data, error } = await supabase
        .from("categories")
        .insert({ name: n, slug: slugify(n), parent_id: parentForNew, sort_order: 0, visible: true })
        .select("id,name,parent_id,sort_order")
        .single();
      if (error) throw error;
      return data as Cat;
    },
    onSuccess: (cat) => {
      toast.success("Category added");
      refresh();
      onCreated?.(cat);
      setMode(null); setName("");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add"),
  });

  const update = useMutation({
    mutationFn: async (n: string) => {
      if (!selected) return;
      const { error } = await supabase
        .from("categories")
        .update({ name: n, slug: slugify(n) })
        .eq("id", selected.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category updated");
      refresh();
      setMode(null); setName("");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const { error } = await supabase.from("categories").delete().eq("id", selected.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category deleted");
      refresh();
      onDeleted?.();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  const openAdd = () => { setMode("add"); setName(""); };
  const openEdit = () => { if (!selected) return; setMode("edit"); setName(selected.name); };
  const askDelete = () => {
    if (!selected) return;
    if (confirm(`Delete "${selected.name}"? Sub-items underneath may also be removed.`)) remove.mutate();
  };

  return (
    <div className="flex items-center gap-1">
      <Button type="button" size="sm" variant="outline" className="h-9 px-2" onClick={openAdd} title={`Add ${levelLabel}`}>
        <Plus className="w-3.5 h-3.5" />
      </Button>
      <Button type="button" size="sm" variant="outline" className="h-9 px-2" onClick={openEdit}
        disabled={!selected} title={`Edit ${levelLabel}`}>
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      <Button type="button" size="sm" variant="outline" className="h-9 px-2" onClick={askDelete}
        disabled={!selected || remove.isPending} title={`Delete ${levelLabel}`}>
        {remove.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-destructive" />}
      </Button>

      <Dialog open={mode !== null} onOpenChange={(v) => { if (!v) { setMode(null); setName(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{mode === "edit" ? `Edit ${levelLabel}` : `Add ${levelLabel}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Frocks" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
            <Button
              type="button"
              disabled={!name.trim() || create.isPending || update.isPending}
              onClick={() => mode === "edit" ? update.mutate(name.trim()) : create.mutate(name.trim())}
            >
              {(create.isPending || update.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryQuickActions;
