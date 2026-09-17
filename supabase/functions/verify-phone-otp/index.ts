// Verify a 6-digit OTP, then create/find the user and return a magic-link
// token_hash the client can pass to supabase.auth.verifyOtp() to establish a session.
import { createClient } from "npm:@supabase/supabase-js@2";

// Must match site.auth.phoneEmailDomain in src/config/site.ts
const PHONE_AUTH_EMAIL_DOMAIN = Deno.env.get("PHONE_AUTH_EMAIL_DOMAIN")?.trim() || "phone.tripurasarees.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256Hex(s: string) {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cleanPhone(input: string) {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length === 10) return "+91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return "+" + digits;
  if (digits.length >= 11) return "+" + digits;
  return null;
}

function emailForPhone(e164: string) {
  // Stable, internal-only email used to represent the phone identity in Supabase Auth.
  const digits = e164.replace(/\D/g, "");
  return `phone_${digits}@${PHONE_AUTH_EMAIL_DOMAIN}`;
}

async function findUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
) {
  const needle = email.toLowerCase();
  const perPage = 200;

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("listUsers failed", error);
      return { user: null, error };
    }

    const users = data?.users ?? [];
    const match = users.find((user) => user.email?.toLowerCase() === needle) ?? null;
    if (match) return { user: match, error: null };
    if (users.length < perPage) break;
  }

  return { user: null, error: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const { phone, code } = await req.json().catch(() => ({}));
    const e164 = cleanPhone(phone);
    if (!e164) return json({ error: "invalid_phone" }, 400);
    if (!/^\d{6}$/.test(String(code ?? ""))) return json({ error: "invalid_code" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const code_hash = await sha256Hex(String(code));

    // Find the most recent valid OTP for this phone
    const { data: rows, error: selErr } = await admin
      .from("phone_otps")
      .select("*")
      .eq("phone", e164)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1);
    if (selErr) return json({ error: "db_error" }, 500);
    const row = rows?.[0];
    if (!row) return json({ error: "no_otp", message: "Please request a new code." }, 400);

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json({ error: "expired", message: "Code expired. Request a new one." }, 400);
    }
    if (row.attempts >= 5) {
      return json({ error: "too_many_attempts" }, 429);
    }
    if (row.code_hash !== code_hash) {
      await admin.from("phone_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      return json({ error: "wrong_code", message: "Incorrect code. Try again." }, 400);
    }

    await admin.from("phone_otps").update({ used: true }).eq("id", row.id);
    // Clean up older codes for this phone
    await admin.from("phone_otps").delete().eq("phone", e164).eq("used", false);

    const email = emailForPhone(e164);

    // Look up or create the user
    let userId: string | null = null;
    const { user: existing, error: listErr } = await findUserByEmail(admin, email);
    if (listErr) {
      return json({ error: "user_lookup_failed" }, 500);
    }

    if (existing) {
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, {
        phone: e164.replace(/^\+/, ""),
        email_confirm: true,
        user_metadata: { ...(existing.user_metadata || {}), phone: e164 },
      });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        phone: e164.replace(/^\+/, ""),
        user_metadata: { phone: e164, signup_method: "phone_otp" },
      });
      if (createErr || !created.user) {
        console.error("create user failed", createErr);
        return json({ error: "user_create_failed" }, 500);
      }
      userId = created.user.id;
    }

    // Generate a magiclink the client can immediately consume to start a session
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !link) {
      console.error("generateLink failed", linkErr);
      return json({ error: "link_failed" }, 500);
    }

    const token_hash =
      (link.properties as any)?.hashed_token ??
      (link.properties as any)?.token_hash ??
      null;
    if (!token_hash) return json({ error: "no_token" }, 500);

    return json({ ok: true, email, token_hash, user_id: userId });
  } catch (e) {
    console.error("verify-phone-otp error", e);
    return json({ error: "server_error" }, 500);
  }
});
