import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);
    const orderId = String(body?.order_id ?? '');
    if (!Number.isFinite(amount) || amount <= 0) return json({ error: 'Invalid amount' }, 400);
    if (!orderId) return json({ error: 'order_id required' }, 400);

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) return json({ error: 'Razorpay not configured' }, 500);

    const amountPaise = Math.round(amount * 100);
    const auth = btoa(`${keyId}:${keySecret}`);

    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: orderId.slice(0, 40),
        notes: { internal_order_id: orderId, user_id: claimsData.claims.sub },
      }),
    });

    const rzpData = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error('Razorpay order create failed', rzpData);
      return json({ error: rzpData?.error?.description || 'Razorpay error' }, 502);
    }

    // Persist the razorpay order id on our order row
    await supabase.from('orders')
      .update({ razorpay_order_id: rzpData.id })
      .eq('id', orderId);

    return json({
      razorpay_order_id: rzpData.id,
      amount: rzpData.amount,
      currency: rzpData.currency,
      key_id: keyId,
    });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
