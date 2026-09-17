import { describe, expect, it } from "vitest";
import {
  buildCategoryFilterTokens,
  expandCategoryFilterIds,
  getEffectiveCategoryFilterIds,
  matchesEffectiveCategoryFilter,
  type CategoryFilterRow,
} from "@/lib/categoryFilters";

const categories: CategoryFilterRow[] = [
  { id: "ethnic", parent_id: null, name: "Ethnic Wear", slug: "ethnic-wear" },
  { id: "kurta", parent_id: "ethnic", name: "Kurta Set", slug: "kurta-set" },
  { id: "indo", parent_id: "ethnic", name: "Indo-Western", slug: "indo-western" },
  { id: "party", parent_id: null, name: "Party Wear", slug: "party-wear" },
  { id: "suits", parent_id: "party", name: "Suits", slug: "suits" },
  { id: "waistcoat", parent_id: "party", name: "Waistcoat Sets", slug: "waistcoat-sets" },
];

const products = [
  { name: "Kurta Product 1", category_id: "kurta", tags: ["ethnic"] },
  { name: "Kurta Product 2", category_id: "kurta", tags: ["ethnic"] },
  { name: "Indo-Western Product", category_id: "indo", tags: ["ethnic"] },
  { name: "Suit Product", category_id: "suits", tags: ["party"] },
  { name: "Waistcoat Product", category_id: "waistcoat", tags: ["party"] },
];

const filter = (selectedIds: string[]) => {
  const effective = getEffectiveCategoryFilterIds(selectedIds, categories);
  const expanded = expandCategoryFilterIds(effective, categories);
  const tokens = buildCategoryFilterTokens(effective, categories);
  const known = new Set(categories.map((category) => category.id));
  return products
    .filter((product) => matchesEffectiveCategoryFilter(product, expanded, tokens, known))
    .map((product) => product.name);
};

describe("category hierarchy filters", () => {
  it("returns all descendants for parent-only category selection", () => {
    expect(filter(["ethnic"])).toEqual([
      "Kurta Product 1",
      "Kurta Product 2",
      "Indo-Western Product",
    ]);
  });

  it("returns only the selected child when parent is auto-selected", () => {
    expect(getEffectiveCategoryFilterIds(["ethnic", "kurta"], categories)).toEqual(["kurta"]);
    expect(filter(["ethnic", "kurta"])).toEqual(["Kurta Product 1", "Kurta Product 2"]);
  });

  it("keeps sibling subcategories separate", () => {
    expect(filter(["ethnic", "indo"])).toEqual(["Indo-Western Product"]);
    expect(filter(["party", "suits"])).toEqual(["Suit Product"]);
    expect(filter(["party", "waistcoat"])).toEqual(["Waistcoat Product"]);
  });

  it("does not allow broad parent fallback tags to override structured category ids", () => {
    const effective = getEffectiveCategoryFilterIds(["ethnic", "kurta"], categories);
    const expanded = expandCategoryFilterIds(effective, categories);
    const tokens = new Set(["ethnic wear", "ethnic", ...buildCategoryFilterTokens(effective, categories)]);
    const known = new Set(categories.map((category) => category.id));

    expect(matchesEffectiveCategoryFilter(products[2], expanded, tokens, known)).toBe(false);
  });
});