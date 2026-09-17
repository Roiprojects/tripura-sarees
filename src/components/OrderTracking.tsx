import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { site } from "@/config/site";
import { CheckCircle2, Circle, Package, ClipboardCheck, Boxes, Truck, Bike, Home, Clock, MapPin, Phone, ExternalLink, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { computeEta, formatEtaDate } from "@/lib/delivery";

export const TRACK_STAGES = [
  { key: "placed", label: "Order Placed", Icon: ClipboardCheck },
  { key: "confirmed", label: "Confirmed", Icon: CheckCircle2 },
  { key: "packed", label: "Packed", Icon: Boxes },
  { key: "shipped", label: "Shipped", Icon: Truck },
  { key: "out_for_delivery", label: "Out for Delivery", Icon: Bike },
  { key: "delivered", label: "Delivered", Icon: Home },
] as const;

export type TrackStageKey = (typeof TRACK_STAGES)[number]["key"];

const stageIndex = (s?: string) => {
  const i = TRACK_STAGES.findIndex((x) => x.key === s);
  return i < 0 ? 0 : i;
};

export const OrderTracking = ({ orderId }: { orderId: string }) => {
  const [tracking, setTracking] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const [{ data: t }, { data: u }, { data: o }] = await Promise.all([
      supabase.from("order_tracking").select("*").eq("order_id", orderId).maybeSingle(),
      supabase.from("delivery_updates").select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
      supabase.from("orders").select("shipping_address, created_at, status").eq("id", orderId).maybeSingle(),
    ]);
    setTracking(t);
    setUpdates(u ?? []);
    setOrder(o);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // Poll for updates (realtime broadcast was disabled to prevent cross-customer data leakage)
    const interval = setInterval(fetchAll, 30000);
    return () => { clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const currentIdx = stageIndex(tracking?.current_status);
  const pct = Math.round((currentIdx / (TRACK_STAGES.length - 1)) * 100);

  const eta = order?.shipping_address
    ? computeEta(order.shipping_address, new Date(order.created_at))
    : null;
  const expectedDate = tracking?.expected_delivery_date
    ? new Date(tracking.expected_delivery_date)
    : eta?.expectedDate;
  const isDelivered = tracking?.current_status === "delivered";

  return (
    <div className="mt-4 rounded-2xl border border-border bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Live Tracking</p>
          <h4 className="font-display font-bold text-base md:text-lg">
            {tracking ? TRACK_STAGES[currentIdx].label : loading ? "Loading…" : "Awaiting dispatch"}
          </h4>
          {eta && !isDelivered && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              {eta.isLocal ? <Zap className="w-3.5 h-3.5 text-emerald-600" /> : <Truck className="w-3.5 h-3.5 text-primary" />}
              Estimated Delivery: <span className="font-semibold text-foreground">{eta.label}</span>
              <span className="text-muted-foreground/70">· {eta.isLocal ? site.delivery.local.label : `Outside ${site.delivery.local.label}`}</span>
            </p>
          )}
        </div>
        {expectedDate && !isDelivered && (
          <Badge variant="outline" className="rounded-full bg-emerald-50 text-emerald-800 border-emerald-200">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Arrives by {formatEtaDate(expectedDate)}
          </Badge>
        )}
        {isDelivered && (
          <Badge variant="outline" className="rounded-full bg-emerald-100 text-emerald-900 border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Delivered
          </Badge>
        )}
      </div>


      {/* Progress bar */}
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-lime-500 to-primary transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
        {tracking && currentIdx < TRACK_STAGES.length - 1 && (
          <div className="absolute inset-y-0 left-0 w-full bg-white/40 animate-pulse pointer-events-none" style={{ width: `${pct}%` }} />
        )}
      </div>

      {/* Stage markers */}
      <div className="mt-4 grid grid-cols-6 gap-1 md:gap-2">
        {TRACK_STAGES.map((s, i) => {
          const done = i <= currentIdx && !!tracking;
          const active = i === currentIdx && !!tracking;
          const Icon = s.Icon;
          return (
            <div key={s.key} className="flex flex-col items-center text-center">
              <div
                className={`relative w-9 h-9 md:w-10 md:h-10 rounded-full grid place-items-center transition-all ${
                  done ? "bg-gradient-to-br from-emerald-500 to-primary text-white shadow-lg shadow-primary/30" : "bg-muted text-muted-foreground"
                } ${active ? "ring-4 ring-primary/20 scale-110" : ""}`}
              >
                <Icon className="w-4 h-4 md:w-5 md:h-5" />
                {active && <span className="absolute -inset-0.5 rounded-full border-2 border-primary animate-ping opacity-60" />}
              </div>
              <span className={`mt-1.5 text-[10px] md:text-xs leading-tight ${done ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Courier details */}
      {tracking && (tracking.courier_name || tracking.tracking_id) && (
        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          {tracking.courier_name && (
            <div className="rounded-xl bg-muted/40 border border-border/60 px-3 py-2 text-sm">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Courier</p>
              <p className="font-semibold">{tracking.courier_name}</p>
            </div>
          )}
          {tracking.tracking_id && (
            <div className="rounded-xl bg-muted/40 border border-border/60 px-3 py-2 text-sm flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tracking ID</p>
                <p className="font-mono font-semibold truncate">{tracking.tracking_id}</p>
              </div>
              {tracking.tracking_url && (
                <a href={tracking.tracking_url} target="_blank" rel="noreferrer" className="text-primary text-xs inline-flex items-center gap-1 hover:underline shrink-0">
                  Track <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
          {tracking.delivery_partner_phone && (
            <a href={`tel:${tracking.delivery_partner_phone}`} className="rounded-xl bg-muted/40 border border-border/60 px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted/70">
              <Phone className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Delivery partner</p>
                <p className="font-semibold">{tracking.delivery_partner_phone}</p>
              </div>
            </a>
          )}
          {tracking.dispatch_notes && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900 sm:col-span-2">
              <p className="text-[11px] uppercase tracking-wider opacity-70">Note from team</p>
              <p>{tracking.dispatch_notes}</p>
            </div>
          )}
        </div>
      )}


      {!tracking && !loading && (
        <p className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
          <Package className="w-4 h-4" /> We'll start tracking your shipment here as soon as it's dispatched.
        </p>
      )}
    </div>
  );
};

export default OrderTracking;
