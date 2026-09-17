import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Save } from "lucide-react";
import * as LucideIcons from "lucide-react";

type Tile = {
  id: string;
  label: string;
  description: string | null;
  link: string;
  icon: string;
  gradient: string;
  sort_order: number;
  active: boolean;
};

const ICON_CHOICES = [
  "Gem","Sparkles","Star","Crown","Heart","Flower2","PartyPopper","Briefcase",
  "Sun","Moon","Award","Gift","ShoppingBag","Tag","CalendarHeart",
];

const GRADIENT_PRESETS = [
  "from-emerald-100 via-amber-50 to-amber-100",
  "from-amber-100 via-yellow-50 to-emerald-100",
  "from-rose-100 via-amber-50 to-amber-100",
  "from-emerald-200 via-emerald-50 to-amber-100",
  "from-amber-200 via-amber-50 to-rose-100",
  "from-emerald-100 via-teal-50 to-emerald-200",
];

const renderIcon = (name: string, className = "w-5 h-5") => {
  const Icon = (LucideIcons as any)[name] ?? LucideIcons.Sparkles;
  return <Icon className={className} />;
};

const AdminOccasions = () => {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("occasion_tiles" as any)
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setTiles(((data as any) || []) as Tile[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<Tile>) =>
    setTiles(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));

  const save = async (t: Tile) => {
    setSaving(t.id);
    const { error } = await supabase.from("occasion_tiles" as any).update({
      label: t.label,
      description: t.description,
      link: t.link,
      icon: t.icon,
      gradient: t.gradient,
      sort_order: t.sort_order,
      active: t.active,
    } as any).eq("id", t.id);
    setSaving(null);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  };

  const del = async (id: string) => {
    if (!confirm("Delete this occasion tile?")) return;
    const { error } = await supabase.from("occasion_tiles" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const add = async () => {
    const maxOrder = tiles.reduce((m, t) => Math.max(m, t.sort_order), 0);
    const { error } = await supabase.from("occasion_tiles" as any).insert({
      label: "New Occasion",
      description: "Describe this occasion",
      link: "/shop",
      icon: "Sparkles",
      gradient: GRADIENT_PRESETS[0],
      sort_order: maxOrder + 1,
      active: true,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Added");
    load();
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = tiles.findIndex(t => t.id === id);
    const swap = tiles[idx + dir];
    if (!swap) return;
    const a = tiles[idx], b = swap;
    await supabase.from("occasion_tiles" as any).update({ sort_order: b.sort_order } as any).eq("id", a.id);
    await supabase.from("occasion_tiles" as any).update({ sort_order: a.sort_order } as any).eq("id", b.id);
    load();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
    </div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">Shop by Occasion</h1>
          <p className="text-sm text-muted-foreground">Manage the tiles shown on the Shop by Occasion page.</p>
        </div>
        <Button onClick={add} className="gap-2"><Plus className="w-4 h-4" /> Add tile</Button>
      </div>

      <div className="grid gap-4">
        {tiles.map((t, i) => (
          <Card key={t.id} className="p-4 md:p-5">
            <div className="grid md:grid-cols-[auto,1fr,auto] gap-4 items-start">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-sky shadow-sm shrink-0`}>
                {renderIcon(t.icon, "w-8 h-8")}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 flex-1">
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input value={t.label} onChange={e => update(t.id, { label: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Link (route or URL)</Label>
                  <Input value={t.link} onChange={e => update(t.id, { link: e.target.value })} placeholder="/party-store" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Description</Label>
                  <Input value={t.description ?? ""} onChange={e => update(t.id, { description: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Icon</Label>
                  <Select value={t.icon} onValueChange={v => update(t.id, { icon: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {ICON_CHOICES.map(name => (
                        <SelectItem key={name} value={name}>
                          <span className="flex items-center gap-2">{renderIcon(name, "w-4 h-4")} {name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Gradient</Label>
                  <Select value={t.gradient} onValueChange={v => update(t.id, { gradient: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GRADIENT_PRESETS.map(g => (
                        <SelectItem key={g} value={g}>
                          <span className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded bg-gradient-to-br ${g} border`} />
                            <span className="text-xs">{g.replace(/from-|via-|to-/g, "").slice(0, 40)}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={t.active} onCheckedChange={v => update(t.id, { active: v })} />
                  <Label className="text-sm">{t.active ? "Visible" : "Hidden"}</Label>
                </div>
              </div>

              <div className="flex md:flex-col gap-2 shrink-0">
                <Button size="icon" variant="outline" disabled={i === 0} onClick={() => move(t.id, -1)}><ArrowUp className="w-4 h-4" /></Button>
                <Button size="icon" variant="outline" disabled={i === tiles.length - 1} onClick={() => move(t.id, 1)}><ArrowDown className="w-4 h-4" /></Button>
                <Button size="sm" onClick={() => save(t)} disabled={saving === t.id} className="gap-1">
                  {saving === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                </Button>
                <Button size="sm" variant="destructive" onClick={() => del(t.id)} className="gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
              </div>
            </div>
          </Card>
        ))}
        {tiles.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No tiles yet. Add one to get started.</div>
        )}
      </div>
    </div>
  );
};

export default AdminOccasions;
