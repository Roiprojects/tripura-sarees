import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { StaffPermKey, StaffPermission, expandStaffPermissionRows } from "@/lib/staffModules";

export const useStaff = () => {
  const { user, loading: authLoading } = useAuth();
  const [isStaff, setIsStaff] = useState(false);
  const [active, setActive] = useState(false);
  const [profile, setProfile] = useState<{ name: string; email: string; mobile: string | null } | null>(null);
  const [perms, setPerms] = useState<Set<StaffPermKey>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsStaff(false); setPerms(new Set()); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const [{ data: prof }, { data: permRows }] = await Promise.all([
        supabase.from("staff_profiles" as any).select("name,email,mobile,active").eq("user_id", user.id).maybeSingle(),
        supabase.from("staff_permissions" as any).select("module,can_view,can_edit").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      if (prof) {
        setIsStaff(true);
        setActive(!!(prof as any).active);
        setProfile({ name: (prof as any).name, email: (prof as any).email, mobile: (prof as any).mobile });
      }
      setPerms(expandStaffPermissionRows(((permRows as any) ?? []) as StaffPermission[]));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const has = (key: StaffPermKey) => perms.has(key);
  const hasAny = (...keys: StaffPermKey[]) => keys.some((k) => perms.has(k));

  return { isStaff, active, profile, perms, has, hasAny, loading: authLoading || loading };
};
