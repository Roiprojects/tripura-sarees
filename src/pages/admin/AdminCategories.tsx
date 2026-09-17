import { CrudPage } from "@/components/admin/CrudPage";
import { supabase } from "@/integrations/supabase/client";

const loadParents = async () => {
  const { data } = await supabase
    .from("categories")
    .select("id,name,parent_id")
    .order("name");
  const rows = data ?? [];
  const byId = new Map(rows.map((r: any) => [r.id, r]));
  const labelFor = (r: any): string => {
    if (!r.parent_id) return r.name;
    const parent = byId.get(r.parent_id);
    return parent ? `${labelFor(parent)} → ${r.name}` : r.name;
  };
  return rows.map((r: any) => ({ value: r.id, label: labelFor(r) }));
};

const AdminCategories = () => (
  <CrudPage
    table="categories"
    title="Categories"
    searchKey="name"
    orderBy={{ column: "sort_order", ascending: true }}
    columns={[
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "parent_id", label: "Parent", render: (r: any) => r.parent_id ? <span className="text-xs text-muted-foreground">{r.parent_id.slice(0, 8)}…</span> : <span className="text-xs">—</span> },
      { key: "sort_order", label: "Order" },
    ]}
    fields={[
      { key: "name", label: "Name", required: true },
      { key: "slug", label: "Slug", required: true, placeholder: "banarasi-silk" },
      { key: "parent_id", label: "Parent Category", type: "select", loadOptions: loadParents },
      { key: "sort_order", label: "Sort Order", type: "number", placeholder: "0" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "image_url", label: "Image URL" },
    ]}
  />
);

export default AdminCategories;
