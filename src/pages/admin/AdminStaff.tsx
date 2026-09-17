import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, ShieldCheck, History, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { STAFF_PERMISSION_GROUPS, StaffPermKey, StaffPermission, expandStaffPermissionRows, serializeStaffPermissionKeys } from "@/lib/staffModules";
import { useIsAdmin } from "@/hooks/useIsAdmin";

type Staff = {
  user_id: string;
  name: string;
  email: string;
  mobile: string | null;
  active: boolean;
  created_at: string;
};

const AdminStaff = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [list, setList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(true);
  const [granted, setGranted] = useState<Set<StaffPermKey>>(new Set());

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("staff_profiles" as any)
      .select("user_id, name, email, mobile, active, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setList(((data as any) ?? []) as Staff[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setEmail("");
    setMobile("");
    setPassword("");
    setActive(true);
    setGranted(new Set());
    setOpen(true);
  };

  const openEdit = async (s: Staff) => {
    setEditing(s);
    setName(s.name);
    setEmail(s.email);
    setMobile(s.mobile ?? "");
    setPassword("");
    setActive(s.active);
    const { data } = await supabase
      .from("staff_permissions" as any)
      .select("module, can_view, can_edit")
      .eq("user_id", s.user_id);
    setGranted(expandStaffPermissionRows(((data as any) ?? []) as StaffPermission[]));
    setOpen(true);
  };

  const toggle = (key: StaffPermKey, value: boolean) => {
    setGranted((prev) => {
      const next = new Set(prev);
      if (value) next.add(key); else next.delete(key);
      return next;
    });
  };

  const toggleGroup = (keys: StaffPermKey[], value: boolean) => {
    setGranted((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (value) next.add(k); else next.delete(k);
      }
      return next;
    });
  };

  const callFn = async (body: any) => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session?.access_token) {
      toast.error("Your admin session has ended. Please sign in again.");
      setTimeout(() => { window.location.href = "/admin/login"; }, 800);
      throw new Error("No admin session");
    }
    const { data, error } = await supabase.functions.invoke("admin-manage-staff", { body });
    if (error) {
      const status = (error as any)?.context?.status;
      if (status === 401) {
        toast.error("Session expired or not an admin. Please sign in again.");
        setTimeout(() => { window.location.href = "/admin/login"; }, 800);
      }
      throw new Error((data as any)?.error || error.message || "Request failed");
    }
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };

  const save = async () => {
    if (!name.trim() || !email.trim()) return toast.error("Name and email are required");
    if (!editing && !password) return toast.error("Set an initial password");
    setBusy(true);
    try {
      const permissions = serializeStaffPermissionKeys(granted);
      if (editing) {
        await callFn({ action: "update", user_id: editing.user_id, name, mobile, email, active, password: password || undefined, permissions });
        toast.success("Staff updated");
        setOpen(false);
        await load();
      } else {
        await callFn({ action: "create", email, password, name, mobile, permissions });
        toast.success(`Staff "${name}" created. They can now sign in at /admin/login with ${email}.`);
        setOpen(false);
        await load();
      }
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (/weak|known|easy to guess|pwned/i.test(msg)) {
        toast.error("Password is too weak or known to be leaked. Click Generate for a strong one.");
      } else {
        toast.error(msg || "Failed to save staff");
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (s: Staff) => {
    try {
      await callFn({ action: "update", user_id: s.user_id, active: !s.active });
      toast.success(s.active ? "Staff disabled" : "Staff enabled");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (s: Staff) => {
    if (!confirm(`Delete staff "${s.name}"? This removes their login.`)) return;
    try {
      await callFn({ action: "delete", user_id: s.user_id });
      toast.success("Staff deleted");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (adminLoading) {
    return <div className="p-10 flex items-center justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>;
  }
  if (!isAdmin) return <Navigate to="/admin/dashboard" replace />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UsersIcon className="w-6 h-6" /> Staff Management</h1>
          <p className="text-sm text-slate-500">Create staff accounts and pick which admin modules they can access. Staff sign in at <span className="font-mono">/admin/login</span> and only see the modules you grant.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/staff/activity" className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border bg-white hover:bg-slate-50">
            <History className="w-4 h-4" /> Activity log
          </Link>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add staff</Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
        ) : list.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No staff yet. Click "Add staff" to create one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Mobile</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.user_id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">{s.email}</td>
                    <td className="px-4 py-3">{s.mobile || "—"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(s)} className={`text-xs px-2 py-1 rounded ${s.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                        {s.active ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => openEdit(s)} className="p-2 rounded hover:bg-slate-100" title="Edit">
                          <Pencil className="w-4 h-4 text-slate-600" />
                        </button>
                        <button onClick={() => remove(s)} className="p-2 rounded hover:bg-red-50" title="Delete">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit staff" : "Add staff"}</DialogTitle>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Mobile</Label>
              <Input value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>{editing ? "New password (optional)" : "Password"}</Label>
              <div className="flex gap-2">
                <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editing ? "Leave blank to keep current" : "Min 10 chars, mixed"} />
                <Button type="button" variant="outline" onClick={() => {
                  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
                  const sym = "!@#$%&*";
                  let p = "";
                  for (let i = 0; i < 14; i++) p += chars[Math.floor(Math.random() * chars.length)];
                  p += sym[Math.floor(Math.random() * sym.length)];
                  setPassword(p);
                  navigator.clipboard?.writeText(p).catch(() => {});
                  toast.success("Strong password generated & copied");
                }}>Generate</Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Avoid common passwords (e.g. "password123"). Use the Generate button for a secure one.</p>
            </div>
            {editing && (
              <div className="sm:col-span-2 flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                <Label>Account active</Label>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold">Role & Permissions</h3>
            </div>
            <div className="space-y-3">
              {STAFF_PERMISSION_GROUPS.map((g) => {
                const groupKeys = g.perms.map((p) => p.key);
                const allOn = groupKeys.every((k) => granted.has(k));
                const someOn = groupKeys.some((k) => granted.has(k));
                return (
                  <div key={g.group} className="border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-2">
                      <div className="text-sm font-semibold text-slate-800">{g.group}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{allOn ? "All" : someOn ? "Some" : "None"}</span>
                        <Switch checked={allOn} onCheckedChange={(v) => toggleGroup(groupKeys, v)} />
                      </div>
                    </div>
                    <div className="divide-y">
                      {g.perms.map((p) => (
                        <label key={p.key} className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-slate-50">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{p.label}</div>
                            {p.description && <div className="text-xs text-slate-500">{p.description}</div>}
                          </div>
                          <Switch checked={granted.has(p.key)} onCheckedChange={(v) => toggle(p.key, v)} />
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-2">Disabled permissions completely hide that module from the staff dashboard.</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} {editing ? "Save changes" : "Create staff"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStaff;
