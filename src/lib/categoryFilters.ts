export type CategoryFilterRow = {
  id: string;
  parent_id: string | null;
  name?: string | null;
  slug?: string | null;
};

export type ProductCategoryLike = {
  category_id?: string | null;
  extra_category_ids?: string[] | null;
  name?: string | null;
  tags?: string[] | null;
};

const normalize = (value: unknown) => String(value ?? "").toLowerCase().trim();

const hasSelectedDescendant = (
  id: string,
  selected: Set<string>,
  parentOf: Map<string, string | null>,
) => {
  for (const other of selected) {
    if (other === id) continue;
    let pid = parentOf.get(other) ?? null;
    while (pid) {
      if (pid === id) return true;
      pid = parentOf.get(pid) ?? null;
    }
  }
  return false;
};

/**
 * Keeps only the deepest selected category nodes. If the UI auto-selects
 * Silk Sarees + Banarasi Silk, this returns Banarasi Silk only.
 */
export function getEffectiveCategoryFilterIds(
  selectedIds: string[],
  categories: CategoryFilterRow[],
) {
  if (!selectedIds.length) return [] as string[];
  const selected = new Set(selectedIds);
  const parentOf = new Map(categories.map((c) => [c.id, c.parent_id]));
  return selectedIds.filter((id) => !hasSelectedDescendant(id, selected, parentOf));
}

export function expandCategoryFilterIds(
  selectedIds: string[],
  categories: CategoryFilterRow[],
) {
  const childMap = new Map<string, string[]>();
  categories.forEach((c) => {
    if (!c.parent_id) return;
    const arr = childMap.get(c.parent_id) ?? [];
    arr.push(c.id);
    childMap.set(c.parent_id, arr);
  });

  const out = new Set<string>();
  const stack = [...selectedIds];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    for (const child of childMap.get(id) ?? []) stack.push(child);
  }
  return out;
}

export function buildCategoryFilterTokens(
  selectedIds: string[],
  categories: CategoryFilterRow[],
) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const tokens = new Set<string>();
  selectedIds.forEach((id) => {
    const row = byId.get(id);
    if (!row) return;
    const slug = normalize(row.slug);
    const name = normalize(row.name);
    if (slug) tokens.add(slug);
    if (name) tokens.add(name);
  });
  return tokens;
}

export function matchesEffectiveCategoryFilter(
  product: ProductCategoryLike,
  expandedCategoryIds: Set<string>,
  tokenFallback: Set<string>,
  knownCategoryIds: Set<string>,
) {
  if (expandedCategoryIds.size === 0) return true;

  const productCategoryIds = [
    product.category_id,
    ...(Array.isArray(product.extra_category_ids) ? product.extra_category_ids : []),
  ].filter(Boolean) as string[];

  const hasStructuredCategory = productCategoryIds.some((id) => knownCategoryIds.has(id));
  const matchedById = productCategoryIds.some((id) => expandedCategoryIds.has(id));

  // If the product has real category assignments, those are authoritative.
  // Do not OR a broad tag/name fallback back in, or sibling categories leak in.
  if (hasStructuredCategory) return matchedById;

  if (matchedById) return true;
  if (tokenFallback.size === 0) return false;

  const tagsLc = (product.tags ?? []).map(normalize);
  const nameLc = normalize(product.name);
  for (const token of tokenFallback) {
    if (tagsLc.includes(token) || tagsLc.some((tag) => tag.includes(token)) || nameLc.includes(token)) {
      return true;
    }
  }
  return false;
}
