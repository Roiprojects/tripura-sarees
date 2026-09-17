import { describe, expect, it } from "vitest";
import { computeEta, isLocalDeliveryAddress } from "@/lib/delivery";
import { site } from "@/config/site";

const { local, standardDays } = site.delivery;

describe("delivery ETA (site.delivery config)", () => {
  it("treats addresses matching a local term as local", () => {
    const addr = { city: local.matchTerms[0], state: "", pincode: "" };
    expect(isLocalDeliveryAddress(addr)).toBe(true);
    const eta = computeEta(addr, new Date("2026-01-01T00:00:00Z"));
    expect(eta.isLocal).toBe(true);
    expect([eta.minDays, eta.maxDays]).toEqual([local.minDays, local.maxDays]);
  });

  it("treats a PIN inside the configured range as local", () => {
    if (!local.pincodeRange) return;
    expect(isLocalDeliveryAddress({ city: "Somewhere", pincode: String(local.pincodeRange[0]) })).toBe(true);
  });

  it("uses the standard estimate for other addresses", () => {
    const eta = computeEta({ city: "Far Away Town", pincode: "110001" }, new Date("2026-01-01T00:00:00Z"));
    expect(eta.isLocal).toBe(false);
    expect(eta.maxDays).toBe(standardDays);
    expect(eta.label).toBe(`${standardDays} Days`);
  });
});
