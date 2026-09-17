// ERP integration API. Single edge function dispatching sub-routes:
//   /functions/v1/erp-api/summary
//   /functions/v1/erp-api/orders
//   /functions/v1/erp-api/inventory
//   /functions/v1/erp-api/sync
// Auth: x-api-key: <ERP_API_KEY>  OR  Authorization: Bearer <ERP_API_KEY>
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-api-key, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const APPROVED_STATUSES = new Set(["approved", "processing", "shipped", "delivered", "completed"]);
const NOT_APPROVED_STATUSES = new Set(["pending", "awaiting_approval", "on_hold"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function log(entry: {
  endpoint: string;
  ip: string | null;
  valid: boolean;
  status: number;
  error?: string | null;
}) {
  try {
    await admin.from("erp_api_logs").insert({
      endpoint: entry.endpoint,
      ip_address: entry.ip,
      api_key_valid: entry.valid,
      status_code: entry.status,
      error_message: entry.error ?? null,
    });
  } catch (_) { /* ignore */ }
}

function getKey(req: Request): string | null {
  const h = req.headers;
  const x = h.get("x-api-key");
  if (x) return x.trim();
  const auth = h.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return null;
}

function parsePaging(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1") || 1);
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "50") || 50;
  const limit = Math.min(200, Math.max(1, limitRaw));
  return { page, limit, from: (page - 1) * limit, to: page * limit - 1 };
}

async function handleSummary() {
  const [{ data: orders }, { data: products }] = await Promise.all([
    admin.from("orders").select("status"),
    admin.from("products").select("stock"),
  ]);
  const counts: Record<string, number> = {};
  for (const o of orders ?? []) {
    const s = (o as any).status ?? "unknown";
    counts[s] = (counts[s] ?? 0) + 1;
  }
  let approved = 0, notApproved = 0;
  for (const [s, n] of Object.entries(counts)) {
    if (APPROVED_STATUSES.has(s)) approved += n;
    else if (NOT_APPROVED_STATUSES.has(s)) notApproved += n;
  }
  const totalStock = (products ?? []).reduce((a, p: any) => a + (p.stock ?? 0), 0);
  const low = (products ?? []).filter((p: any) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5).length;
  const out = (products ?? []).filter((p: any) => (p.stock ?? 0) <= 0).length;

  return {
    success: true,
    generated_at: new Date().toISOString(),
    orders_summary: {
      total_orders: orders?.length ?? 0,
      approved_orders: approved,
      not_approved_orders: notApproved,
      processing_orders: counts["processing"] ?? 0,
      completed_orders: (counts["completed"] ?? 0) + (counts["delivered"] ?? 0),
      cancelled_orders: counts["cancelled"] ?? 0,
      counts_by_status: counts,
    },
    inventory_summary: {
      total_products: products?.length ?? 0,
      total_stock_quantity: totalStock,
      low_stock_products: low,
      out_of_stock_products: out,
    },
  };
}

async function handleOrders(url: URL) {
  const { page, limit, from, to } = parsePaging(url);
  const status = url.searchParams.get("status");
  const approved = url.searchParams.get("approved");
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");
  const updatedSince = url.searchParams.get("updated_since");

  let q = admin
    .from("orders")
    .select("id,status,total,created_at,payment_method,payment_status,shipping_address,user_id", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status) q = q.eq("status", status);
  if (approved === "true") q = q.in("status", Array.from(APPROVED_STATUSES));
  if (approved === "false") q = q.in("status", Array.from(NOT_APPROVED_STATUSES));
  if (dateFrom) q = q.gte("created_at", dateFrom);
  if (dateTo) q = q.lte("created_at", dateTo);
  if (updatedSince) q = q.gte("created_at", updatedSince);

  const { data: rows, count, error } = await q.range(from, to);
  if (error) throw error;

  const ids = (rows ?? []).map((r: any) => r.id);
  const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id).filter(Boolean)));
  const [{ data: items }, { data: profiles }] = await Promise.all([
    ids.length
      ? admin.from("order_items").select("order_id,product_id,product_name,sku,quantity,price").in("order_id", ids)
      : Promise.resolve({ data: [] as any[] }),
    userIds.length
      ? admin.from("profiles").select("id,full_name,email,phone").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const itemsByOrder = new Map<string, any[]>();
  for (const it of items ?? []) {
    const arr = itemsByOrder.get((it as any).order_id) ?? [];
    arr.push(it);
    itemsByOrder.set((it as any).order_id, arr);
  }
  const profById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  const orders = (rows ?? []).map((r: any) => {
    const its = itemsByOrder.get(r.id) ?? [];
    const prof: any = profById.get(r.user_id);
    const addr = r.shipping_address ?? {};
    const customerName =
      prof?.full_name || addr.full_name || addr.name || "Guest";
    return {
      order_id: r.id,
      order_status: r.status,
      is_approved: APPROVED_STATUSES.has(r.status),
      customer_name: customerName,
      customer_phone: prof?.phone ?? addr.phone ?? null,
      customer_email: prof?.email ?? addr.email ?? null,
      payment_method: r.payment_method ?? null,
      payment_status: r.payment_status ?? null,
      shipping_address: addr,
      total_amount: Number(r.total ?? 0),
      currency: "INR",
      item_count: its.length,
      items: its.map((it: any) => ({
        product_id: it.product_id,
        product_name: it.product_name,
        sku: it.sku,
        quantity: it.quantity,
        unit_price: Number(it.price ?? 0),
        subtotal: Number(it.price ?? 0) * (it.quantity ?? 0),
      })),
      created_at: r.created_at,
      updated_at: r.created_at,
    };
  });

  return {
    success: true,
    page,
    limit,
    total_records: count ?? orders.length,
    total_pages: Math.max(1, Math.ceil((count ?? orders.length) / limit)),
    orders,
    ...(orders.length === 0 ? { message: "No records found" } : {}),
  };
}

async function handleInventory(url: URL) {
  const { page, limit, from, to } = parsePaging(url);
  const updatedSince = url.searchParams.get("updated_since");
  const lowOnly = url.searchParams.get("low_stock_only") === "true";
  const outOnly = url.searchParams.get("out_of_stock_only") === "true";

  let q = admin
    .from("products")
    .select("id,name,sku,price,stock,created_at,category_id", { count: "exact" })
    .order("created_at", { ascending: false });

  if (updatedSince) q = q.gte("created_at", updatedSince);
  if (outOnly) q = q.lte("stock", 0);
  else if (lowOnly) q = q.gt("stock", 0).lte("stock", 5);

  const { data: rows, count, error } = await q.range(from, to);
  if (error) throw error;

  const catIds = Array.from(new Set((rows ?? []).map((r: any) => r.category_id).filter(Boolean)));
  const { data: cats } = catIds.length
    ? await admin.from("categories").select("id,name").in("id", catIds)
    : { data: [] as any[] };
  const catById = new Map((cats ?? []).map((c: any) => [c.id, c.name]));

  const products = (rows ?? []).map((p: any) => ({
    product_id: p.id,
    product_name: p.name,
    sku: p.sku,
    category: catById.get(p.category_id) ?? null,
    stock_quantity: p.stock ?? 0,
    stock_status: (p.stock ?? 0) <= 0 ? "out_of_stock" : (p.stock ?? 0) <= 5 ? "low_stock" : "in_stock",
    price: Number(p.price ?? 0),
    updated_at: p.created_at,
  }));

  return {
    success: true,
    page,
    limit,
    total_records: count ?? products.length,
    total_pages: Math.max(1, Math.ceil((count ?? products.length) / limit)),
    products,
    ...(products.length === 0 ? { message: "No records found" } : {}),
  };
}

async function handleSync(url: URL) {
  const { page, limit } = parsePaging(url);
  const [summary, orders, inventory] = await Promise.all([
    handleSummary(),
    handleOrders(url),
    handleInventory(url),
  ]);
  return {
    success: true,
    generated_at: new Date().toISOString(),
    summary: {
      total_orders: summary.orders_summary.total_orders,
      approved_orders: summary.orders_summary.approved_orders,
      processing_orders: summary.orders_summary.processing_orders,
      not_approved_orders: summary.orders_summary.not_approved_orders,
      total_products: summary.inventory_summary.total_products,
      total_stock_quantity: summary.inventory_summary.total_stock_quantity,
    },
    orders: orders.orders,
    inventory: inventory.products,
    pagination: { page, limit },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  // Path can be /functions/v1/erp-api/<route> or /erp-api/<route>
  const parts = url.pathname.split("/").filter(Boolean);
  const route = parts[parts.length - 1] || "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const endpoint = `/api/erp/${route}`;

  const provided = getKey(req);
  const expected = Deno.env.get("ERP_API_KEY");
  if (!expected) {
    await log({ endpoint, ip, valid: false, status: 500, error: "ERP_API_KEY not configured" });
    return json({ success: false, error: "Server misconfigured" }, 500);
  }
  if (!provided || provided !== expected) {
    await log({ endpoint, ip, valid: false, status: 401, error: provided ? "Invalid key" : "Missing key" });
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  try {
    let payload: any;
    switch (route) {
      case "summary":   payload = await handleSummary(); break;
      case "orders":    payload = await handleOrders(url); break;
      case "inventory": payload = await handleInventory(url); break;
      case "sync":      payload = await handleSync(url); break;
      default:
        await log({ endpoint, ip, valid: true, status: 404, error: "Unknown route" });
        return json({ success: false, error: "Not found. Use /summary, /orders, /inventory, or /sync." }, 404);
    }
    await log({ endpoint, ip, valid: true, status: 200 });
    return json(payload, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await log({ endpoint, ip, valid: true, status: 500, error: msg });
    return json({ success: false, error: "Internal Server Error" }, 500);
  }
});
