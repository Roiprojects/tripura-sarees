import { describe, expect, it } from "vitest";
import {
  OCCASIONS,
  SAREE_CATEGORIES,
  categoryImage,
  occasionImageForLink,
  productDetailLine,
} from "@/lib/sareeCatalog";

describe("saree catalogue helpers", () => {
  it("describes a product by occasion, then by size", () => {
    expect(productDetailLine({ collection: "office wear", sizes: ["Free Size"] })).toBe("Office Wear");
    expect(productDetailLine({ collection: null, sizes: ["Free Size"] })).toBe("Free Size");
    expect(productDetailLine({ collection: "", sizes: [] })).toBe("Free Size");
    expect(productDetailLine({ collection: "", sizes: ["34", "36", "38"] })).toBe("Sizes 34–38");
  });

  it("maps occasion links to their artwork and falls back to the first occasion", () => {
    const festive = OCCASIONS.find((o) => o.slug === "festive")!;
    expect(occasionImageForLink("/occasion/festive")).toBe(festive.image);
    expect(occasionImageForLink("/occasion/festive/?ref=home")).toBe(festive.image);
    expect(occasionImageForLink("/somewhere-else")).toBe(OCCASIONS[0].image);
  });

  it("prefers an uploaded category image over built-in artwork", () => {
    const banarasi = SAREE_CATEGORIES[0].children!.find((c) => c.slug === "banarasi-silk")!;
    expect(categoryImage("banarasi-silk")).toBe(banarasi.image);
    expect(categoryImage("banarasi-silk", "https://cdn.example.com/banarasi.jpg")).toBe("https://cdn.example.com/banarasi.jpg");
  });

  it("gives every weave group three weaves with unique slugs", () => {
    const slugs = SAREE_CATEGORIES.flatMap((c) => [c.slug, ...(c.children ?? []).map((k) => k.slug)]);
    expect(new Set(slugs).size).toBe(slugs.length);
    SAREE_CATEGORIES.forEach((c) => expect(c.children).toHaveLength(3));
  });
});
