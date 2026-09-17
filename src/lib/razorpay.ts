import { supabase } from "@/lib/supabase";
import { site } from "@/config/site";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

let scriptPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => { scriptPromise = null; resolve(false); };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export type RazorpayPrefill = {
  name?: string;
  email?: string;
  contact?: string;
};

export type RazorpayResult =
  | { ok: true; paymentId: string }
  | { ok: false; reason: "dismissed" | "failed" | "verify_failed"; message?: string; paymentId?: string };

export async function startRazorpayPayment(opts: {
  orderId: string;
  amount: number;
  prefill?: RazorpayPrefill;
  description?: string;
}): Promise<RazorpayResult> {
  const loaded = await loadRazorpayScript();
  if (!loaded) return { ok: false, reason: "failed", message: "Couldn't load Razorpay" };

  // 1) Create order on backend
  const { data: createData, error: createErr } = await supabase.functions.invoke(
    "razorpay-create-order",
    { body: { order_id: opts.orderId, amount: opts.amount } },
  );
  if (createErr || !createData?.razorpay_order_id) {
    return { ok: false, reason: "failed", message: createErr?.message || createData?.error || "Couldn't create payment order" };
  }

  // 2) Open checkout
  return new Promise((resolve) => {
    const rzp = new window.Razorpay({
      key: createData.key_id,
      amount: createData.amount,
      currency: createData.currency,
      name: site.brand.paymentDisplayName,
      description: opts.description ?? "Order payment",
      order_id: createData.razorpay_order_id,
      prefill: opts.prefill ?? {},
      theme: { color: "#0F5E4B" },
      modal: {
        ondismiss: () => resolve({ ok: false, reason: "dismissed" }),
      },
      handler: async (resp: any) => {
        const paymentId = String(resp?.razorpay_payment_id ?? "");
        const { data: verifyData, error: verifyErr } = await supabase.functions.invoke(
          "razorpay-verify-payment",
          {
            body: {
              order_id: opts.orderId,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: paymentId,
              razorpay_signature: resp.razorpay_signature,
            },
          },
        );
        // Note: supabase.functions.invoke sets `error` for any non-2xx response,
        // but the JSON body is still returned in `data`. Prefer the body's message.
        const verified = Boolean(verifyData?.verified);
        if (!verified) {
          const bodyErr = (verifyData as any)?.error;
          // The payment succeeded at Razorpay (we're inside `handler`), so this
          // is a verification/persistence failure — not a Razorpay failure.
          resolve({
            ok: false,
            reason: "verify_failed",
            paymentId,
            message: bodyErr || verifyErr?.message || "Payment received, but order confirmation is pending. Please contact support.",
          });
          return;
        }
        resolve({ ok: true, paymentId });
      },
    });
    rzp.on("payment.failed", (resp: any) => {
      resolve({ ok: false, reason: "failed", message: resp?.error?.description || "Payment failed" });
    });
    rzp.open();
  });
}

