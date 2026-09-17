import { site } from "@/config/site";

export const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

// Shipping rules (values in src/config/site.ts → site.shipping)
//  - Single product order → singleItemFee
//  - Two or more products → multiItemFee
//  - Orders at/above freeShippingThreshold → FREE
export const SHIPPING_SINGLE = site.shipping.singleItemFee;
export const SHIPPING_MULTI = site.shipping.multiItemFee;
export const FREE_SHIPPING_THRESHOLD = site.shipping.freeShippingThreshold;

export const calcShipping = (subtotal: number, itemCount: number = 1) => {
  if (!subtotal || subtotal <= 0) return 0;
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return itemCount >= 2 ? SHIPPING_MULTI : SHIPPING_SINGLE;
};

// Wallet automation
export const CANCEL_FEE_PCT = 0.02;        // 2% processing fee on cancellation refund (online payments only)
export const WALLET_PROCESSING_PCT = 0.07; // 7% processing fee when wallet is used to pay

export const calcCancelRefund = (amount: number) => {
  const gross = Math.max(0, Number(amount) || 0);
  const fee = Math.round(gross * CANCEL_FEE_PCT * 100) / 100;
  const net = Math.max(0, gross - fee);
  return { gross, fee, net };
};

export const calcWalletDebit = (applied: number) => {
  const amt = Math.max(0, Number(applied) || 0);
  const fee = Math.round(amt * WALLET_PROCESSING_PCT * 100) / 100;
  const total = amt + fee;
  return { applied: amt, fee, total };
};
