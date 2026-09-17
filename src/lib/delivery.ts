// Delivery ETA helpers.
// "Local" addresses (site.delivery.local in src/config/site.ts) get the faster
// estimate; everything else uses site.delivery.standardDays.
import { site } from "@/config/site";

const { local, standardDays } = site.delivery;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const localTermsRe = local.matchTerms.length
  ? new RegExp(`\\b(?:${local.matchTerms.map(escapeRegex).join("|")})\\b`)
  : null;

export const isLocalDeliveryAddress = (addr: any): boolean => {
  if (!addr) return false;
  const hay = [
    addr.city,
    addr.state,
    addr.address,
    addr.address_line1,
    addr.address_line2,
    addr.pincode,
    addr.zip,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (localTermsRe?.test(hay)) return true;
  if (local.pincodeRange) {
    const [min, max] = local.pincodeRange;
    for (const m of hay.matchAll(/\b(\d{6})\b/g)) {
      const n = parseInt(m[1], 10);
      if (n >= min && n <= max) return true;
    }
  }
  return false;
};

export type EtaInfo = {
  isLocal: boolean;
  minDays: number;
  maxDays: number;
  label: string;          // e.g. "2–3 Days" / "5 Days"
  expectedDate: Date;     // farthest expected delivery date
};

export const computeEta = (addr: any, from: Date = new Date()): EtaInfo => {
  const isLocal = isLocalDeliveryAddress(addr);
  const minDays = isLocal ? local.minDays : standardDays;
  const maxDays = isLocal ? local.maxDays : standardDays;
  const expectedDate = new Date(from);
  expectedDate.setDate(expectedDate.getDate() + maxDays);
  return {
    isLocal,
    minDays,
    maxDays,
    label: minDays === maxDays ? `${maxDays} Days` : `${minDays}–${maxDays} Days`,
    expectedDate,
  };
};

export const formatEtaDate = (d: Date | string): string =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const toDateInput = (d: Date): string => d.toISOString().slice(0, 10);
