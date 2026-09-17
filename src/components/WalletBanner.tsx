import { Wallet, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import { formatINR } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

export const WalletBanner = () => {
  const { user } = useAuth();
  const { balance } = useWallet();
  if (!user || balance <= 0) return null;
  return (
    <div className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-sky/10 to-primary/5 px-4 py-3 md:px-5 md:py-4 flex flex-wrap items-center gap-3 shadow-sm animate-fade-in">
      <div className="w-10 h-10 rounded-xl bg-white/70 grid place-items-center shadow-sm">
        <Wallet className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">
          Wallet Balance Available:{" "}
          <span className="text-primary font-display text-base">{formatINR(balance)}</span>
        </p>
        <p className="text-xs text-muted-foreground">Will be applied automatically at checkout.</p>
      </div>
      <Link
        to="/account?tab=wallet"
        className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 whitespace-nowrap"
      >
        View wallet <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
};
