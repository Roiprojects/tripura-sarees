// Admin-only endpoint to create / update / delete staff users.
// Uses the service role key to manage auth users.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function normalizePermissions(permissions: any[] = []) {
  const granted = new Set(
    permissions
      .filter((p) => p && p.module && (p.can_view || p.can_edit))
      .map((p) => String(p.module)),
  );

  const rows: Array<{ module: string; can_view: boolean; can_edit: boolean }> = [];
  if (['products.add', 'products.edit', 'products.delete'].some((key) => granted.has(key))) {
    rows.push({ module: 'products', can_view: true, can_edit: true });
  }
  if (granted.has('orders.manage')) rows.push({ module: 'orders', can_view: true, can_edit: true });
  if (granted.has('customers.manage')) rows.push({ module: 'customers', can_view: true, can_edit: true });
  if (granted.has('homepage.manage')) rows.push({ module: 'homepage', can_view: true, can_edit: true });
  if (granted.has('categories.manage')) rows.push({ module: 'categories', can_view: true, can_edit: true });
  if (granted.has('coupons.manage')) rows.push({ module: 'coupons', can_view: true, can_edit: true });
  if (granted.has('refunds.manage')) rows.push({ module: 'refunds', can_view: true, can_edit: true });

  return rows;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes } = await userClient.auth.getUser();
  const caller = userRes?.user;
  if (!caller) return json({ error: 'Unauthorized' }, 401);

  const { data: roleRow } = await userClient
    .from('user_roles')
    .select('role')
    .eq('user_id', caller.id)
    .eq('role', 'admin')
    .maybeSingle();
  if (!roleRow) return json({ error: 'Admin only' }, 403);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const action = body?.action as string;

  try {
    if (action === 'create') {
      const { email, password, name, mobile, permissions } = body;
      if (!email || !password || !name) return json({ error: 'email, password, name required' }, 400);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, is_staff: true },
      });
      if (createErr || !created.user) return json({ error: createErr?.message || 'Create failed' }, 400);
      const newId = created.user.id;

      const { error: profErr } = await admin.from('staff_profiles').insert({
        user_id: newId, name, mobile, email, active: true, created_by: caller.id,
      });
      if (profErr) {
        await admin.auth.admin.deleteUser(newId);
        return json({ error: profErr.message }, 400);
      }

      const normalizedPermissions = normalizePermissions(Array.isArray(permissions) ? permissions : []);
      if (normalizedPermissions.length) {
        await admin.from('staff_permissions').insert(
          normalizedPermissions.map((p) => ({ user_id: newId, ...p }))
        );
      }

      return json({ user_id: newId });
    }

    if (action === 'update') {
      const { user_id, name, mobile, email, active, password, permissions } = body;
      if (!user_id) return json({ error: 'user_id required' }, 400);

      const authPatch: any = {};
      if (email) authPatch.email = email;
      if (password) authPatch.password = password;
      if (active === false) authPatch.ban_duration = '876600h';
      if (active === true) authPatch.ban_duration = 'none';
      if (Object.keys(authPatch).length) {
        const { error } = await admin.auth.admin.updateUserById(user_id, authPatch);
        if (error) return json({ error: error.message }, 400);
      }

      const profPatch: any = {};
      if (name !== undefined) profPatch.name = name;
      if (mobile !== undefined) profPatch.mobile = mobile;
      if (email !== undefined) profPatch.email = email;
      if (active !== undefined) profPatch.active = active;
      if (Object.keys(profPatch).length) {
        await admin.from('staff_profiles').update(profPatch).eq('user_id', user_id);
      }

      if (Array.isArray(permissions)) {
        await admin.from('staff_permissions').delete().eq('user_id', user_id);
        const normalizedPermissions = normalizePermissions(permissions);
        if (normalizedPermissions.length) {
          await admin.from('staff_permissions').insert(
            normalizedPermissions.map((p) => ({ user_id, ...p }))
          );
        }
      }
      return json({ ok: true });
    }

    if (action === 'delete') {
      const { user_id } = body;
      if (!user_id) return json({ error: 'user_id required' }, 400);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === 'impersonate') {
      const { user_id, redirect_to } = body;
      if (!user_id) return json({ error: 'user_id required' }, 400);
      const { data: staff } = await admin.from('staff_profiles').select('email, active').eq('user_id', user_id).maybeSingle();
      if (!staff) return json({ error: 'Staff not found' }, 404);
      if (!staff.active) return json({ error: 'Staff account is disabled' }, 400);
      const origin = req.headers.get('origin') ?? '';
      const target = redirect_to || `${origin}/staff/dashboard?welcome=1`;
      const { data: link, error } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: staff.email,
        options: { redirectTo: target },
      });
      if (error || !link?.properties?.action_link) {
        return json({ error: error?.message || 'Failed to generate login link' }, 400);
      }
      return json({ action_link: link.properties.action_link });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e: any) {
    console.error('admin-manage-staff error', e);
    return json({ error: e?.message ?? 'Internal error' }, 500);
  }
});
