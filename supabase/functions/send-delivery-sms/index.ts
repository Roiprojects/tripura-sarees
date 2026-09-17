// Send "your order has been delivered" SMS to the customer via Nettyfish.
import { createClient } from "npm:@supabase/supabase-js@2";

const STORE_NAME = Deno.env.get("STORE_NAME")?.trim() || "Tripura Sarees";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function toIndianMsisdn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return "91" + digits.slice(1);
  return digits.length >= 11 ? digits : null;
}

function getSmsConfig() {
  const user = Deno.env.get("NETTYFISH_USER")?.trim();
  const password = Deno.env.get("NETTYFISH_PASSWORD")?.trim();
  const senderId = Deno.env.get("NETTYFISH_SENDER_ID")?.trim();
  const route = Deno.env.get("NETTYFISH_ROUTE")?.trim() || "17";
  if (!user || !password || !senderId) return null;
  return { user, password, senderId, route };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const { order_id } = await req.json().catch(() => ({}));
    if (!order_id) return json({ error: "missing_order_id" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!anon) return json({ error: "missing_anon_key" }, 500);

    const smsConfig = getSmsConfig();
    if (!smsConfig) return json({ error: "sms_not_configured" }, 500);

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceRole);

    const { data: authData } = await userClient.auth.getUser();
    const caller = authData?.user;
    if (!caller) return json({ error: "unauthorized" }, 401);

    const [{ data: adminRole }, { data: activeStaff }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle(),
      admin.from("staff_profiles").select("user_id, active").eq("user_id", caller.id).eq("active", true).maybeSingle(),
    ]);
    if (!adminRole && !activeStaff) return json({ error: "forbidden" }, 403);

    const { data: order, error } = await admin
      .from("orders")
      .select("id, status, shipping_address")
      .eq("id", order_id)
      .maybeSingle();
    if (error || !order) return json({ error: "order_not_found" }, 404);

    const addr = (order.shipping_address ?? {}) as Record<string, string>;
    const number = toIndianMsisdn(addr.phone || addr.mobile);
    if (!number) return json({ error: "no_phone" }, 400);

    const shortId = String(order.id).slice(0, 8).toUpperCase();
    const text =
      `Your ${STORE_NAME} order ${shortId} has been delivered successfully. ` +
      `We hope you love draping your new saree. Thank you for shopping with us.`;

    const url =
      `https://retailsms.nettyfish.com/api/mt/SendSMS?user=${encodeURIComponent(smsConfig.user)}` +
      `&password=${encodeURIComponent(smsConfig.password)}` +
      `&senderid=${encodeURIComponent(smsConfig.senderId)}` +
      `&channel=Trans&DCS=0&flashsms=0` +
      `&number=${encodeURIComponent(number)}` +
      `&text=${encodeURIComponent(text)}` +
      `&route=${encodeURIComponent(smsConfig.route)}`;

    const res = await fetch(url);
    const body = await res.text();
    console.log("delivery sms response", res.status, body);
    if (!res.ok) return json({ error: "sms_failed", status: res.status, body }, 502);

    return json({ ok: true, sent_to: number, order_id: shortId });
  } catch (e) {
    console.error("send-delivery-sms error", e);
    return json({ error: "server_error" }, 500);
  }
});
