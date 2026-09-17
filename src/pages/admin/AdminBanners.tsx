import { CrudPage } from "@/components/admin/CrudPage";

const AdminBanners = () => (
  <CrudPage
    table="banners"
    title="Banners"
    searchKey="title"
    orderBy={{ column: "sort_order", ascending: true }}
    defaultValues={{ active: true, position: "hero", sort_order: 0 }}
    columns={[
      { key: "title", label: "Title" },
      { key: "position", label: "Position" },
      { key: "sort_order", label: "Order" },
      { key: "active", label: "Active", render: (r) => (r.active ? "✓" : "—") },
    ]}
    fields={[
      { key: "title", label: "Title", required: true },
      { key: "subtitle", label: "Subtitle" },
      { key: "body", label: "Body", type: "textarea" },
      { key: "image_url", label: "Image URL" },
      { key: "cta_label", label: "CTA label" },
      { key: "cta_url", label: "CTA URL" },
      { key: "position", label: "Position (hero/strip/...)" },
      { key: "sort_order", label: "Sort order", type: "number" },
      { key: "active", label: "Active", type: "boolean" },
    ]}
  />
);

export default AdminBanners;
