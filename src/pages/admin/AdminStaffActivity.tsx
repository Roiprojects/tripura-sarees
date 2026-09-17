import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, History, Loader2 } from "lucide-react";

type Row = {
  id: string;
  user_id: string;
  action: string;
  module: string | null;
  target_id: string | null;
  metadata: any;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

const AdminStaffActivity = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("staff_activity_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      const list = ((data as any) ?? []) as Row[];
      setRows(list);
      const ids = [...new Set(list.map((r) => r.user_id))];
      if (ids.length) {
        const { data: profs } = await supabase
          .from("staff_profiles" as any)
          .select("user_id, name")
          .in("user_id", ids);
        const map: Record<string, string> = {};
        for (const p of ((profs as any) ?? [])) map[p.user_id] = p.name;
        setNames(map);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin/staff" className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back to staff</Link>
          <h1 className="text-2xl font-bold flex items-center gap-2 mt-1"><History className="w-6 h-6" /> Staff Activity Log</h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No activity yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3">When</th>
                  <th className="text-left px-4 py-3">Staff</th>
                  <th className="text-left px-4 py-3">Action</th>
                  <th className="text-left px-4 py-3">Module</th>
                  <th className="text-left px-4 py-3">Target</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{names[r.user_id] || r.user_id.slice(0, 8)}</td>
                    <td className="px-4 py-3"><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{r.action}</span></td>
                    <td className="px-4 py-3 capitalize">{r.module || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.target_id ? r.target_id.slice(0, 8) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStaffActivity;
