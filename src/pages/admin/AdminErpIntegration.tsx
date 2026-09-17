import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, Plug, Server, Clock, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const PROJECT_URL = import.meta.env.VITE_SUPABASE_URL as string;
const BASE = `${PROJECT_URL}/functions/v1/erp-api`;

const ENDPOINTS = [
  { path: "/summary",   desc: "Order + inventory totals" },
  { path: "/orders",    desc: "Paginated orders with items and customer name" },
  { path: "/inventory", desc: "Paginated product stock list" },
  { path: "/sync",      desc: "Combined summary + orders + inventory" },
];

type LogRow = {
  id: string;
  endpoint: string;
  request_time: string;
  ip_address: string | null;
  api_key_valid: boolean;
  status_code: number;
  error_message: string | null;
};

const CopyBtn = ({ text }: { text: string }) => {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setOk(true); setTimeout(() => setOk(false), 1200);
        toast.success("Copied");
      }}
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-slate-50"
    >
      {ok ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {ok ? "Copied" : "Copy"}
    </button>
  );
};

export default function AdminErpIntegration() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data }, { count }] = await Promise.all([
        supabase.from("erp_api_logs" as any).select("*").order("request_time", { ascending: false }).limit(25),
        supabase.from("erp_api_logs" as any).select("*", { count: "exact", head: true }),
      ]);
      setLogs((data as any) ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    })();
  }, []);

  const lastCall = logs[0];
  const lastError = useMemo(() => logs.find((l) => l.status_code >= 400), [logs]);
  const configured = true; // ERP_API_KEY is stored server-side; presence assumed after setup.
  const masked = "••••••••••••••••";

  const curlExample =
    `curl -X GET "${BASE}/sync?page=1&limit=50" \\\n  -H "x-api-key: YOUR_API_KEY"`;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white grid place-items-center">
          <Plug className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">ERP Integration</h1>
          <p className="text-sm text-slate-500">Secure pull-based API for the ERP team. Share the base URL + API key below.</p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 border rounded-xl bg-white">
          <div className="text-xs text-slate-500 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> API key</div>
          <div className="mt-1 font-mono text-sm">{configured ? masked : "Not configured"}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Stored as <code>ERP_API_KEY</code> in backend secrets. Never exposed to the browser.
          </div>
        </div>
        <div className="p-4 border rounded-xl bg-white">
          <div className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Last API call</div>
          <div className="mt-1 text-sm">{lastCall ? new Date(lastCall.request_time).toLocaleString() : "—"}</div>
          <div className="text-[11px] text-slate-500 mt-1">Total calls: {total}</div>
        </div>
        <div className="p-4 border rounded-xl bg-white">
          <div className="text-xs text-slate-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Last error</div>
          <div className="mt-1 text-sm truncate">{lastError ? `${lastError.status_code} · ${lastError.error_message ?? ""}` : "None"}</div>
          <div className="text-[11px] text-slate-500 mt-1">{lastError ? new Date(lastError.request_time).toLocaleString() : ""}</div>
        </div>
      </section>

      <section className="p-4 border rounded-xl bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold flex items-center gap-2"><Server className="w-4 h-4" /> API base URL</div>
          <CopyBtn text={BASE} />
        </div>
        <code className="block text-xs bg-slate-50 border rounded p-2 break-all">{BASE}</code>

        <div className="mt-4 space-y-2">
          <div className="text-sm font-semibold">Endpoints</div>
          {ENDPOINTS.map((e) => (
            <div key={e.path} className="flex items-center justify-between gap-2 border rounded-lg p-2">
              <div className="min-w-0">
                <div className="font-mono text-xs truncate">GET {BASE}{e.path}</div>
                <div className="text-[11px] text-slate-500">{e.desc}</div>
              </div>
              <CopyBtn text={`${BASE}${e.path}`} />
            </div>
          ))}
        </div>
      </section>

      <section className="p-4 border rounded-xl bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">Example request</div>
          <CopyBtn text={curlExample} />
        </div>
        <pre className="text-xs bg-slate-900 text-slate-100 rounded p-3 overflow-x-auto whitespace-pre-wrap">{curlExample}</pre>

        <div className="mt-4 text-sm font-semibold">Developer notes</div>
        <ul className="mt-1 text-xs text-slate-600 space-y-1 list-disc pl-5">
          <li>Auth header: <code>x-api-key: YOUR_API_KEY</code> — or <code>Authorization: Bearer YOUR_API_KEY</code>.</li>
          <li>All responses are JSON. Success returns <code>success: true</code>; errors return <code>success: false</code>.</li>
          <li>Pagination: <code>?page=1&amp;limit=50</code> (max 200).</li>
          <li>Orders filters: <code>status</code>, <code>approved=true|false</code>, <code>date_from</code>, <code>date_to</code>, <code>updated_since</code>.</li>
          <li>Inventory filters: <code>low_stock_only=true</code>, <code>out_of_stock_only=true</code>, <code>updated_since</code>.</li>
          <li>Missing / invalid key → <code>401 Unauthorized</code>. Server errors → <code>500</code>.</li>
        </ul>
      </section>

      <section className="p-4 border rounded-xl bg-white">
        <div className="text-sm font-semibold mb-2">Recent API calls</div>
        {loading ? (
          <div className="text-xs text-slate-500">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="text-xs text-slate-500">No calls yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-slate-500">
                <tr><th className="p-2">Time</th><th className="p-2">Endpoint</th><th className="p-2">Status</th><th className="p-2">Key</th><th className="p-2">IP</th><th className="p-2">Error</th></tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-2 whitespace-nowrap">{new Date(l.request_time).toLocaleString()}</td>
                    <td className="p-2 font-mono">{l.endpoint}</td>
                    <td className={`p-2 ${l.status_code >= 400 ? "text-rose-600" : "text-emerald-600"}`}>{l.status_code}</td>
                    <td className="p-2">{l.api_key_valid ? "valid" : "invalid"}</td>
                    <td className="p-2">{l.ip_address ?? "—"}</td>
                    <td className="p-2 truncate max-w-[240px]">{l.error_message ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
