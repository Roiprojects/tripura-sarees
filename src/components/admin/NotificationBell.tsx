import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell, ShoppingBag, XCircle, RotateCcw, UserPlus, CheckCheck, Inbox, Video,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";

type Notif = {
  id: string;
  kind: "order" | "cancel" | "refund" | "signup" | "consultation";
  title: string;
  sub: string;
  amount?: number;
  at: string;
  href?: string;
};

const STORAGE_KEY = "admin_notif_last_seen";

const kindMeta: Record<Notif["kind"], { icon: any; tint: string; ring: string; label: string }> = {
  order:  { icon: ShoppingBag, tint: "from-emerald-500 to-teal-500", ring: "ring-emerald-200", label: "New Order" },
  cancel: { icon: XCircle,     tint: "from-rose-500 to-red-500",      ring: "ring-rose-200",    label: "Cancelled" },
  refund: { icon: RotateCcw,   tint: "from-sky-500 to-indigo-500",    ring: "ring-sky-200",     label: "Refund" },
  signup: { icon: UserPlus,    tint: "from-violet-500 to-fuchsia-500",ring: "ring-violet-200",  label: "New Customer" },
  consultation: { icon: Video, tint: "from-pink-500 to-rose-500",     ring: "ring-pink-200",    label: "Video Consult" },
};

const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); return `${d}d ago`;
};

export const NotificationBell = () => {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? new Date(0).toISOString(),
  );
  const seenIdsRef = useRef<Set<string>>(new Set());

  const q = useQuery({
    queryKey: ["admin-notifications"],
    refetchInterval: 20_000,
    queryFn: async () => {
      const [orders, txs, profiles, consults] = await Promise.all([
        supabase
          .from("orders")
          .select("id,user_id,total,status,created_at,cancelled_at,shipping_address")
          .order("created_at", { ascending: false })
          .limit(25),
        supabase
          .from("wallet_transactions")
          .select("id,user_id,type,amount,source,created_at,description")
          .eq("source", "refund")
          .order("created_at", { ascending: false })
          .limit(15),
        supabase
          .from("profiles")
          .select("id,full_name,email,created_at")
          .order("created_at", { ascending: false })
          .limit(15),
        supabase
          .from("video_consultations")
          .select("id,customer_name,phone,preferred_date,preferred_time,category,created_at,status")
          .order("created_at", { ascending: false })
          .limit(15),
      ]);

      const profMap = new Map<string, any>();
      (profiles.data ?? []).forEach((p) => profMap.set(p.id, p));

      // Fetch missing user profiles referenced by orders/txs
      const missingIds = new Set<string>();
      (orders.data ?? []).forEach((o) => { if (!profMap.has(o.user_id)) missingIds.add(o.user_id); });
      (txs.data ?? []).forEach((t) => { if (!profMap.has(t.user_id)) missingIds.add(t.user_id); });
      if (missingIds.size > 0) {
        const { data: extras } = await supabase
          .from("profiles")
          .select("id,full_name,email")
          .in("id", [...missingIds]);
          (extras ?? []).forEach((p) => profMap.set(p.id, p));
      }

      const nameOf = (uid: string, fallback?: any) => {
        const p = profMap.get(uid);
        if (p?.full_name) return p.full_name;
        if (p?.email) return p.email;
        if (fallback?.name) return fallback.name;
        return "Customer";
      };

      const items: Notif[] = [];

      (orders.data ?? []).forEach((o: any) => {
        const cust = nameOf(o.user_id, o.shipping_address);
        items.push({
          id: `order-${o.id}`,
          kind: "order",
          title: `New order from ${cust}`,
          sub: `Order #${String(o.id).slice(0, 8)} · placed`,
          amount: Number(o.total),
          at: o.created_at,
          href: "/admin/orders",
        });
        if (o.status === "cancelled" && o.cancelled_at) {
          items.push({
            id: `cancel-${o.id}`,
            kind: "cancel",
            title: `${cust} cancelled an order`,
            sub: `Order #${String(o.id).slice(0, 8)}`,
            amount: Number(o.total),
            at: o.cancelled_at,
            href: "/admin/orders",
          });
        }
      });

      (txs.data ?? []).forEach((t: any) => {
        const cust = nameOf(t.user_id);
        items.push({
          id: `refund-${t.id}`,
          kind: "refund",
          title: `Refund credited to ${cust}`,
          sub: t.description || "Wallet refund",
          amount: Number(t.amount),
          at: t.created_at,
          href: "/admin/refunds",
        });
      });

      (profiles.data ?? []).forEach((p: any) => {
        items.push({
          id: `signup-${p.id}`,
          kind: "signup",
          title: `${p.full_name || p.email || "New customer"} just joined`,
          sub: p.email ?? "Account created",
          at: p.created_at,
          href: "/admin/users",
        });
      });

      (consults.data ?? []).forEach((c: any) => {
        items.push({
          id: `consult-${c.id}`,
          kind: "consultation",
          title: `${c.customer_name} requested a video consultation`,
          sub: `${c.preferred_date} · ${c.preferred_time}${c.category ? " · " + c.category : ""}`,
          at: c.created_at,
          href: "/admin/video-consultations",
        });
      });

      items.sort((a, b) => +new Date(b.at) - +new Date(a.at));
      return items.slice(0, 40);
    },
  });

  const items = q.data ?? [];

  // Play a short chime once per batch of new notifications
  const playChime = () => {
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      if (!Ctx) return;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      const notes = [880, 1320]; // two-tone ding
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        const start = now + i * 0.12;
        const end = start + 0.22;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, end);
        o.connect(g).connect(ctx.destination);
        o.start(start);
        o.stop(end + 0.02);
      });
      setTimeout(() => ctx.close().catch(() => {}), 700);
    } catch {}
  };

  // Toast + chime for newly arrived events (skip first load)
  useEffect(() => {
    if (!items.length) return;
    const firstLoad = seenIdsRef.current.size === 0;
    const fresh = items.filter((n) => !seenIdsRef.current.has(n.id));
    fresh.forEach((n) => seenIdsRef.current.add(n.id));
    if (!firstLoad && fresh.length > 0) {
      playChime(); // single sound per batch
      fresh.slice(0, 3).forEach((n) => {
        toast(n.title, { description: n.amount ? `${formatINR(n.amount)} · ${timeAgo(n.at)}` : n.sub });
      });
    }
  }, [items]);

  const unread = useMemo(
    () => items.filter((n) => new Date(n.at).getTime() > new Date(lastSeen).getTime()).length,
    [items, lastSeen],
  );

  const markAllRead = () => {
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, now);
    setLastSeen(now);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o && items[0]) { /* keep unread until user clicks mark */ } }}>
      <PopoverTrigger asChild>
        <button className="relative w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <>
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-purple-900 animate-pulse" />
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold flex items-center justify-center shadow">
                {unread > 9 ? "9+" : unread}
              </span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[380px] p-0 rounded-2xl border-slate-200 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-purple-900 to-purple-700 text-white flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notifications
            </div>
            <div className="text-[11px] text-white/70">
              {unread > 0 ? `${unread} new update${unread > 1 ? "s" : ""}` : "You're all caught up"}
            </div>
          </div>
          {items.length > 0 && (
            <button
              onClick={markAllRead}
              className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 transition"
            >
              <CheckCheck className="w-3 h-3" /> Mark read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto bg-white">
          {q.isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              <div className="mx-auto mb-2 w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Inbox className="w-5 h-5 text-slate-400" />
              </div>
              No activity yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((n) => {
                const meta = kindMeta[n.kind];
                const Icon = meta.icon;
                const isUnread = new Date(n.at).getTime() > new Date(lastSeen).getTime();
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => { if (n.href) nav(n.href); setOpen(false); }}
                      className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 transition ${
                        isUnread ? "bg-violet-50/40" : ""
                      }`}
                    >
                      <div
                        className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${meta.tint} text-white flex items-center justify-center shadow ring-2 ${meta.ring}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {meta.label}
                          </span>
                          {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                          <span className="ml-auto text-[10px] text-slate-400">{timeAgo(n.at)}</span>
                        </div>
                        <div className="text-sm font-semibold text-slate-900 truncate">{n.title}</div>
                        <div className="text-xs text-slate-500 truncate">{n.sub}</div>
                        {n.amount != null && (
                          <div className={`mt-1 inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                            n.kind === "refund" ? "bg-sky-50 text-sky-700"
                            : n.kind === "cancel" ? "bg-rose-50 text-rose-700"
                            : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {formatINR(n.amount)}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex justify-between text-[11px] text-slate-500">
          <span>Auto-refresh every 20s</span>
          <button
            onClick={() => { nav("/admin/orders"); setOpen(false); }}
            className="font-semibold text-violet-700 hover:text-violet-900"
          >
            View all orders →
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
