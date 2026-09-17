// Coupon math + eligibility. Kept pure so cart & checkout can share it.

export type CouponType =
  | "percentage"
  | "fixed"
  | "free_shipping"
  | "product"
  | "category"
  | "brand"
  | "min_order"
  | "first_order"
  | "preorder";

export type CouponSpec = {
  id: string;
  code: string;
  coupon_type: CouponType;
  discount_type: string; // legacy: 'percent' | 'flat' | 'percentage' | 'fixed'
  discount_value: number;
  max_discount: number | null;
  min_order: number;
  applicable_product_ids: string[];
  applicable_category_ids: string[];
  applicable_brands: string[];
  preorder_only: boolean;
  first_order_only: boolean;
};

export type CartLine = {
  product_id: string;
  quantity: number;
  unit_price: number;                 // after size-wise discount
  original_unit_price?: number;       // before size-wise discount
  category_id?: string | null;
  brand?: string | null;
  is_preorder?: boolean | null;
};

export type CouponTotals = {
  subtotalOriginal: number;
  productDiscount: number;
  subtotalAfterProduct: number;
  eligibleSubtotal: number;
  couponDiscount: number;
  freeShipping: boolean;
  shipping: number;
  total: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const isEligibleLine = (line: CartLine, c: CouponSpec | null): boolean => {
  if (!c) return true;
  switch (c.coupon_type) {
    case "product":
      return c.applicable_product_ids.length === 0 || c.applicable_product_ids.includes(line.product_id);
    case "category":
      return c.applicable_category_ids.length === 0 || (!!line.category_id && c.applicable_category_ids.includes(line.category_id));
    case "brand":
      return c.applicable_brands.length === 0 || (!!line.brand && c.applicable_brands.map((b) => b.toLowerCase()).includes(line.brand.toLowerCase()));
    case "preorder":
      return !!line.is_preorder;
    default:
      return true;
  }
};

export function computeCartTotals(
  lines: CartLine[],
  coupon: CouponSpec | null,
  shipping: number,
): CouponTotals {
  let subtotalOriginal = 0;
  let subtotalAfterProduct = 0;
  let eligibleSubtotal = 0;

  for (const l of lines) {
    const qty = Math.max(0, Number(l.quantity) || 0);
    const unit = Math.max(0, Number(l.unit_price) || 0);
    const orig = Math.max(unit, Number(l.original_unit_price ?? unit) || 0);
    subtotalOriginal += orig * qty;
    const lineTotal = unit * qty;
    subtotalAfterProduct += lineTotal;
    if (isEligibleLine(l, coupon)) eligibleSubtotal += lineTotal;
  }

  const productDiscount = round2(Math.max(0, subtotalOriginal - subtotalAfterProduct));

  let couponDiscount = 0;
  let freeShipping = false;
  let effectiveShipping = shipping;

  if (coupon && eligibleSubtotal >= (coupon.min_order || 0)) {
    switch (coupon.coupon_type) {
      case "percentage":
      case "product":
      case "category":
      case "brand":
      case "preorder":
      case "first_order":
      case "min_order": {
        // treat as percentage when discount_value <=100 AND type != fixed; otherwise fixed rupees
        const isPercent =
          coupon.coupon_type === "percentage" ||
          coupon.discount_type === "percent" ||
          coupon.discount_type === "percentage";
        if (isPercent) {
          couponDiscount = (eligibleSubtotal * Number(coupon.discount_value || 0)) / 100;
          if (coupon.max_discount && coupon.max_discount > 0) {
            couponDiscount = Math.min(couponDiscount, coupon.max_discount);
          }
        } else {
          couponDiscount = Math.min(eligibleSubtotal, Number(coupon.discount_value || 0));
        }
        break;
      }
      case "fixed":
        couponDiscount = Math.min(eligibleSubtotal, Number(coupon.discount_value || 0));
        break;
      case "free_shipping":
        freeShipping = true;
        effectiveShipping = 0;
        break;
    }
  }

  couponDiscount = round2(Math.max(0, Math.min(couponDiscount, eligibleSubtotal)));
  const total = Math.max(0, round2(subtotalAfterProduct + effectiveShipping - couponDiscount));

  return {
    subtotalOriginal: round2(subtotalOriginal),
    productDiscount,
    subtotalAfterProduct: round2(subtotalAfterProduct),
    eligibleSubtotal: round2(eligibleSubtotal),
    couponDiscount,
    freeShipping,
    shipping: round2(effectiveShipping),
    total,
  };
}

export const COUPON_TYPE_LABEL: Record<CouponType, string> = {
  percentage: "Percentage off",
  fixed: "Flat ₹ off",
  free_shipping: "Free shipping",
  product: "Specific products",
  category: "Specific categories",
  brand: "Specific brands",
  min_order: "Minimum order",
  first_order: "First order only",
  preorder: "Preorder products",
};

export function parseCouponRpcResult(res: any): CouponSpec | null {
  if (!res || !res.ok) return null;
  const toArr = (v: any): any[] => (Array.isArray(v) ? v : v ? [] : []);
  return {
    id: res.id,
    code: res.code,
    coupon_type: (res.coupon_type as CouponType) ?? "percentage",
    discount_type: res.discount_type ?? "percent",
    discount_value: Number(res.discount_value ?? 0),
    max_discount: res.max_discount != null ? Number(res.max_discount) : null,
    min_order: Number(res.min_order ?? 0),
    applicable_product_ids: toArr(res.applicable_product_ids),
    applicable_category_ids: toArr(res.applicable_category_ids),
    applicable_brands: toArr(res.applicable_brands),
    preorder_only: !!res.preorder_only,
    first_order_only: !!res.first_order_only,
  };
}

export function couponErrorMessage(err: string | undefined, extra?: { min_order?: number }): string {
  switch (err) {
    case "empty_code": return "Enter a coupon code";
    case "invalid": return "Invalid coupon code";
    case "inactive": return "Coupon is inactive";
    case "expired": return "Coupon has expired";
    case "not_started": return "Coupon isn't active yet";
    case "usage_limit_reached": return "Coupon usage limit reached";
    case "per_user_limit_reached": return "You've already used this coupon";
    case "not_first_order": return "Coupon valid for first order only";
    case "min_order": return `Minimum order ₹${extra?.min_order ?? 0} required`;
    default: return "Invalid coupon";
  }
}
