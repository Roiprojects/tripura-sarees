import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

export type WalletTx = {
  id: string;
  wallet_id: string;
  user_id: string;
  type: "credit" | "debit";
  amount: number;
  balance_after: number;
  source: "refund" | "purchase" | "admin_adjustment" | "signup_bonus" | "other";
  reference_id: string | null;
  description: string | null;
  status: "completed" | "pending" | "failed";
  created_at: string;
};

export const useWallet = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const wallet = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data as { id: string; balance: number } | null;
    },
    enabled: !!user,
  });

  const transactions = useQuery({
    queryKey: ["wallet-tx", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as WalletTx[];
    },
    enabled: !!user,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["wallet", user?.id] });
    qc.invalidateQueries({ queryKey: ["wallet-tx", user?.id] });
    qc.invalidateQueries({ queryKey: ["account-orders", user?.id] });
    qc.invalidateQueries({ queryKey: ["orders", user?.id] });
  };

  return {
    balance: Number(wallet.data?.balance ?? 0),
    transactions: transactions.data ?? [],
    isLoading: wallet.isLoading || transactions.isLoading,
    refresh,
  };
};
