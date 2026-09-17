import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Pencil, Trash2, Plus, Filter as FilterIcon } from "lucide-react";
import { toast } from "sonner";

type FieldKey = string;

// Fields that actually live on the products table. Renaming/deleting for
// label-only fields must skip the products.update path.
const PRODUCT_COLUMN_FIELDS: FieldKey[] = ["collection", "gender", "brand"];

type FieldDef = { key: FieldKey; label: string; description: string };

const BUILT_IN_FIELDS: FieldDef[] = [
  { key: "collection", label: "Occasion", description: "Values shown in the storefront 'Occasion' filter" },
  { key: "gender", label: "Gender", description: "Values shown in the 'Gender' filter" },
  { key: "age", label: "Age", description: "Age labels shown in the 'Age' filter (e.g. 0-6 Months, 2-3 Years)" },
  { key: "size", label: "Size", description: "Size labels shown in the 'Size' filter (e.g. XS, S, M, 2Y, 3Y)" },
  { key: "color", label: "Color", description: "Color names shown in the 'Color' filter" },
  { key: "brand", label: "Brand", description: "Brand names shown on product pages" },
];

const humanize = (k: string) =>
  k.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

type OptionRow = { id: string; value: string; sort_order: number; active: boolean; gender: string | null };
type Row = { value: string; count: number; option?: OptionRow };

type GenderScope = "all" | "boys" | "girls";
const GENDER_SCOPES: { key: GenderScope; label: string }[] = [
  { key: "all", label: "All (shared)" },
];

const AdminFilters = () => {
  const [fields, setFields] = useState<FieldDef[]>(BUILT_IN_FIELDS);
  const [field, setField] = useState<FieldKey>("collection");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [search, setSearch] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newFieldOpen, setNewFieldOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [genderScope, setGenderScope] = useState<GenderScope>("all");

  const genderScoped = false;


  const isProductColumn = PRODUCT_COLUMN_FIELDS.includes(field);

  const load = async () => {
    setLoading(true);
    const optQuery = (supabase as any)
      .from("filter_options")
      .select("id, value, sort_order, active, gender")
      .eq("field", field);
    if (genderScoped) {
      if (genderScope === "all") optQuery.is("gender", null);
      else optQuery.eq("gender", genderScope);
    }
    const [prodRes, optRes] = await Promise.all([
      isProductColumn
        ? supabase.from("products").select(field as any).limit(5000)
        : Promise.resolve({ data: [] as any[], error: null as any }),
      optQuery,
    ]);
    if (prodRes.error) { toast.error(prodRes.error.message); setLoading(false); return; }

    const counts = new Map<string, number>();
    (prodRes.data ?? []).forEach((r: any) => {
      const v = r[field];
      if (v === null || v === undefined || String(v).trim() === "") return;
      const key = String(v);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const options: OptionRow[] = (optRes.data ?? []) as any;
    const byKey = new Map<string, OptionRow>();
    options.forEach(o => byKey.set(o.value.toLowerCase(), o));

    // When gender-scoped, do NOT merge product-derived values across scopes.
    const allValues = genderScoped
      ? new Set<string>(options.map(o => o.value))
      : new Set<string>([...counts.keys(), ...options.map(o => o.value)]);
    const list: Row[] = Array.from(allValues).map(v => ({
      value: v,
      count: counts.get(v) ?? 0,
      option: byKey.get(v.toLowerCase()),
    })).sort((a, b) => (a.option?.sort_order ?? 0) - (b.option?.sort_order ?? 0)
                    || a.value.toLowerCase().localeCompare(b.value.toLowerCase()));
    setRows(list);
    setLoading(false);
  };


  useEffect(() => { load(); /* eslint-disable-next-line */ }, [field, genderScope]);

  // Discover custom filter fields (any distinct filter_options.field not in built-ins)
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("filter_options").select("field");
      const builtInKeys = new Set(BUILT_IN_FIELDS.map((f) => f.key));
      const custom = new Set<string>();
      (data ?? []).forEach((r: any) => {
        if (r?.field && !builtInKeys.has(r.field)) custom.add(r.field);
      });
      if (custom.size === 0) return;
      const customDefs: FieldDef[] = Array.from(custom).sort().map((k) => ({
        key: k, label: humanize(k), description: `Custom filter '${humanize(k)}'`,
      }));
      setFields([...BUILT_IN_FIELDS, ...customDefs]);
    })();
  }, []);

  const addNewFilter = async () => {
    const label = newFieldLabel.trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (!key) { toast.error("Invalid name"); return; }
    if (fields.some((f) => f.key === key)) { toast.error("Filter already exists"); return; }
    // Seed with a placeholder row so future reloads discover the field
    const { error } = await (supabase as any)
      .from("filter_options").insert({ field: key, value: `New ${label} value`, active: false });
    if (error) { toast.error(error.message); return; }
    const def: FieldDef = { key, label, description: `Custom filter '${label}'` };
    setFields((fs) => [...fs, def]);
    setField(key);
    setNewFieldOpen(false);
    setNewFieldLabel("");
    toast.success(`Filter "${label}" added`);
  };


  const filtered = useMemo(
    () => rows.filter(r => r.value.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  const addValue = async () => {
    const val = newValue.trim();
    if (!val) return;
    const payload: any = { field, value: val };
    if (genderScoped) payload.gender = genderScope === "all" ? null : genderScope;
    const { error } = await (supabase as any).from("filter_options").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Added");
    setNewValue("");
    load();
  };


  const toggleActive = async (row: Row, active: boolean) => {
    if (row.option) {
      const { error } = await (supabase as any)
        .from("filter_options").update({ active }).eq("id", row.option.id);
      if (error) return toast.error(error.message);
    } else {
      // create so we can hide a product-derived value if needed
      const payload: any = { field, value: row.value, active };
      if (genderScoped) payload.gender = genderScope === "all" ? null : genderScope;
      const { error } = await (supabase as any).from("filter_options").insert(payload);
      if (error) return toast.error(error.message);
    }
    load();
  };

  const rename = async (from: string, to: string, option?: OptionRow) => {
    const target = to.trim();
    if (!target) { toast.error("Value cannot be empty"); return; }
    if (target === from) { setEditing(null); return; }
    const merging = rows.some(r => r.value === target);
    const msg = merging
      ? `Merge "${from}" into "${target}"? All products with "${from}" will be updated.`
      : `Rename "${from}" to "${target}"?`;
    if (!confirm(msg)) return;

    if (isProductColumn) {
      const { error } = await (supabase as any).from("products").update({ [field]: target }).eq(field, from);
      if (error) { toast.error(error.message); return; }
    }
    if (option) {
      await (supabase as any).from("filter_options").update({ value: target }).eq("id", option.id);
    }
    toast.success(merging ? "Merged" : "Renamed");
    setEditing(null);
    load();
  };

  const remove = async (row: Row) => {
    const hasProducts = row.count > 0;
    const msg = hasProducts
      ? `Delete "${row.value}"? This clears the field on ${row.count} product(s) and removes the filter option.`
      : `Delete filter option "${row.value}"?`;
    if (!confirm(msg)) return;
    if (hasProducts && isProductColumn) {
      const { error } = await (supabase as any).from("products").update({ [field]: null }).eq(field, row.value);
      if (error) { toast.error(error.message); return; }
    }
    if (row.option) {
      const { error } = await (supabase as any).from("filter_options").delete().eq("id", row.option.id);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <div className="flex items-center gap-2">
        <FilterIcon className="w-5 h-5 text-primary" />
        <h1 className="font-display text-2xl font-bold">Storefront Filters</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Add, edit, enable, or delete filter values shown in the storefront sidebar. Renaming to an existing value merges them.
      </p>

      <FilterSectionVisibility />



      <div className="flex flex-wrap gap-2 items-center">
        {fields.map(f => (
          <button
            key={f.key}
            onClick={() => { setField(f.key); setEditing(null); setSearch(""); setNewValue(""); }}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              field === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:border-primary/50"
            }`}
          >
            {f.label}
          </button>
        ))}
        {newFieldOpen ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              placeholder="Filter name (e.g. Fabric)"
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addNewFilter();
                if (e.key === "Escape") { setNewFieldOpen(false); setNewFieldLabel(""); }
              }}
              className="h-8 w-44 text-sm"
            />
            <Button size="sm" onClick={addNewFilter} disabled={!newFieldLabel.trim()}>Create</Button>
            <Button size="sm" variant="ghost" onClick={() => { setNewFieldOpen(false); setNewFieldLabel(""); }}>Cancel</Button>
          </div>
        ) : (
          <button
            onClick={() => setNewFieldOpen(true)}
            className="px-3 py-1.5 rounded-full text-sm border border-dashed hover:border-primary/60 text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> New filter
          </button>
        )}
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h2 className="font-semibold">{fields.find(f => f.key === field)?.label} values</h2>
            <p className="text-xs text-muted-foreground">{fields.find(f => f.key === field)?.description}</p>
          </div>
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {genderScoped && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Scope:</span>
            {GENDER_SCOPES.map((g) => (
              <button
                key={g.key}
                onClick={() => setGenderScope(g.key)}
                className={`px-3 py-1 rounded-full text-xs border transition ${
                  genderScope === g.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:border-primary/50"
                }`}
              >
                {g.label}
              </button>
            ))}
            <span className="text-xs text-muted-foreground ml-2">
              Sizes here appear only when {genderScope === "all" ? "no gender is selected or shared across genders" : `"${genderScope}" is selected`} on the storefront.
            </span>
          </div>
        )}


        <div className="flex gap-2 mb-4">
          <Input
            placeholder={`New ${fields.find(f => f.key === field)?.label.toLowerCase()} value…`}

            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addValue(); }}
          />
          <Button onClick={addValue} disabled={!newValue.trim()}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No values yet. Add one above.</p>
        ) : (
          <div className="divide-y">
            {filtered.map((r) => {
              const isEditing = editing === r.value;
              const active = r.option ? r.option.active : true;
              return (
                <div key={r.value} className="flex items-center gap-3 py-2">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <Input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") rename(r.value, editValue, r.option);
                          if (e.key === "Escape") setEditing(null);
                        }}
                      />
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium truncate ${!active ? "line-through text-muted-foreground" : ""}`}>{r.value}</span>
                        <Badge variant="outline" className="shrink-0">{r.count} products</Badge>
                        {!r.option && r.count > 0 && (
                          <Badge variant="secondary" className="shrink-0">from products</Badge>
                        )}
                        {r.option && r.count === 0 && (
                          <Badge variant="secondary" className="shrink-0">unused</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch checked={active} onCheckedChange={(v) => toggleActive(r, v)} />
                    </div>
                  )}
                  {isEditing ? (
                    <>
                      <Button size="sm" onClick={() => rename(r.value, editValue, r.option)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(r.value); setEditValue(r.value); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

type VisibilityRow = { id: string; section_key: string; label: string; visible: boolean; sort_order: number };

const FilterSectionVisibility = () => {
  const [rows, setRows] = useState<VisibilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("shop_filter_visibility")
      .select("id, section_key, label, visible, sort_order")
      .order("sort_order");
    if (error) toast.error(error.message);
    setRows((data as VisibilityRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (row: VisibilityRow, visible: boolean) => {
    const { error } = await (supabase as any)
      .from("shop_filter_visibility").update({ visible }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, visible } : r)));
  };

  const saveLabel = async (row: VisibilityRow) => {
    const label = labelDraft.trim();
    if (!label) { setEditingId(null); return; }
    const { error } = await (supabase as any)
      .from("shop_filter_visibility").update({ label }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, label } : r)));
    setEditingId(null);
    toast.success("Renamed");
  };

  return (
    <Card className="p-4">
      <div className="mb-3">
        <h2 className="font-semibold">Shop filter sections</h2>
        <p className="text-xs text-muted-foreground">Show, hide, or rename the sections that appear in the shop filter sidebar.</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <div className="divide-y">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-2">
              <div className="flex-1 min-w-0">
                {editingId === r.id ? (
                  <Input
                    autoFocus
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveLabel(r);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="max-w-xs"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${!r.visible ? "text-muted-foreground" : ""}`}>{r.label}</span>
                    <Badge variant="outline" className="text-[10px]">{r.section_key}</Badge>
                  </div>
                )}
              </div>
              <Switch checked={r.visible} onCheckedChange={(v) => toggle(r, v)} />
              {editingId === r.id ? (
                <>
                  <Button size="sm" onClick={() => saveLabel(r)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => { setEditingId(r.id); setLabelDraft(r.label); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default AdminFilters;

