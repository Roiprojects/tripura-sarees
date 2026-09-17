import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Pencil, Trash2, Plus, CreditCard, Smartphone, Banknote, Wallet,
  ArrowUp, ArrowDown, Landmark, IndianRupee,
} from "lucide-react";
import { toast } from "sonner";

type PM = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  icon: string;
  enabled: boolean;
  sort_order: number;
};

const ICONS: Record<string, any> = {
  CreditCard, Smartphone, Banknote, Wallet, Landmark, IndianRupee,
};
const ICON_KEYS = Object.keys(ICONS);

const empty: Omit<PM, "id"> = {
  code: "", label: "", description: "", icon: "Wallet", enabled: true, sort_order: 0,
};

const AdminPaymentMethods = () => {
  const [items, setItems] = useState<PM[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PM | null>(null);
  const [form, setForm] = useState<Omit<PM, "id">>(empty);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("payment_methods")
      .select("*")
      .order("sort_order");
    if (error) toast.error(error.message);
    setItems((data ?? []) as PM[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, sort_order: (items[items.length - 1]?.sort_order ?? 0) + 1 });
    setOpen(true);
  };
  const openEdit = (pm: PM) => {
    setEditing(pm);
    setForm({
      code: pm.code, label: pm.label, description: pm.description ?? "",
      icon: pm.icon, enabled: pm.enabled, sort_order: pm.sort_order,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.code.trim() || !form.label.trim()) {
      toast.error("Code and label are required"); return;
    }
    const payload = {
      code: form.code.trim().toLowerCase(),
      label: form.label.trim(),
      description: form.description?.trim() || null,
      icon: form.icon || "Wallet",
      enabled: form.enabled,
      sort_order: Number(form.sort_order) || 0,
    };
    const q = editing
      ? (supabase as any).from("payment_methods").update(payload).eq("id", editing.id)
      : (supabase as any).from("payment_methods").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success(editing ? "Updated" : "Added");
    setOpen(false);
    load();
  };

  const toggle = async (pm: PM, enabled: boolean) => {
    const { error } = await (supabase as any)
      .from("payment_methods").update({ enabled }).eq("id", pm.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (pm: PM) => {
    if (!confirm(`Delete payment method "${pm.label}"?`)) return;
    const { error } = await (supabase as any).from("payment_methods").delete().eq("id", pm.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const reorder = async (pm: PM, dir: -1 | 1) => {
    const idx = items.findIndex(i => i.id === pm.id);
    const other = items[idx + dir];
    if (!other) return;
    await Promise.all([
      (supabase as any).from("payment_methods").update({ sort_order: other.sort_order }).eq("id", pm.id),
      (supabase as any).from("payment_methods").update({ sort_order: pm.sort_order }).eq("id", other.id),
    ]);
    load();
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <IndianRupee className="w-5 h-5 text-primary" />
          <h1 className="font-display text-2xl font-bold">Payment Methods</h1>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add method</Button>
      </div>
      <p className="text-sm text-muted-foreground">
        These are the options customers see on checkout. Disabled methods are hidden from customers.
        Built-in codes <code>upi</code>, <code>card</code> and <code>cod</code> are handled by the checkout — new custom codes will appear but will route through the same UPI/card gateway unless you build a handler.
      </p>

      <Card className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No payment methods yet.</p>
        ) : (
          <div className="divide-y">
            {items.map((pm, i) => {
              const Icon = ICONS[pm.icon] ?? Wallet;
              return (
                <div key={pm.id} className="flex items-center gap-3 py-3">
                  <Icon className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{pm.label}</span>
                      <Badge variant="outline">{pm.code}</Badge>
                      {!pm.enabled && <Badge variant="secondary">disabled</Badge>}
                    </div>
                    {pm.description && (
                      <p className="text-xs text-muted-foreground truncate">{pm.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => reorder(pm, -1)}>
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" disabled={i === items.length - 1} onClick={() => reorder(pm, 1)}>
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Switch checked={pm.enabled} onCheckedChange={(v) => toggle(pm, v)} />
                    <Button size="icon" variant="ghost" onClick={() => openEdit(pm)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(pm)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit payment method" : "Add payment method"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Code (unique, lowercase)</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. upi, card, cod, netbanking"
                disabled={!!editing}
              />
            </div>
            <div>
              <Label>Label</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. UPI" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Shown below the label" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Icon</Label>
                <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sort order</Label>
                <Input type="number" value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
              <span className="text-sm">Enabled</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPaymentMethods;
