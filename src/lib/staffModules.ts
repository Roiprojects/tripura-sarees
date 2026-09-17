// Granular RBAC permissions for staff. Each entry is a single boolean toggle
// shown to the admin and checked individually in the staff dashboard.
export type StaffPermKey =
  | "products.add"
  | "products.edit"
  | "products.delete"
  | "orders.manage"
  | "customers.manage"
  | "homepage.manage"
  | "categories.manage"
  | "coupons.manage"
  | "refunds.manage";

export type StaffPermGroup = {
  group: string;
  perms: { key: StaffPermKey; label: string; description?: string }[];
};

export const STAFF_PERMISSION_GROUPS: StaffPermGroup[] = [
  {
    group: "Products",
    perms: [
      { key: "products.add",    label: "Add Products",    description: "Create new products" },
      { key: "products.edit",   label: "Edit Products",   description: "Modify existing products" },
      { key: "products.delete", label: "Delete Products", description: "Remove products from catalog" },
    ],
  },
  {
    group: "Orders & Customers",
    perms: [
      { key: "orders.manage",    label: "Manage Orders",    description: "View and update orders" },
      { key: "customers.manage", label: "Manage Customers", description: "View customer records" },
    ],
  },
  {
    group: "Content",
    perms: [
      { key: "homepage.manage",   label: "Manage Homepage Content", description: "Banners, sections, reels" },
      { key: "categories.manage", label: "Manage Categories",       description: "Create and edit categories" },
    ],
  },
  {
    group: "Sales & Finance",
    perms: [
      { key: "coupons.manage", label: "Manage Coupons",        description: "Create and edit coupons" },
      { key: "refunds.manage", label: "Manage Refunds & Wallet", description: "Process refunds and wallet adjustments" },
    ],
  },
];

export const ALL_PERM_KEYS: StaffPermKey[] =
  STAFF_PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => p.key));

export type StaffPermission = { module: string; can_view: boolean; can_edit: boolean };

const DB_PERMISSION_MAP: Record<string, StaffPermKey[]> = {
  products: ["products.add", "products.edit", "products.delete"],
  orders: ["orders.manage"],
  customers: ["customers.manage"],
  homepage: ["homepage.manage"],
  categories: ["categories.manage"],
  coupons: ["coupons.manage"],
  refunds: ["refunds.manage"],
};

export function expandStaffPermissionRows(rows: StaffPermission[] = []): Set<StaffPermKey> {
  const granted = new Set<StaffPermKey>();

  for (const row of rows) {
    const mapped = DB_PERMISSION_MAP[row.module];
    if (mapped && (row.can_view || row.can_edit)) {
      mapped.forEach((key) => granted.add(key));
      continue;
    }

    if ((row.can_view || row.can_edit) && ALL_PERM_KEYS.includes(row.module as StaffPermKey)) {
      granted.add(row.module as StaffPermKey);
    }
  }

  return granted;
}

export function serializeStaffPermissionKeys(keys: Iterable<StaffPermKey>): StaffPermission[] {
  const granted = new Set(keys);
  const rows: StaffPermission[] = [];

  if (granted.has("products.add") || granted.has("products.edit") || granted.has("products.delete")) {
    rows.push({ module: "products", can_view: true, can_edit: true });
  }
  if (granted.has("orders.manage")) rows.push({ module: "orders", can_view: true, can_edit: true });
  if (granted.has("customers.manage")) rows.push({ module: "customers", can_view: true, can_edit: true });
  if (granted.has("homepage.manage")) rows.push({ module: "homepage", can_view: true, can_edit: true });
  if (granted.has("categories.manage")) rows.push({ module: "categories", can_view: true, can_edit: true });
  if (granted.has("coupons.manage")) rows.push({ module: "coupons", can_view: true, can_edit: true });
  if (granted.has("refunds.manage")) rows.push({ module: "refunds", can_view: true, can_edit: true });

  return rows;
}

export async function logStaffActivity(
  supabase: any,
  userId: string,
  action: string,
  opts?: { module?: string; target_id?: string; metadata?: Record<string, unknown> }
) {
  try {
    await supabase.from("staff_activity_log").insert({
      user_id: userId,
      action,
      module: opts?.module ?? null,
      target_id: opts?.target_id ?? null,
      metadata: opts?.metadata ?? {},
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch (e) {
    console.warn("logStaffActivity failed", e);
  }
}
