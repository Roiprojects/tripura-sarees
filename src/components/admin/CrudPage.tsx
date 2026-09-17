import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SelectField = ({ field, defaultValue }: { field: CrudField; defaultValue: string }) => {
  const [opts, setOpts] = useState<{ value: string; label: string }[]>(field.options ?? []);
  useEffect(() => {
    if (field.loadOptions) field.loadOptions().then(setOpts).catch(() => setOpts([]));
  }, [field]);
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{field.label}</label>
      <select
        name={field.key}
        required={field.required}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-input bg-background h-10 px-2 text-sm"
      >
        <option value="">— None —</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
};

export type CrudField = {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea" | "boolean" | "json" | "select";
  required?: boolean;
  placeholder?: string;
  /** For type="select": static options or a fetcher returning {value,label}[] */
  options?: { value: string; label: string }[];
  loadOptions?: () => Promise<{ value: string; label: string }[]>;
};

export type CrudColumn = {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
};

type Props = {
  table: string;
  title: string;
  columns: CrudColumn[];
  fields: CrudField[];
  searchKey?: string;
  defaultValues?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
};

export const CrudPage = ({ table, title, columns, fields, searchKey, defaultValues = {}, orderBy }: Props) => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["admin", table],
    queryFn: async () => {
      let q = supabase.from(table as any).select("*");
      if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!searchKey || !search) return list.data ?? [];
    return (list.data ?? []).filter((r: any) =>
      String(r[searchKey] ?? "").toLowerCase().includes(search.toLowerCase()),
    );
  }, [list.data, search, searchKey]);

  const save = useMutation({
    mutationFn: async (payload: any) => {
      const clean: any = { ...payload };
      // coerce types
      for (const f of fields) {
        if (clean[f.key] === "" || clean[f.key] == null) {
          if (f.type === "number" || f.type === "select") clean[f.key] = null;
          else if (f.type !== "boolean") clean[f.key] = null;
          continue;
        }
        if (f.type === "number") clean[f.key] = Number(clean[f.key]);
        if (f.type === "boolean") clean[f.key] = !!clean[f.key];
        if (f.type === "json" && typeof clean[f.key] === "string") {
          try { clean[f.key] = JSON.parse(clean[f.key]); } catch { /* leave as string */ }
        }
      }
      if (editing?.id) {
        const { error } = await supabase.from(table as any).update(clean).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table as any).insert(clean);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing?.id ? "Updated" : "Created");
      qc.invalidateQueries({ queryKey: ["admin", table] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", table] });
    },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const openCreate = () => { setEditing({ ...defaultValues }); setOpen(true); };
  const openEdit = (row: any) => { setEditing({ ...row }); setOpen(true); };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {};
    for (const f of fields) {
      const v = fd.get(f.key);
      if (f.type === "boolean") {
        payload[f.key] = fd.get(f.key) === "on";
      } else {
        payload[f.key] = v;
      }
    }
    save.mutate(payload);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{(list.data ?? []).length} records</p>
        </div>
        <div className="flex items-center gap-2">
          {searchKey && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9 w-64" />
            </div>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add new</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Create"} {title.replace(/s$/, "")}</DialogTitle></DialogHeader>
              <form onSubmit={onSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {fields.map((f) => {
                  const val = editing?.[f.key];
                  if (f.type === "boolean") {
                    return (
                      <label key={f.key} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name={f.key} defaultChecked={!!val} className="w-4 h-4" />
                        {f.label}
                      </label>
                    );
                  }
                  if (f.type === "select") {
                    return (
                      <SelectField
                        key={f.key}
                        field={f}
                        defaultValue={val ?? ""}
                      />
                    );
                  }
                  if (f.type === "textarea" || f.type === "json") {
                    return (
                      <div key={f.key} className="space-y-1">
                        <label className="text-sm font-medium">{f.label}</label>
                        <textarea
                          name={f.key}
                          required={f.required}
                          placeholder={f.placeholder}
                          defaultValue={f.type === "json" && val != null ? JSON.stringify(val, null, 2) : (val ?? "")}
                          className="w-full min-h-[90px] rounded-md border border-input bg-background p-2 text-sm font-mono"
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={f.key} className="space-y-1">
                      <label className="text-sm font-medium">{f.label}</label>
                      <Input
                        name={f.key}
                        type={f.type === "number" ? "number" : "text"}
                        step="any"
                        required={f.required}
                        placeholder={f.placeholder}
                        defaultValue={val ?? ""}
                      />
                    </div>
                  );
                })}
                <DialogFooter>
                  <Button type="submit" disabled={save.isPending}>
                    {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="rounded-2xl overflow-hidden">
        {list.isLoading ? (
          <div className="p-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…</div>
        ) : (list.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No records yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  {columns.map((c) => <th key={c.key} className="p-3 font-semibold">{c.label}</th>)}
                  <th className="p-3 w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row: any) => (
                  <tr key={row.id} className="border-t border-border hover:bg-muted/30">
                    {columns.map((c) => (
                      <td key={c.key} className="p-3 align-middle">{c.render ? c.render(row) : String(row[c.key] ?? "")}</td>
                    ))}
                    <td className="p-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this record?")) del.mutate(row.id); }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
