import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, ShoppingBag, Users, BarChart3, ArrowRight, Sparkles,
  Tag, IndianRupee, Image as ImageIcon, TrendingUp, TrendingDown,
  Wallet, Activity, Crown, Boxes, AlertTriangle, PackageX, Layers,
  Clock, CalendarDays, RotateCcw, UserPlus, Radio, Download, Calendar as CalendarIcon,
  FileSpreadsheet, FileText, Truck, CheckCircle2, Loader2,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { formatINR } from "@/lib/format";
import { site } from "@/config/site";
import { media } from "@/config/media";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, subDays, subWeeks, subMonths, differenceInDays,
  eachHourOfInterval, eachDayOfInterval, eachMonthOfInterval, isSameHour, isSameDay, isSameMonth,
} from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Preset =
  | "today" | "yesterday" | "last7" | "last30"
  | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth"
  | "thisYear" | "custom";

const PRESET_OPTIONS: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 Days" },
  { value: "last30", label: "Last 30 Days" },
  { value: "thisWeek", label: "This Week" },
  { value: "lastWeek", label: "Last Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisYear", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

type Range = { from: Date; to: Date; granularity: "hour" | "day" | "month"; label: string };

function computeRange(preset: Preset, customFrom?: Date, customTo?: Date): Range {
  const now = new Date();
  let f: Date, t: Date;
  switch (preset) {
    case "today":      f = startOfDay(now); t = endOfDay(now); break;
    case "yesterday":  { const y = subDays(now, 1); f = startOfDay(y); t = endOfDay(y); break; }
    case "last7":      f = startOfDay(subDays(now, 6));  t = endOfDay(now); break;
    case "last30":     f = startOfDay(subDays(now, 29)); t = endOfDay(now); break;
    case "thisWeek":   f = startOfWeek(now, { weekStartsOn: 1 }); t = endOfWeek(now, { weekStartsOn: 1 }); break;
    case "lastWeek":   { const w = subWeeks(now, 1); f = startOfWeek(w, { weekStartsOn: 1 }); t = endOfWeek(w, { weekStartsOn: 1 }); break; }
    case "thisMonth":  f = startOfMonth(now); t = endOfMonth(now); break;
    case "lastMonth":  { const m = subMonths(now, 1); f = startOfMonth(m); t = endOfMonth(m); break; }
    case "thisYear":   f = startOfYear(now); t = endOfYear(now); break;
    case "custom":     f = startOfDay(customFrom ?? now); t = endOfDay(customTo ?? now); break;
  }
  const days = differenceInDays(t, f);
  const granularity: "hour" | "day" | "month" = days <= 1 ? "hour" : days > 60 ? "month" : "day";
  const label = preset === "custom"
    ? `${format(f, "dd MMM yyyy")} → ${format(t, "dd MMM yyyy")}`
    : (PRESET_OPTIONS.find(p => p.value === preset)?.label ?? "");
  return { from: f, to: t, granularity, label };
}

const useCount = (table: string) =>
  useQuery({
    queryKey: ["admin-count", table],
    queryFn: async () => {
      const { count } = await supabase.from(table as any).select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

const useOrders = (range: Range) =>
  useQuery({
    queryKey: ["admin-orders-analytics", range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,total,status,payment_method,payment_status,created_at,user_id,shipping_address")
        .gte("created_at", range.from.toISOString())
        .lte("created_at", range.to.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000);
      return data ?? [];
    },
  });

const useOrderItemsInRange = (range: Range) =>
  useQuery({
    queryKey: ["admin-items-in-range", range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_items")
        .select("quantity,price,product:products(id,name,sku),order:orders!inner(id,created_at,status)")
        .gte("order.created_at", range.from.toISOString())
        .lte("order.created_at", range.to.toISOString())
        .limit(5000);
      return data ?? [];
    },
  });

const useInventory = () =>
  useQuery({
    queryKey: ["admin-inventory"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,sku,stock,price,category:categories(name,gender,parent:categories!parent_id(name,gender))")
        .order("stock", { ascending: true })
        .limit(500);
      return data ?? [];
    },
  });

const fmtDay = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

const AdminDashboard = () => {
  const queryClient = useQueryClient();

  // ---- Date range filter ----
  const [preset, setPreset] = useState<Preset>("last30");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(subDays(new Date(), 7));
  const [customTo, setCustomTo] = useState<Date | undefined>(new Date());
  const range = useMemo(() => computeRange(preset, customFrom, customTo), [preset, customFrom, customTo]);

  // Previous period of equal length (for delta)
  const prevRange = useMemo(() => {
    const ms = range.to.getTime() - range.from.getTime();
    return { from: new Date(range.from.getTime() - ms - 1), to: new Date(range.from.getTime() - 1) };
  }, [range]);

  const products = useCount("products");
  const totalCustomersQ = useCount("profiles");
  const ordersQ = useOrders(range);
  const itemsQ = useOrderItemsInRange(range);
  const inventoryQ = useInventory();

  // Previous period revenue for delta comparison
  const prevOrdersQ = useQuery({
    queryKey: ["admin-orders-prev", prevRange.from.toISOString(), prevRange.to.toISOString()],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("total")
        .gte("created_at", prevRange.from.toISOString())
        .lte("created_at", prevRange.to.toISOString())
        .limit(5000);
      return data ?? [];
    },
  });

  const orders = ordersQ.data ?? [];
  const items = itemsQ.data ?? [];
  const inventory = inventoryQ.data ?? [];
  const movement = items; // alias for charts below

  // Real-time: refresh whenever the DB changes
  useEffect(() => {
    const ch = supabase
      .channel("admin-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-orders-analytics"] });
        queryClient.invalidateQueries({ queryKey: ["admin-orders-prev"] });
        queryClient.invalidateQueries({ queryKey: ["admin-items-in-range"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-count", "profiles"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-count", "products"] });
        queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  // ---- Inventory analytics ----
  const inventoryStats = useMemo(() => {
    const total = inventory.length;
    const out = inventory.filter((p: any) => (p.stock ?? 0) === 0).length;
    const low = inventory.filter((p: any) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5).length;
    const medium = inventory.filter((p: any) => (p.stock ?? 0) > 5 && (p.stock ?? 0) <= 20).length;
    const healthy = inventory.filter((p: any) => (p.stock ?? 0) > 20).length;
    const units = inventory.reduce((s: number, p: any) => s + Number(p.stock ?? 0), 0);
    const value = inventory.reduce((s: number, p: any) => s + Number(p.stock ?? 0) * Number(p.price ?? 0), 0);
    return { total, out, low, medium, healthy, units, value };
  }, [inventory]);

  // Stock grouped by Parent → Subcategory (e.g., Silk Sarees → Banarasi Silk)
  const categoryGroups = useMemo(() => {
    const map = new Map<string, { name: string; units: number; products: number; out: number; low: number; items: any[] }>();
    inventory.forEach((p: any) => {
      const child = p.category?.name;
      const parent = p.category?.parent?.name ?? p.category?.gender ?? null;
      const label = child
        ? (parent && parent !== child ? `${parent} › ${child}` : child)
        : "Uncategorised";
      const cur = map.get(label) ?? { name: label, units: 0, products: 0, out: 0, low: 0, items: [] };
      const stock = Number(p.stock ?? 0);
      cur.units += stock;
      cur.products += 1;
      if (stock === 0) cur.out += 1;
      else if (stock <= 5) cur.low += 1;
      cur.items.push({ id: p.id, name: p.name, sku: p.sku ?? "—", stock, price: Number(p.price ?? 0) });
      map.set(label, cur);
    });
    return [...map.values()].sort((a, b) => b.units - a.units);
  }, [inventory]);

  const categoryStock = useMemo(
    () => categoryGroups.slice(0, 10).map((r) => ({
      ...r,
      shortName: r.name.length > 26 ? r.name.slice(0, 26) + "…" : r.name,
    })),
    [categoryGroups],
  );

  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockDialogCat, setStockDialogCat] = useState<string | null>(null);
  const openStockDialog = () => { setStockDialogCat(null); setStockDialogOpen(true); };
  const activeCatItems = useMemo(
    () => categoryGroups.find((c) => c.name === stockDialogCat),
    [categoryGroups, stockDialogCat],
  );


  const stockBuckets = useMemo(
    () => [
      { name: "Out (0)", value: inventoryStats.out, fill: "#ef4444" },
      { name: "Low (1-5)", value: inventoryStats.low, fill: "#f59e0b" },
      { name: "Medium (6-20)", value: inventoryStats.medium, fill: "#C9A227" },
      { name: "Healthy (>20)", value: inventoryStats.healthy, fill: "#2E8B57" },
    ],
    [inventoryStats],
  );

  const lowStockList = useMemo(
    () =>
      inventory
        .filter((p: any) => (p.stock ?? 0) <= 5)
        .slice(0, 8)
        .map((p: any) => ({
          name: p.name?.length > 22 ? p.name.slice(0, 22) + "…" : p.name,
          stock: Number(p.stock ?? 0),
          fill: (p.stock ?? 0) === 0 ? "#ef4444" : "#f59e0b",
        })),
    [inventory],
  );

  // Units sold per day (last 14d) — stock outflow trend
  const movementSeries = useMemo(() => {
    const days = 14;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(today.getTime() - (days - 1 - i) * 86400_000);
      return { date: fmtDay(d), units: 0, cancelled: 0 };
    });
    movement.forEach((m: any) => {
      const created = m.order?.created_at;
      if (!created) return;
      const d = new Date(created); d.setHours(0, 0, 0, 0);
      const diff = Math.floor((today.getTime() - d.getTime()) / 86400_000);
      if (diff < 0 || diff >= days) return;
      const idx = days - 1 - diff;
      const qty = Number(m.quantity ?? 0);
      if (m.order?.status === "cancelled") buckets[idx].cancelled += qty;
      else buckets[idx].units += qty;
    });
    return buckets;
  }, [movement]);

  // Per-product movement table (top 6 movers)
  const productMovement = useMemo(() => {
    const map = new Map<string, { name: string; sold: number; cancelled: number; revenue: number }>();
    movement.forEach((m: any) => {
      const name = m.product?.name ?? "Unknown";
      const cur = map.get(name) ?? { name, sold: 0, cancelled: 0, revenue: 0 };
      const qty = Number(m.quantity ?? 0);
      if (m.order?.status === "cancelled") cur.cancelled += qty;
      else {
        cur.sold += qty;
        cur.revenue += qty * Number(m.price ?? 0);
      }
      map.set(name, cur);
    });
    return [...map.values()]
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 6)
      .map((r) => ({ ...r, name: r.name.length > 18 ? r.name.slice(0, 18) + "…" : r.name }));
  }, [movement]);

  const stats = useMemo(() => {
    const sum = (arr: any[]) => arr.reduce((s, r) => s + Number(r.total ?? 0), 0);
    const rev = sum(orders);
    const prev = (prevOrdersQ.data ?? []).reduce((s: number, r: any) => s + Number(r.total ?? 0), 0);
    const delta = prev > 0 ? ((rev - prev) / prev) * 100 : rev > 0 ? 100 : 0;

    const count = (st: string) => orders.filter((o: any) => o.status === st).length;
    const pending    = count("pending");
    const processing = count("processing") + count("confirmed");
    const shipped    = count("shipped");
    const delivered  = count("delivered");
    const cancelled  = count("cancelled");
    const returned   = count("returned");

    const aov = orders.length ? rev / orders.length : 0;
    const cancelRate = orders.length ? (cancelled / orders.length) * 100 : 0;

    const uniqueCustomers = new Set(orders.map((o: any) => o.user_id).filter(Boolean)).size;
    const productsSold = items
      .filter((m: any) => m.order?.status !== "cancelled")
      .reduce((s: number, m: any) => s + Number(m.quantity ?? 0), 0);

    return {
      rev, delta, aov, cancelled, pending, processing, shipped, delivered, returned, cancelRate,
      ordersCount: orders.length,
      customers: uniqueCustomers,
      productsSold,
    };
  }, [orders, items, prevOrdersQ.data]);

  // Revenue series with dynamic granularity based on selected range
  const revenueSeries = useMemo(() => {
    const fmtBucket = (d: Date) =>
      range.granularity === "hour" ? format(d, "HH:00")
        : range.granularity === "day" ? format(d, "dd MMM")
        : format(d, "MMM yy");

    const ticks: Date[] =
      range.granularity === "hour" ? eachHourOfInterval({ start: range.from, end: range.to })
        : range.granularity === "day" ? eachDayOfInterval({ start: range.from, end: range.to })
        : eachMonthOfInterval({ start: range.from, end: range.to });

    const buckets = ticks.map(d => ({ date: fmtBucket(d), _d: d, revenue: 0, orders: 0 }));
    const sameBucket = (a: Date, b: Date) =>
      range.granularity === "hour" ? isSameHour(a, b)
        : range.granularity === "day" ? isSameDay(a, b)
        : isSameMonth(a, b);

    orders.forEach((o: any) => {
      const d = new Date(o.created_at);
      const idx = buckets.findIndex(b => sameBucket(b._d, d));
      if (idx >= 0) {
        buckets[idx].revenue += Number(o.total ?? 0);
        buckets[idx].orders += 1;
      }
    });
    return buckets.map(({ _d, ...rest }) => rest);
  }, [orders, range]);

  // Top products derived from period items
  const top = useMemo(() => {
    const map = new Map<string, { id: string; name: string; sku: string; qty: number; revenue: number; label: string }>();
    items.forEach((r: any) => {
      if (r.order?.status === "cancelled") return;
      const id = r.product?.id ?? r.product?.name ?? "unknown";
      const name = r.product?.name ?? "Unknown";
      const sku = r.product?.sku ?? "—";
      const cur = map.get(id) ?? { id, name, sku, qty: 0, revenue: 0, label: "" };
      cur.qty += Number(r.quantity ?? 0);
      cur.revenue += Number(r.quantity ?? 0) * Number(r.price ?? 0);
      map.set(id, cur);
    });
    return [...map.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(r => ({ ...r, label: `${r.name.length > 22 ? r.name.slice(0, 22) + "…" : r.name} · ${r.sku}` }));
  }, [items]);

  // Order status pie
  const statusData = useMemo(() => {
    const tally: Record<string, number> = {};
    orders.forEach((o: any) => { tally[o.status] = (tally[o.status] ?? 0) + 1; });
    return Object.entries(tally).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // Payment method split
  const paymentData = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o: any) => {
      const pm = (o.payment_method ?? "other").toLowerCase();
      const key = pm.includes("cod") || pm.includes("cash") ? "Cash on Delivery"
        : pm.includes("upi") ? "UPI"
        : pm.includes("card") ? "Card"
        : pm.includes("wallet") ? "Wallet"
        : pm.includes("razorpay") || pm.includes("online") ? "Online"
        : "Other";
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const STATUS_COLORS: Record<string, string> = {
    pending: "#f59e0b",
    confirmed: "#C9A227",
    processing: "#44A084",
    shipped: "#1D7E64",
    delivered: "#2E8B57",
    cancelled: "#ef4444",
  };
  const PAY_COLORS = ["#2E8B57", "#44A084", "#C9A227", "#1D7E64", "#f59e0b", "#94a3b8"];

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-900 via-purple-900 to-fuchsia-800 p-4 sm:p-7 text-white shadow-xl">
        <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-3 sm:gap-5">
          <div className="relative">
            <div className="absolute inset-0 -m-1 rounded-2xl bg-gradient-to-br from-pink-300/60 via-fuchsia-400/50 to-indigo-300/60 blur-xl" />
            <div className="relative bg-white rounded-2xl p-2 sm:p-2.5 shadow-lg ring-1 ring-white/40">
              <img src={media.logoMark} alt={site.brand.name} className="h-10 w-10 sm:h-14 sm:w-14 object-contain" />
            </div>
          </div>
          <div className="flex-1 min-w-[180px]">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium ring-1 ring-white/20">
              <Sparkles className="w-3 h-3 text-amber-300" /> {site.brand.name} · Command Center
            </div>
            <h1 className="mt-2 text-xl sm:text-3xl md:text-4xl font-bold tracking-tight">Welcome back, Admin</h1>
            <p className="text-white/70 text-xs sm:text-sm">Real-time pulse of your store — orders, revenue, customers and inventory at a glance.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none rounded-2xl bg-white/10 backdrop-blur ring-1 ring-white/20 px-3 sm:px-4 py-2 sm:py-2.5">
              <div className="text-[10px] uppercase tracking-wider text-white/60">{range.label} revenue</div>
              <div className="text-base sm:text-xl font-bold">{formatINR(stats.rev)}</div>
            </div>
            <div className={`rounded-2xl px-3 py-2 sm:py-2.5 ring-1 ring-white/20 ${stats.delta >= 0 ? "bg-emerald-500/20" : "bg-rose-500/20"}`}>
              <div className="text-[10px] uppercase tracking-wider text-white/70">vs prev</div>
              <div className={`text-sm font-bold flex items-center gap-1 ${stats.delta >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                {stats.delta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {stats.delta.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Date filter + Exports */}
      <DateRangeBar
        preset={preset} setPreset={setPreset}
        customFrom={customFrom} setCustomFrom={setCustomFrom}
        customTo={customTo} setCustomTo={setCustomTo}
        range={range}
        loading={ordersQ.isFetching || itemsQ.isFetching}
        onExportCsv={() => exportOrders("csv", orders, range)}
        onExportXlsx={() => exportOrders("xlsx", orders, range)}
        onExportPdf={() => exportOrders("pdf", orders, range, stats)}
      />

      {/* Period KPIs (10 metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Stat icon={ShoppingBag}   label="Total Orders"     value={stats.ordersCount}            tint="from-sky-500 to-indigo-500"      hint={range.label} />
        <Stat icon={IndianRupee}   label="Total Revenue"    value={formatINR(stats.rev)}         tint="from-emerald-500 to-teal-500"    hint="gross sales" />
        <Stat icon={Users}         label="Customers"        value={stats.customers}              tint="from-violet-500 to-fuchsia-500"  hint="unique buyers" />
        <Stat icon={IndianRupee}   label="Avg Order Value"  value={formatINR(stats.aov)}         tint="from-pink-500 to-rose-500"       hint="per order" />
        <Stat icon={Boxes}         label="Products Sold"    value={stats.productsSold}           tint="from-amber-500 to-orange-500"    hint="units shipped" />
        <Stat icon={Clock}         label="Pending"          value={stats.pending}                tint="from-amber-500 to-orange-500"    hint="awaiting confirmation" />
        <Stat icon={Loader2}       label="Processing"       value={stats.processing}             tint="from-indigo-500 to-violet-500"   hint="confirmed / processing" />
        <Stat icon={Truck}         label="Shipped"          value={stats.shipped}                tint="from-sky-500 to-cyan-500"        hint="in transit" />
        <Stat icon={CheckCircle2}  label="Delivered"        value={stats.delivered}              tint="from-emerald-500 to-teal-500"    hint="completed" />
        <Stat icon={PackageX}      label="Cancelled"        value={stats.cancelled}              tint="from-rose-500 to-red-500"        hint={`${stats.cancelRate.toFixed(1)}% rate`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Stat icon={RotateCcw} label="Returned" value={stats.returned} tint="from-slate-500 to-slate-700" hint="returns processed" />
        <Stat icon={Users} label="Total Customers (all-time)" value={totalCustomersQ.data ?? "—"} tint="from-violet-500 to-fuchsia-500" hint="profiles registered" />
        <Stat icon={Package} label="Products (catalog)" value={products.data ?? "—"} tint="from-amber-500 to-orange-500" hint="in catalog" />
      </div>

      {/* Charts row 1 — Revenue area + Status pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard
          className="lg:col-span-2"
          title="Real-Time Sales"
          subtitle="Revenue & orders · last 14 days (live)"
          icon={<Radio className="w-4 h-4" />}
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueSeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F5E4B" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#0F5E4B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-ord" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2E8B57" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#2E8B57" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}
                formatter={(v: any, k: string) => (k === "revenue" ? formatINR(Number(v)) : v)}
              />
              <Area type="monotone" dataKey="revenue" stroke="#0F5E4B" strokeWidth={2.5} fill="url(#grad-rev)" />
              <Area type="monotone" dataKey="orders" stroke="#2E8B57" strokeWidth={2} fill="url(#grad-ord)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Order Status" subtitle="Lifecycle distribution" icon={<BarChart3 className="w-4 h-4" />}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={3}
                stroke="white"
                strokeWidth={2}
              >
                {statusData.map((s) => (
                  <Cell key={s.name} fill={STATUS_COLORS[s.name] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 — Top products bar + Payment donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard className="lg:col-span-2" title="Top Products by Revenue" subtitle="Best performers" icon={<TrendingUp className="w-4 h-4" />}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={top} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-bar" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#AE3656" />
                  <stop offset="100%" stopColor="#1D7E64" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 11, fill: "#475569" }}
                axisLine={false}
                tickLine={false}
                width={200}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                formatter={(v: any, _k: any, item: any) => {
                  const r = item?.payload ?? {};
                  return [`${formatINR(Number(v))} · ${r.qty ?? 0} units`, `${r.name} (SKU: ${r.sku})`];
                }}
              />
              <Bar dataKey="revenue" fill="url(#grad-bar)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Payment Methods" subtitle="How customers pay" icon={<Wallet className="w-4 h-4" />}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={paymentData}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={95}
                paddingAngle={3}
                stroke="white"
                strokeWidth={2}
                label={(e: any) => `${Math.round((e.percent ?? 0) * 100)}%`}
              >
                {paymentData.map((_, i) => (
                  <Cell key={i} fill={PAY_COLORS[i % PAY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ─── Inventory & Stock analytics ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Boxes className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
            Inventory & Stock Analytics
          </h2>
        </div>

        {/* Inventory KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <Stat icon={Layers} label="Stock units" value={inventoryStats.units} tint="from-emerald-500 to-teal-500" hint={`${inventoryStats.total} SKUs · tap to view by category`} onClick={openStockDialog} />
          <Stat icon={IndianRupee} label="Inventory value" value={formatINR(inventoryStats.value)} tint="from-violet-500 to-fuchsia-500" hint="stock × price" />
          <Stat icon={AlertTriangle} label="Low stock" value={inventoryStats.low} tint="from-amber-500 to-orange-500" hint="≤ 5 units" />
          <Stat icon={PackageX} label="Out of stock" value={inventoryStats.out} tint="from-rose-500 to-red-500" hint="needs restock" />
        </div>

        {/* Category-wise stock (e.g., Silk Sarees › Banarasi Silk) */}
        <ChartCard
          className="mb-5"
          title="Stock by Category"
          subtitle="Units in hand grouped by parent › subcategory"
          icon={<Tag className="w-4 h-4" />}
        >
          {categoryStock.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-slate-400">
              No category data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(260, categoryStock.length * 38)}>
              <BarChart data={categoryStock} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-cat" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#C9A227" />
                    <stop offset="100%" stopColor="#1D7E64" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  tick={{ fontSize: 11, fill: "#475569" }}
                  axisLine={false}
                  tickLine={false}
                  width={170}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                  formatter={(v: any, _k: any, item: any) => {
                    const r = item?.payload ?? {};
                    return [`${v} units · ${r.products ?? 0} products · ${r.out ?? 0} out · ${r.low ?? 0} low`, r.name];
                  }}
                />
                <Bar dataKey="units" fill="url(#grad-cat)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Charts row — Stock distribution + Low stock list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <ChartCard title="Stock Level Distribution" subtitle="Health buckets across catalog" icon={<Boxes className="w-4 h-4" />}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stockBuckets} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {stockBuckets.map((b, i) => <Cell key={i} fill={b.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard className="lg:col-span-2" title="Low-Stock Products" subtitle="Reorder priority (≤ 5 units)" icon={<AlertTriangle className="w-4 h-4" />}>
            {lowStockList.length === 0 ? (
              <div className="h-[260px] flex flex-col items-center justify-center text-sm text-slate-400">
                <Boxes className="w-8 h-8 mb-2 text-emerald-300" />
                All products are well stocked.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={lowStockList} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    axisLine={false}
                    tickLine={false}
                    width={150}
                  />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="stock" radius={[0, 8, 8, 0]}>
                    {lowStockList.map((p, i) => <Cell key={i} fill={p.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Charts row — Movement trend + per-product movement */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
          <ChartCard className="lg:col-span-2" title="Stock Movement Trend" subtitle="Units shipped vs cancelled · last 14 days" icon={<Activity className="w-4 h-4" />}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={movementSeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="units" name="Units out" stroke="#2E8B57" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="cancelled" name="Cancelled" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top Movers" subtitle="Most units sold" icon={<TrendingUp className="w-4 h-4" />}>
            {productMovement.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">No movement yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={productMovement} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-mov" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#44A084" />
                      <stop offset="100%" stopColor="#0F5E4B" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="sold" name="Units sold" fill="url(#grad-mov)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>


      {/* Quick actions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-4 h-4 text-violet-600" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">Quick actions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickCard to="/admin/products" icon={Package} title="Products" sub="Manage your product catalog" color="from-violet-500 to-fuchsia-500" />
          <QuickCard to="/admin/users" icon={Users} title="Customers" sub="Profiles, addresses & orders" color="from-emerald-500 to-teal-500" />
          <QuickCard to="/admin/orders" icon={ShoppingBag} title="Orders" sub="Track and manage orders" color="from-sky-500 to-indigo-500" />
          <QuickCard to="/admin/categories" icon={Tag} title="Categories" sub="Organise nested categories" color="from-amber-500 to-orange-500" />
          <QuickCard to="/admin/homepage-images" icon={ImageIcon} title="Homepage Images" sub="Replace, crop & manage all images" color="from-slate-600 to-slate-800" />
          <QuickCard to="/admin/refunds" icon={Wallet} title="Refunds & Wallet" sub="Adjust balances & view refunds" color="from-rose-500 to-red-500" />
        </div>
      </div>

      {/* Stock drill-down dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {stockDialogCat && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStockDialogCat(null)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              {stockDialogCat ? stockDialogCat : "Stock units by category"}
            </DialogTitle>
            <DialogDescription>
              {stockDialogCat
                ? `${activeCatItems?.products ?? 0} products · ${activeCatItems?.units ?? 0} units in stock`
                : `${inventoryStats.units} units across ${categoryGroups.length} categories · tap a category to see SKUs`}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto -mx-2 px-2">
            {!stockDialogCat ? (
              <div className="divide-y divide-slate-100">
                {categoryGroups.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setStockDialogCat(c.name)}
                    className="w-full flex items-center justify-between gap-3 py-3 px-2 hover:bg-violet-50/60 rounded-lg text-left transition"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{c.name}</div>
                      <div className="text-xs text-slate-500">
                        {c.products} products
                        {c.out > 0 && <span className="text-rose-600"> · {c.out} out</span>}
                        {c.low > 0 && <span className="text-amber-600"> · {c.low} low</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                        {c.units} units
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>
                ))}
                {categoryGroups.length === 0 && (
                  <div className="py-10 text-center text-sm text-slate-400">No inventory yet.</div>
                )}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Product</th>
                    <th className="px-3 py-2 font-semibold">SKU</th>
                    <th className="px-3 py-2 font-semibold text-right">Price</th>
                    <th className="px-3 py-2 font-semibold text-right">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeCatItems?.items ?? [])
                    .slice()
                    .sort((a: any, b: any) => a.stock - b.stock)
                    .map((it: any) => (
                      <tr key={it.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-900">
                          <Link to={`/admin/products/${it.id}`} className="hover:text-violet-700" onClick={() => setStockDialogOpen(false)}>
                            {it.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-mono text-[12px] text-slate-600 bg-slate-100 rounded px-1.5 py-0.5">{it.sku}</span>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">{formatINR(it.price)}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                            it.stock === 0 ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                              : it.stock <= 5 ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          }`}>
                            {it.stock === 0 ? "Out" : `${it.stock} units`}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, tint, hint, onClick }: any) => {
  const Tag: any = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm hover:shadow-md transition text-left w-full ${onClick ? "cursor-pointer hover:-translate-y-0.5" : ""}`}
    >
      <div className={`absolute -right-8 -top-8 w-28 h-28 rounded-full bg-gradient-to-br ${tint} opacity-10`} />
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tint} text-white flex items-center justify-center shadow`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
          <div className="text-2xl font-bold text-slate-900 leading-tight">{value}</div>
          {hint && <div className="text-[11px] text-slate-400">{hint}</div>}
        </div>
      </div>
    </Tag>
  );
};

const ChartCard = ({ title, subtitle, icon, children, className = "" }: any) => (
  <div className={`rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm ${className}`}>
    <div className="flex items-start justify-between mb-3">
      <div>
        <div className="flex items-center gap-2 text-slate-900 font-semibold">
          <span className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">{icon}</span>
          {title}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
      </div>
    </div>
    {children}
  </div>
);

const QuickCard = ({ to, icon: Icon, title, sub, color }: any) => (
  <Link
    to={to}
    className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-200/70 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${color} shadow`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="text-xs text-slate-500 truncate">{sub}</div>
    </div>
    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-violet-600 transition" />
  </Link>
);

const DateRangeBar = ({
  preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo,
  range, loading, onExportCsv, onExportXlsx, onExportPdf,
}: {
  preset: Preset; setPreset: (p: Preset) => void;
  customFrom?: Date; setCustomFrom: (d?: Date) => void;
  customTo?: Date; setCustomTo: (d?: Date) => void;
  range: Range; loading: boolean;
  onExportCsv: () => void; onExportXlsx: () => void; onExportPdf: () => void;
}) => (
  <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm flex flex-wrap items-center gap-3">
    <div className="flex items-center gap-2">
      <CalendarIcon className="w-4 h-4 text-violet-600" />
      <span className="text-sm font-semibold text-slate-700">Period</span>
    </div>

    <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
      <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
      <SelectContent className="z-50 bg-white">
        {PRESET_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>

    {preset === "custom" && (
      <>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-9 font-normal", !customFrom && "text-muted-foreground")}>
              <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
              {customFrom ? format(customFrom, "dd MMM yyyy") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50 bg-white" align="start">
            <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        <span className="text-slate-400 text-sm">→</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-9 font-normal", !customTo && "text-muted-foreground")}>
              <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
              {customTo ? format(customTo, "dd MMM yyyy") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50 bg-white" align="start">
            <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
      </>
    )}

    <div className="text-xs text-slate-500 px-2 py-1 rounded-md bg-slate-50 ring-1 ring-slate-200">
      {format(range.from, "dd MMM yyyy")} → {format(range.to, "dd MMM yyyy")} · {range.granularity}-wise
    </div>

    {loading && (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> loading
      </span>
    )}

    <div className="ml-auto flex items-center gap-2">
      <Button variant="outline" size="sm" className="h-9" onClick={onExportCsv}>
        <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
      </Button>
      <Button variant="outline" size="sm" className="h-9" onClick={onExportXlsx}>
        <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Excel
      </Button>
      <Button variant="outline" size="sm" className="h-9" onClick={onExportPdf}>
        <FileText className="w-3.5 h-3.5 mr-1.5" /> PDF
      </Button>
    </div>
  </div>
);

// ---- Exports ----
function buildRows(orders: any[]) {
  return orders.map((o: any) => ({
    "Order ID":     o.id,
    "Date":         format(new Date(o.created_at), "dd MMM yyyy HH:mm"),
    "Customer":     o.shipping_address?.full_name ?? o.shipping_address?.name ?? "—",
    "Status":       o.status ?? "",
    "Payment":      o.payment_method ?? "",
    "Payment Status": o.payment_status ?? "",
    "Total (INR)":  Number(o.total ?? 0),
  }));
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportOrders(kind: "csv" | "xlsx" | "pdf", orders: any[], range: Range, stats?: any) {
  const rows = buildRows(orders);
  const base = `orders_${format(range.from, "yyyyMMdd")}_${format(range.to, "yyyyMMdd")}`;

  if (kind === "csv") {
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    downloadBlob(`${base}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8" }));
    return;
  }
  if (kind === "xlsx") {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Orders");
    XLSX.writeFile(wb, `${base}.xlsx`);
    return;
  }
  // PDF
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(`${site.brand.name} — Orders Report`, 14, 14);
  doc.setFontSize(10);
  doc.text(`Period: ${format(range.from, "dd MMM yyyy")} → ${format(range.to, "dd MMM yyyy")}`, 14, 20);
  if (stats) {
    doc.text(
      `Orders: ${stats.ordersCount}   Revenue: ₹${Number(stats.rev).toFixed(2)}   AOV: ₹${Number(stats.aov).toFixed(2)}   Units sold: ${stats.productsSold}`,
      14, 26,
    );
  }
  autoTable(doc, {
    startY: 32,
    head: [Object.keys(rows[0] ?? { "Order ID": "", Date: "", Customer: "", Status: "", Payment: "", "Payment Status": "", "Total (INR)": "" })],
    body: rows.map(r => Object.values(r)),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [124, 58, 237] },
  });
  doc.save(`${base}.pdf`);
}

export default AdminDashboard;
