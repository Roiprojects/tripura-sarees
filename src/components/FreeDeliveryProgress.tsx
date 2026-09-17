import { formatINR, FREE_SHIPPING_THRESHOLD } from "@/lib/format";

type Props = {
  subtotal: number;
  threshold?: number;
  className?: string;
};

export const FreeDeliveryProgress = ({ subtotal, threshold = FREE_SHIPPING_THRESHOLD, className = "" }: Props) => {
  const remaining = Math.max(0, threshold - subtotal);
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
  const unlocked = remaining <= 0;

  return (
    <div
      className={`rounded-xl overflow-hidden border shadow-sm ${
        unlocked
          ? "border-emerald-500/40 bg-gradient-to-r from-emerald-50 via-emerald-50 to-lime-50 dark:from-emerald-950/40 dark:to-lime-950/30"
          : "border-emerald-500/30 bg-gradient-to-r from-emerald-50 via-lime-50 to-yellow-50 dark:from-emerald-950/40 dark:via-lime-950/30 dark:to-yellow-950/30"
      } ${className}`}
    >
      <div className="px-3 py-2 flex items-center gap-2">
        <span className="text-base leading-none animate-bounce">🚚</span>
        <p className="text-[12px] font-bold text-emerald-700 dark:text-emerald-300 flex-1 leading-tight">
          {unlocked ? (
            <>
              Yay! You unlocked{" "}
              <span className="font-extrabold uppercase tracking-wide bg-gradient-to-r from-emerald-600 to-lime-600 bg-clip-text text-transparent">
                FREE delivery
              </span>{" "}
              🎉
            </>
          ) : (
            <>
              Add{" "}
              <span className="font-extrabold text-emerald-800 dark:text-emerald-200 bg-emerald-200/70 dark:bg-emerald-800/40 px-1.5 py-0.5 rounded">
                {formatINR(remaining)}
              </span>{" "}
              more for{" "}
              <span className="font-extrabold uppercase tracking-wide bg-gradient-to-r from-emerald-600 to-lime-600 bg-clip-text text-transparent">
                FREE delivery
              </span>
            </>
          )}
        </p>
      </div>
      <div className="h-1.5 bg-emerald-100 dark:bg-emerald-900/40">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 via-lime-500 to-yellow-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
