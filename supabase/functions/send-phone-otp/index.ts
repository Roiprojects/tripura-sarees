// Send a 6-digit OTP to a phone number. Stores a hash + expiry in phone_otps.
import { createClient } from "npm:@supabase/supabase-js@2";

const STORE_NAME = Deno.env.get("STORE_NAME")?.trim() || "Tripura Sarees";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sha256Hex(s: string) {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function cleanPhone(input: string) {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length === 10) return "+91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return "+" + digits;
  if (digits.length >= 11) return "+" + digits;
  return null;
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
    const { phone } = await req.json().catch(() => ({}));
    const e164 = cleanPhone(phone);
    if (!e164) return json({ error: "invalid_phone" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const smsConfig = getSmsConfig();
    if (!smsConfig) {
      console.error("NETTYFISH credentials are not configured");
      return json({ error: "sms_not_configured", message: "SMS service is not configured." }, 500);
    }

    const since = new Date(Date.now() - 30_000).toISOString();
    const { count } = await supabase
      .from("phone_otps")
      .select("id", { count: "exact", head: true })
      .eq("phone", e164)
      .gt("created_at", since);
    if ((count ?? 0) > 0) return json({ error: "rate_limited", message: "Please wait a few seconds before requesting another OTP." }, 429);

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_hash = await sha256Hex(code);
    const expires_at = new Date(Date.now() + 10 * 60_000).toISOString();

    const { error } = await supabase.from("phone_otps").insert({
      phone: e164,
      code_hash,
      expires_at,
    });
    if (error) {
      console.error("insert otp failed", error);
      return json({ error: "db_error" }, 500);
    }

    const numberForSms = e164.replace(/^\+/, "");
    const text = `Your ${STORE_NAME} login OTP is ${code}. This OTP is valid for 10 minutes. Do not share this OTP with anyone.`;
    const url =
      `https://retailsms.nettyfish.com/api/mt/SendSMS?user=${encodeURIComponent(smsConfig.user)}` +
      `&password=${encodeURIComponent(smsConfig.password)}` +
      `&senderid=${encodeURIComponent(smsConfig.senderId)}` +
      `&channel=Trans&DCS=0&flashsms=0` +
      `&number=${encodeURIComponent(numberForSms)}` +
      `&text=${encodeURIComponent(text)}` +
      `&route=${encodeURIComponent(smsConfig.route)}`;

    let delivery: "sms" | "failed" = "failed";
    try {
      const res = await fetch(url, { method: "GET" });
      const body = await res.text();
      console.log("nettyfish response", res.status, body);
      if (res.ok) {
        delivery = "sms";
      } else {
        console.error("nettyfish send failed", res.status, body);
      }
    } catch (e) {
      console.error("nettyfish fetch threw", e);
    }

    if (delivery !== "sms") {
      return json({ error: "sms_failed", message: "Couldn't send OTP. Please try again." }, 502);
    }

    return json({ ok: true, phone: e164, delivery });
  } catch (e) {
    console.error("send-phone-otp error", e);
    return json({ error: "server_error" }, 500);
  }
});

