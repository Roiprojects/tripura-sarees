import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatINR, calcCancelRefund } from "@/lib/format";
import { Wallet, Banknote, Info, AlertTriangle, Sparkles, Loader2, XCircle } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  amount: number;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  onCancelled?: () => void;
};

const REASONS = [
  "Ordered by mistake",
  "Found a better price",
  "Delivery is taking too long",
  "Wrong size / colour",
  "Other",
];

export const CancelOrderDialog = ({
  open, onOpenChange, orderId, amount, paymentMethod, paymentStatus, onCancelled,
}: Props) => {
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const isCodUnpaid =
    (paymentMethod ?? "").toLowerCase() === "cod" &&
    (paymentStatus ?? "").toLowerCase() !== "paid";

  const { gross, fee, net } = calcCancelRefund(amount);

  const confirm = async () => {
    setBusy(true);
    const fullReason = reason + (note.trim() ? ` — ${note.trim()}` : "");
    const { data, error } = await (supabase as any).rpc("cancel_order_with_refund", {
      p_order_id: orderId,
      p_reason: fullReason,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message || "Couldn't cancel order");
      return;
    }
    const cod = !!data?.cod;
    if (cod) {
      toast.success("Order cancelled. Wallet refund not applicable for COD orders.");
    } else {
      toast.success(
        `Order cancelled. ${formatINR(Number(data?.refunded ?? net) || net)} refund pending admin approval — you'll see it in your wallet once confirmed.`
      );
    }
    onOpenChange(false);
    onCancelled?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl p-0 overflow-hidden border-border/60 shadow-2xl max-w-md">
        {/* Header band */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-rose-50 via-background to-amber-50 dark:from-rose-950/30 dark:via-background dark:to-amber-950/20">
          <div className="absolute inset-x-0 -top-16 h-32 bg-rose-400/20 blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white grid place-items-center shadow-lg shadow-rose-500/30 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl font-bold tracking-tight">Cancel this order?</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-snug">
                {isCodUnpaid
                  ? "Cash on Delivery — nothing was charged, so no refund is needed."
                  : "This action can't be undone. Your refund will be credited to your wallet once our team confirms it."}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-4">
          {/* Refund summary card */}
          {isCodUnpaid ? (
            <div className="rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 p-4 flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/70 dark:bg-amber-900/30 grid place-items-center shrink-0 shadow-sm">
                <Banknote className="w-5 h-5 text-amber-700 dark:text-amber-300" />
              </div>
              <div className="text-sm text-amber-900 dark:text-amber-100">
                <p className="font-semibold">No refund needed</p>
                <p className="text-xs mt-0.5 text-amber-800/80 dark:text-amber-200/80">
                  Order total {formatINR(gross)} · nothing was collected upfront.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-background to-primary/[0.04] p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 grid place-items-center shrink-0 shadow-md shadow-primary/20">
                  <Wallet className="w-5 h-5 text-primary-foreground" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 grid place-items-center ring-2 ring-background">
                    <Sparkles className="w-2.5 h-2.5 text-white" />
                  </span>
                </div>
                <div className="text-sm flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Wallet refund (pending approval)</p>
                  <p className="font-display font-bold text-2xl leading-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {formatINR(net)}
                  </p>
                </div>
              </div>

              <div className="text-xs space-y-1.5 pt-3 border-t border-border/60">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order amount</span>
                  <span className="font-semibold tabular-nums">{formatINR(gross)}</span>
                </div>
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>Processing fee (2%)</span>
                  <span className="font-semibold tabular-nums">− {formatINR(fee)}</span>
                </div>
                <div className="flex justify-between text-primary pt-1.5 border-t border-dashed border-border/60">
                  <span className="font-semibold">Credited to wallet</span>
                  <span className="font-bold tabular-nums">{formatINR(net)}</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 bg-muted/40 rounded-lg px-2.5 py-2">
                <Info className="w-3.5 h-3.5 mt-px shrink-0" />
                <span>Heads up — using wallet on a future order adds a 7% processing fee.</span>
              </p>
            </div>
          )}

          {/* Reason chips */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Reason for cancellation</p>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => {
                const active = reason === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20 scale-[1.02]"
                        : "bg-background border-border/70 text-foreground/80 hover:border-primary/40 hover:bg-primary/[0.04]"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
            <Textarea
              placeholder="Add a note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={200}
              className="rounded-xl resize-none text-sm"
            />
            <div className="text-[10px] text-muted-foreground text-right">{note.length}/200</div>
          </div>
        </div>

        <AlertDialogFooter className="px-6 pb-6 pt-0 gap-2 sm:gap-2">
          <AlertDialogCancel disabled={busy} className="rounded-full flex-1 sm:flex-none">
            Keep order
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); confirm(); }}
            disabled={busy}
            className="rounded-full flex-1 sm:flex-none bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-600 hover:to-rose-600 text-white shadow-lg shadow-rose-500/25 gap-1.5"
          >
            {busy ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Cancelling…</>
            ) : isCodUnpaid ? (
              <><XCircle className="w-4 h-4" /> Yes, cancel order</>
            ) : (
              <><Wallet className="w-4 h-4" /> Cancel & refund {formatINR(net)}</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
