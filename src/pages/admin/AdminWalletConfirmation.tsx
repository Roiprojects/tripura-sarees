import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Wallet, CheckCircle2, XCircle, Search, Sparkles, Package } from "lucide-react";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";

type Status = "pending" | "approved" | "rejected";

const AdminWalletConfirmation = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Status>("pending");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<any | null>(null);
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const requests = useQuery({
    queryKey: ["admin", "wallet-refund-requests", tab],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("wallet_refund_requests")
        .select("*")
        .eq("status", tab)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const orderIds = useMemo(
    () => Array.from(new Set((requests.data ?? []).map((r) => r.order_id))),
    [requests.data],
  );
  const userIds = useMemo(
    () => Array.from(new Set((requests.data ?? []).map((r) => r.user_id))),
    [requests.data],
  );

  const orders = useQuery({
    queryKey: ["admin", "wallet-refund-orders", orderIds],
    queryFn: async () => {
      if (!orderIds.length) return {} as Record<string, any>;
      const { data } = await supabase
        .from("orders")
        .select("id,total,created_at,cancelled_at,payment_method,payment_status,shipping_address,order_items(id,product_name,size,color,quantity,price,status)")
        .in("id", orderIds);
      const map: Record<string, any> = {};
      (data ?? []).forEach((o: any) => (map[o.id] = o));
      return map;
    },
    enabled: orderIds.length > 0,
  });

  const profiles = useQuery({
    queryKey: ["admin", "wallet-refund-profiles", userIds],
    queryFn: async () => {
      if (!userIds.length) return {} as Record<string, any>;
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,email,phone")
        .in("id", userIds);
      const map: Record<string, any> = {};
      (data ?? []).forEach((p: any) => (map[p.id] = p));
      return map;
    },
    enabled: userIds.length > 0,
  });

  const filtered = (requests.data ?? []).filter((r) => {
    if (!search) return true;
    const p = profiles.data?.[r.user_id];
    const label = `${r.id} ${r.order_id} ${p?.full_name ?? ""} ${p?.email ?? ""} ${p?.phone ?? ""}`;
    return label.toLowerCase().includes(search.toLowerCase());
  });

  const totals = useMemo(() => {
    const pending = (requests.data ?? []).reduce((s, r) => s + Number(r.refund_amount), 0);
    return { count: requests.data?.length ?? 0, pending };
  }, [requests.data]);

  const openAction = (req: any, m: "approve" | "reject") => {
    setActive(req); setMode(m); setNote("");
  };

  const submit = async () => {
    if (!active || !mode) return;
    setBusy(true);
    const fn = mode === "approve" ? "approve_wallet_refund" : "reject_wallet_refund";
    const { error } = await (supabase as any).rpc(fn, {
      p_request_id: active.id,
      p_note: note.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(mode === "approve" ? "Refund credited to wallet" : "Refund rejected");
    setActive(null); setMode(null);
    qc.invalidateQueries({ queryKey: ["admin", "wallet-refund-requests"] });
    qc.invalidateQueries({ queryKey: ["admin", "wallet-tx"] });
    qc.invalidateQueries({ queryKey: ["admin", "wallets"] });
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-amber-100/60 via-background to-emerald-100/40 p-6 md:p-8 shadow-sm">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-amber-300/30 blur-3xl pointer-events-none" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 bg-white/70 backdrop-blur px-2.5 py-1 rounded-full ring-1 ring-amber-200">
              <Sparkles className="w-3 h-3" /> Wallet Confirmation
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-display font-bold tracking-tight">Refund Approvals</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review cancelled prepaid orders before crediting customer wallets.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/80 backdrop-blur ring-1 ring-border/60 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Pending value</div>
              <div className="font-display font-bold text-xl text-amber-700">{formatINR(totals.pending)}</div>
            </div>
          </div>
        </div>
      </div>

      <Card className="p-4 rounded-2xl border-border/60 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, email, order id…" className="pl-9 rounded-full" />
        </div>
      </Card>

      <div className="inline-flex gap-1 p-1 rounded-full bg-muted/60 ring-1 ring-border/60">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full capitalize transition-all ${tab === s ? "bg-background text-foreground shadow-sm ring-1 ring-border/60" : "text-muted-foreground hover:text-foreground"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <Card className="rounded-3xl overflow-hidden border-border/60 shadow-sm">
        {requests.isLoading ? (
          <div className="p-12 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No {tab} refund requests.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-muted/60 to-muted/30 text-left">
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3.5 font-semibold">Customer</th>
                  <th className="px-5 py-3.5 font-semibold">Order</th>
                  <th className="px-5 py-3.5 font-semibold">Cancelled item(s)</th>
                  <th className="px-5 py-3.5 font-semibold">Paid</th>
                  <th className="px-5 py-3.5 font-semibold">Refund</th>
                  <th className="px-5 py-3.5 font-semibold">Method</th>
                  <th className="px-5 py-3.5 font-semibold">Dates</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any) => {
                  const p = profiles.data?.[r.user_id];
                  const o = orders.data?.[r.order_id];
                  const cancelledItems = (o?.order_items ?? []).filter((i: any) =>
                    r.order_item_id ? i.id === r.order_item_id : i.status === "cancelled"
                  );
                  const allItems = o?.order_items ?? [];
                  const shown = cancelledItems.length ? cancelledItems : allItems;
                  return (
                    <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors align-top">
                      <td className="px-5 py-4">
                        <div className="font-medium">{p?.full_name ?? o?.shipping_address?.full_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{p?.email}</div>
                        <div className="text-xs text-muted-foreground">{p?.phone ?? o?.shipping_address?.phone ?? "—"}</div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">#{r.order_id.slice(0, 8)}</td>
                      <td className="px-5 py-4 text-xs space-y-1 max-w-xs">
                        {shown.slice(0, 4).map((i: any) => (
                          <div key={i.id} className="flex items-start gap-1.5">
                            <Package className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                            <span>
                              {i.quantity}× {i.product_name}
                              {i.size ? ` [${i.size}]` : ""}{i.color ? ` (${i.color})` : ""}
                            </span>
                          </div>
                        ))}
                        {shown.length > 4 && <div className="text-muted-foreground">+{shown.length - 4} more</div>}
                      </td>
                      <td className="px-5 py-4 font-semibold tabular-nums">{formatINR(r.gross)}</td>
                      <td className="px-5 py-4">
                        <div className="font-display font-bold text-emerald-700 tabular-nums">{formatINR(r.refund_amount)}</div>
                        <div className="text-[10px] text-rose-600">fee {formatINR(r.fee)}</div>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <Badge variant="outline" className="rounded-full capitalize">{r.payment_method ?? "—"}</Badge>
                      </td>
                      <td className="px-5 py-4 text-[11px] text-muted-foreground">
                        <div>Ordered: {o?.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}</div>
                        <div>Cancelled: {new Date(r.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {r.status === "pending" ? (
                          <div className="flex gap-1.5 justify-end">
                            <Button size="sm" onClick={() => openAction(r, "approve")} className="rounded-full bg-emerald-600 hover:bg-emerald-700">
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Confirm
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openAction(r, "reject")} className="rounded-full">
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="outline" className={`rounded-full capitalize ${r.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                            {r.status}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mode === "approve" ? <><Wallet className="w-5 h-5 text-emerald-600" /> Confirm refund</> : <><XCircle className="w-5 h-5 text-rose-600" /> Reject refund</>}
            </DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-muted/40 p-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Order</span><span className="font-mono">#{active.order_id.slice(0, 8)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="font-semibold">{formatINR(active.gross)}</span></div>
                <div className="flex justify-between text-emerald-700"><span>Refund</span><span className="font-bold">{formatINR(active.refund_amount)}</span></div>
              </div>
              <Textarea
                placeholder={mode === "approve" ? "Optional admin note" : "Reason for rejection"}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)} disabled={busy}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={busy}
              className={mode === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
            >
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === "approve" ? "Confirm & credit wallet" : "Reject request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWalletConfirmation;
