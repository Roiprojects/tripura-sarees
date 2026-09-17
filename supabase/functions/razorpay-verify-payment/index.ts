import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ verified: false, error: 'Unauthorized: please sign in and try again.' }, 401);
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Validate the caller's JWT with the anon client
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return json({ verified: false, error: 'Session expired. Please sign in again.' }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.order_id ?? '');
    const razorpay_order_id = String(body?.razorpay_order_id ?? '');
    const razorpay_payment_id = String(body?.razorpay_payment_id ?? '');
    const razorpay_signature = String(body?.razorpay_signature ?? '');

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ verified: false, error: 'Missing payment fields.' }, 400);
    }

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      console.error('RAZORPAY_KEY_SECRET missing');
      return json({ verified: false, error: 'Payments are temporarily unavailable.' }, 500);
    }

    // Service-role client bypasses RLS for the payment-state writes
    // (customer RLS only allows updates while status='pending' AND payment_status<>'paid').
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Confirm the order exists and belongs to this user before mutating anything
    const { data: orderRow, error: fetchErr } = await admin
      .from('orders')
      .select('id, user_id, payment_status, status')
      .eq('id', orderId)
      .maybeSingle();
    if (fetchErr) {
      console.error('order fetch failed', fetchErr);
      return json({ verified: false, error: 'Could not load your order.' }, 500);
    }
    if (!orderRow) return json({ verified: false, error: 'Order not found.' }, 404);
    if (orderRow.user_id !== userId) {
      return json({ verified: false, error: 'This order does not belong to you.' }, 403);
    }

    // Idempotency: if we already marked this order paid, just return success.
    if (orderRow.payment_status === 'paid' && orderRow.status !== 'cancelled') {
      return json({ verified: true, idempotent: true });
    }

    // HMAC-SHA256(order_id|payment_id, secret) — hex
    const expected = await hmacSha256Hex(`${razorpay_order_id}|${razorpay_payment_id}`, keySecret);
    if (!timingSafeEqual(expected, razorpay_signature)) {
      console.error('signature mismatch for order', orderId);
      const { error: failErr } = await admin.from('orders').update({
        payment_status: 'failed',
        status: 'cancelled',
        cancellation_reason: 'Payment signature verification failed',
        razorpay_payment_id,
        razorpay_signature,
      }).eq('id', orderId);
      if (failErr) console.error('failed marking order failed', failErr);
      return json({ verified: false, error: 'Payment signature invalid.' }, 400);
    }

    const { error: updErr } = await admin.from('orders').update({
      payment_status: 'paid',
      status: 'confirmed',
      payment_method: 'razorpay',
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }).eq('id', orderId);

    if (updErr) {
      console.error('order update failed', updErr);
      return json({
        verified: false,
        error: 'Payment received, but order confirmation is pending. Please contact support.',
        payment_id: razorpay_payment_id,
        order_id: orderId,
      }, 500);
    }

    return json({ verified: true });
  } catch (e) {
    console.error('verify-payment fatal', e);
    return json({ verified: false, error: (e as Error).message || 'Unexpected error' }, 500);
  }
});

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
