import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Wallet, ArrowDownRight, ArrowUpRight, Download, Plus, Sparkles, RotateCcw, TrendingUp, Coins, Search, Calendar, XCircle } from "lucide-react";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";

const AdminRefunds = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tab, setTab] = useState<"cancelled" | "transactions" | "wallets">("cancelled");

  const cancelled = useQuery({
    queryKey: ["admin", "cancelled-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,total,status,created_at,cancelled_at,cancellation_reason,user_id,shipping_address,wallet_amount_used")
        .eq("status", "cancelled")
        .order("cancelled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const txs = useQuery({
    queryKey: ["admin", "wallet-tx"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("wallet_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const wallets = useQuery({
    queryKey: ["admin", "wallets"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("wallets")
        .select("*")
        .order("balance", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const userIds = useMemo(() => {
    const s = new Set<string>();
    cancelled.data?.forEach((o: any) => s.add(o.user_id));
    txs.data?.forEach((t) => s.add(t.user_id));
    wallets.data?.forEach((w) => s.add(w.user_id));
    return Array.from(s);
  }, [cancelled.data, txs.data, wallets.data]);

  const profiles = useQuery({
    queryKey: ["admin", "profiles-for-refunds", userIds],
    queryFn: async () => {
      if (!userIds.length) return {} as Record<string, any>;
      const { data } = await supabase.from("profiles").select("id,full_name,email").in("id", userIds);
      const map: Record<string, any> = {};
      (data ?? []).forEach((p: any) => { map[p.id] = p; });
      return map;
    },
    enabled: userIds.length > 0,
  });

  const matchesFilters = (createdAt: string, customerLabel: string) => {
    const dt = new Date(createdAt);
    if (from && dt < new Date(from)) return false;
    if (to && dt > new Date(new Date(to).getTime() + 86400000)) return false;
    if (search && !customerLabel.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  };

  const filteredCancelled = (cancelled.data ?? []).filter((o: any) => {
    const p = profiles.data?.[o.user_id];
    const label = `${o.id} ${p?.full_name ?? ""} ${p?.email ?? ""} ${o.shipping_address?.full_name ?? ""}`;
    return matchesFilters(o.cancelled_at ?? o.created_at, label);
  });

  const filteredTxs = (txs.data ?? []).filter((t) => {
    const p = profiles.data?.[t.user_id];
    return matchesFilters(t.created_at, `${p?.full_name ?? ""} ${p?.email ?? ""} ${t.description ?? ""} ${t.source}`);
  });

  const totals = useMemo(() => {
    const refunded = filteredCancelled.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
    const credits = filteredTxs.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
    const debits = filteredTxs.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);
    const totalBalance = (wallets.data ?? []).reduce((s: number, w: any) => s + Number(w.balance), 0);
    return { refunded, credits, debits, totalBalance, count: filteredCancelled.length };
  }, [filteredCancelled, filteredTxs, wallets.data]);

  const exportCSV = () => {
    const rows = tab === "cancelled"
      ? [
          ["Order ID", "Customer", "Email", "Amount", "Wallet used", "Cancelled at", "Reason"],
          ...filteredCancelled.map((o: any) => {
            const p = profiles.data?.[o.user_id];
            return [
              o.id, p?.full_name ?? o.shipping_address?.full_name ?? "", p?.email ?? "",
              o.total, o.wallet_amount_used ?? 0, o.cancelled_at ?? "", o.cancellation_reason ?? "",
            ];
          }),
        ]
      : tab === "transactions"
      ? [
          ["Date", "Customer", "Email", "Type", "Source", "Amount", "Balance after", "Reference", "Description"],
          ...filteredTxs.map((t) => {
            const p = profiles.data?.[t.user_id];
            return [
              t.created_at, p?.full_name ?? "", p?.email ?? "", t.type, t.source,
              t.amount, t.balance_after, t.reference_id ?? "", t.description ?? "",
            ];
          }),
        ]
      : [
          ["Customer", "Email", "Balance", "Updated"],
          ...(wallets.data ?? []).map((w: any) => {
            const p = profiles.data?.[w.user_id];
            return [p?.full_name ?? "", p?.email ?? "", w.balance, w.updated_at];
          }),
        ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `refunds-${tab}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Premium header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-emerald-100/60 via-background to-violet-100/40 p-6 md:p-8 shadow-sm">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-emerald-300/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-violet-300/30 blur-3xl pointer-events-none" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 bg-white/70 backdrop-blur px-2.5 py-1 rounded-full ring-1 ring-emerald-200">
              <Sparkles className="w-3 h-3" /> Finance & Refunds
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-display font-bold tracking-tight">Refunds & Wallet</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track cancellations, customer wallets and refund analytics in real time.
            </p>
          </div>
          <div className="flex gap-2">
            <AdjustWalletDialog onDone={() => {
              qc.invalidateQueries({ queryKey: ["admin", "wallet-tx"] });
              qc.invalidateQueries({ queryKey: ["admin", "wallets"] });
            }} />
            <Button variant="outline" className="rounded-full bg-white/70 backdrop-blur" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi icon={<XCircle className="w-4 h-4" />} label="Cancellations" value={String(totals.count)} tint="bg-rose-50 text-rose-700" />
          <Kpi icon={<RotateCcw className="w-4 h-4" />} label="Total Refunded" value={formatINR(totals.refunded)} tint="bg-emerald-50 text-emerald-700" />
          <Kpi icon={<TrendingUp className="w-4 h-4" />} label="Wallet Credits" value={formatINR(totals.credits)} tint="bg-sky-50 text-sky-700" />
          <Kpi icon={<Coins className="w-4 h-4" />} label="Wallet Balance" value={formatINR(totals.totalBalance)} tint="bg-violet-50 text-violet-700" />
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 rounded-2xl border-border/60 shadow-sm">
        <div className="grid sm:grid-cols-[1fr_180px_180px] gap-3">
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Search</Label>
            <div className="relative mt-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, order id…" className="pl-9 rounded-full" />
            </div>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 rounded-full" />
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 rounded-full" />
          </div>
        </div>
      </Card>

      {/* Pill tabs */}
      <div className="inline-flex gap-1 p-1 rounded-full bg-muted/60 ring-1 ring-border/60">
        {([
          ["cancelled", "Cancelled Orders", filteredCancelled.length],
          ["transactions", "Wallet Transactions", filteredTxs.length],
          ["wallets", "Customer Wallets", wallets.data?.length ?? 0],
        ] as const).map(([k, l, n]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${tab === k ? "bg-background text-foreground shadow-sm ring-1 ring-border/60" : "text-muted-foreground hover:text-foreground"}`}
          >
            {l} <span className="ml-1 text-[10px] opacity-70">({n})</span>
          </button>
        ))}
      </div>

      {tab === "cancelled" && (
        <Card className="rounded-3xl overflow-hidden border-border/60 shadow-sm">
          {cancelled.isLoading ? <Loading /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-muted/60 to-muted/30 text-left">
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3.5 font-semibold">Order</th>
                    <th className="px-5 py-3.5 font-semibold">Customer</th>
                    <th className="px-5 py-3.5 font-semibold">Refunded</th>
                    <th className="px-5 py-3.5 font-semibold">Cancelled</th>
                    <th className="px-5 py-3.5 font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCancelled.map((o: any) => {
                    const p = profiles.data?.[o.user_id];
                    return (
                      <tr key={o.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium">{p?.full_name ?? o.shipping_address?.full_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{p?.email ?? ""}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2.5 py-1 text-xs font-semibold">
                            <ArrowDownRight className="w-3 h-3" /> {formatINR(o.total)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">{o.cancelled_at ? new Date(o.cancelled_at).toLocaleString() : "—"}</td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-xs truncate">{o.cancellation_reason ?? "—"}</td>
                      </tr>
                    );
                  })}
                  {filteredCancelled.length === 0 && (
                    <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">No cancellations match.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "transactions" && (
        <Card className="rounded-3xl overflow-hidden border-border/60 shadow-sm">
          {txs.isLoading ? <Loading /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-muted/60 to-muted/30 text-left">
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3.5 font-semibold">Date</th>
                    <th className="px-5 py-3.5 font-semibold">Customer</th>
                    <th className="px-5 py-3.5 font-semibold">Source</th>
                    <th className="px-5 py-3.5 font-semibold">Type</th>
                    <th className="px-5 py-3.5 font-semibold">Amount</th>
                    <th className="px-5 py-3.5 font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxs.map((t) => {
                    const p = profiles.data?.[t.user_id];
                    const credit = t.type === "credit";
                    return (
                      <tr key={t.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium">{p?.full_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{p?.email ?? ""}</div>
                        </td>
                        <td className="px-5 py-3.5 capitalize text-xs">
                          <Badge variant="outline" className="rounded-full text-[10px] capitalize">{t.source.replace("_", " ")}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant="outline" className={`rounded-full ${credit ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                            {credit ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <ArrowUpRight className="w-3 h-3 mr-1" />}
                            {t.type}
                          </Badge>
                        </td>
                        <td className={`px-5 py-3.5 font-display font-bold ${credit ? "text-emerald-700" : "text-rose-700"}`}>
                          {credit ? "+" : "−"}{formatINR(t.amount)}
                        </td>
                        <td className="px-5 py-3.5 text-xs">{formatINR(t.balance_after)}</td>
                      </tr>
                    );
                  })}
                  {filteredTxs.length === 0 && (
                    <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">No transactions match.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "wallets" && (
        <Card className="rounded-3xl overflow-hidden border-border/60 shadow-sm">
          {wallets.isLoading ? <Loading /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-muted/60 to-muted/30 text-left">
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3.5 font-semibold">Customer</th>
                    <th className="px-5 py-3.5 font-semibold">Balance</th>
                    <th className="px-5 py-3.5 font-semibold">Last updated</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(wallets.data ?? []).map((w: any) => {
                    const p = profiles.data?.[w.user_id];
                    return (
                      <tr key={w.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-medium">{p?.full_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{p?.email ?? w.user_id.slice(0, 8)}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500/10 to-indigo-500/10 text-violet-700 ring-1 ring-violet-200 px-3 py-1 font-display font-bold">
                            <Wallet className="w-3.5 h-3.5" /> {formatINR(w.balance)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">{new Date(w.updated_at).toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right">
                          <AdjustWalletDialog
                            prefillUserId={w.user_id}
                            customerLabel={p?.full_name || p?.email || w.user_id.slice(0, 8)}
                            currentBalance={Number(w.balance)}
                            trigger={<Button size="sm" variant="outline" className="rounded-full"><Wallet className="w-3.5 h-3.5 mr-1.5" /> Adjust</Button>}
                            onDone={() => {
                              qc.invalidateQueries({ queryKey: ["admin", "wallet-tx"] });
                              qc.invalidateQueries({ queryKey: ["admin", "wallets"] });
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {(wallets.data ?? []).length === 0 && (
                    <tr><td colSpan={4} className="p-12 text-center text-muted-foreground">No wallets yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

const Kpi = ({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: string }) => (
  <div className={`rounded-2xl px-3.5 py-2.5 backdrop-blur ring-1 ring-border/60 shadow-sm ${tint}`}>
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">
      {icon} {label}
    </div>
    <div className="mt-0.5 text-lg font-display font-bold leading-none">{value}</div>
  </div>
);


const Loading = () => (
  <div className="p-10 text-center text-muted-foreground">
    <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…
  </div>
);

const AdjustWalletDialog = ({
  onDone,
  prefillUserId,
  customerLabel,
  currentBalance,
  trigger,
}: {
  onDone: () => void;
  prefillUserId?: string;
  customerLabel?: string;
  currentBalance?: number;
  trigger?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState(prefillUserId ?? "");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Keep prefill in sync when opening on a different row
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setUserId(prefillUserId ?? "");
      setAmount("");
      setNote("");
      setType("credit");
    }
    setOpen(v);
  };

  const submit = async () => {
    if (!userId || !amount) { toast.error("User ID and amount required"); return; }
    setBusy(true);
    const { error } = await (supabase as any).rpc("admin_adjust_wallet", {
      p_user_id: userId, p_amount: Number(amount), p_type: type, p_note: note || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Wallet ${type === "credit" ? "credited" : "debited"} — visible in customer dashboard`);
    setOpen(false); setAmount(""); setNote("");
    onDone();
  };

  const amt = Number(amount || 0);
  const projected = currentBalance !== undefined
    ? type === "credit" ? currentBalance + amt : currentBalance - amt
    : undefined;
  const insufficient = type === "debit" && projected !== undefined && projected < 0;

  const PRESETS = [100, 250, 500, 1000, 2000];
  const NOTE_PRESETS = type === "credit"
    ? ["Refund for damaged item", "Goodwill gesture", "Birthday bonus", "Promo credit"]
    : ["Wrong credit reversal", "Manual deduction", "Adjustment"];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <Button className="rounded-full"><Plus className="w-4 h-4 mr-1.5" /> Adjust Wallet</Button>}
      </DialogTrigger>
      <DialogContent className="rounded-3xl p-0 overflow-hidden max-w-md">
        {/* Hero header */}
        <div className={`relative px-6 pt-6 pb-5 bg-gradient-to-br ${type === "credit" ? "from-emerald-500 to-teal-500" : "from-rose-500 to-orange-500"} text-white`}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <DialogHeader className="relative space-y-1">
            <div className="inline-flex w-fit items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] bg-white/20 backdrop-blur px-2 py-0.5 rounded-full ring-1 ring-white/30">
              <Wallet className="w-3 h-3" /> Wallet Adjustment
            </div>
            <DialogTitle className="text-xl font-display font-bold text-white">
              {customerLabel ? customerLabel : "Adjust customer wallet"}
            </DialogTitle>
            {currentBalance !== undefined && (
              <div className="flex items-center gap-3 pt-1 text-white/90 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-wider opacity-80">Current</div>
                  <div className="font-display font-bold text-lg leading-tight">{formatINR(currentBalance)}</div>
                </div>
                <ArrowDownRight className="w-4 h-4 opacity-70" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider opacity-80">After</div>
                  <div className={`font-display font-bold text-lg leading-tight ${insufficient ? "line-through opacity-60" : ""}`}>
                    {projected !== undefined ? formatINR(Math.max(projected, 0)) : "—"}
                  </div>
                </div>
              </div>
            )}
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4">
          {prefillUserId ? (
            <div className="text-[10px] text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-1.5 font-mono break-all">
              UID · {prefillUserId}
            </div>
          ) : (
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Customer User ID</Label>
              <Input className="mt-1 rounded-xl" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="uuid…" />
            </div>
          )}

          {/* Type toggle */}
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Type</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2 p-1 rounded-full bg-muted/60 ring-1 ring-border/60">
              <button
                type="button"
                onClick={() => setType("credit")}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-full text-sm font-semibold transition-all ${type === "credit" ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" /> Credit
              </button>
              <button
                type="button"
                onClick={() => setType("debit")}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-full text-sm font-semibold transition-all ${type === "debit" ? "bg-rose-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" /> Debit
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Amount</Label>
            <div className="mt-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-display font-bold text-lg text-muted-foreground">₹</span>
              <Input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="pl-8 h-12 text-2xl font-display font-bold rounded-xl"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-foreground/80 font-medium ring-1 ring-border/60 transition"
                >
                  +₹{v}
                </button>
              ))}
            </div>
            {insufficient && (
              <p className="text-[11px] text-rose-600 mt-1.5 font-medium">⚠ Debit exceeds current balance</p>
            )}
          </div>

          {/* Note */}
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Note for customer</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Refund for damaged item"
              className="mt-1 rounded-xl"
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {NOTE_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNote(n)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition"
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Visible on the customer's wallet history in their dashboard.
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-muted/30 border-t border-border/60">
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={busy || !amount || insufficient}
            className={`rounded-full shadow-sm ${type === "credit" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"} text-white`}
          >
            {busy ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Saving…</> : `Apply ${type === "credit" ? "Credit" : "Debit"} ${amount ? `₹${amount}` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default AdminRefunds;
