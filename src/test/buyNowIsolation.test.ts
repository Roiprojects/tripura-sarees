import { beforeEach, describe, expect, it } from "vitest";
import { clearBuyNowItem, getCheckoutItems, readBuyNowItem, replaceBuyNowItem, type BuyNowCartItem } from "@/lib/buyNowCart";

const productA = {
  id: "p_a",
  name: "Product A",
  description: "",
  price: 799,
  category_id: "cat",
  sizes: ["S"],
  colors: ["Blue"],
  images: ["https://example.com/a.jpg"],
  stock: 5,
  rating: 0,
  created_at: "2026-01-01T00:00:00.000Z",
};

const productB = {
  ...productA,
  id: "p_b",
  name: "Product B",
  price: 1299,
  sizes: ["M"],
  colors: ["Red"],
  images: ["https://example.com/b.jpg"],
};

const buyNowA: BuyNowCartItem = {
  id: "buynow-a",
  product_id: "p_a",
  quantity: 1,
  size: "S",
  color: "Blue",
  product: productA,
};

const buyNowB: BuyNowCartItem = {
  id: "buynow-b",
  product_id: "p_b",
  quantity: 3,
  size: "M",
  color: "Red",
  product: productB,
};

describe("Buy Now cart isolation", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("replaces the previous temporary Buy Now item with the latest product", () => {
    localStorage.setItem("store_cart", JSON.stringify([{ product_id: "normal-cart-product", quantity: 2 }]));

    replaceBuyNowItem(buyNowA);
    replaceBuyNowItem(buyNowB);

    const latest = readBuyNowItem();
    expect(latest?.product_id).toBe("p_b");
    expect(latest?.size).toBe("M");
    expect(latest?.color).toBe("Red");
    expect(latest?.quantity).toBe(3);
    expect(latest?.product.price).toBe(1299);
    expect(latest?.product.images[0]).toBe("https://example.com/b.jpg");
    expect(localStorage.getItem("store_cart")).toBe(JSON.stringify([{ product_id: "normal-cart-product", quantity: 2 }]));
  });

  it("feeds Checkout only the current Buy Now item, never old or normal cart items", () => {
    replaceBuyNowItem(buyNowA);
    replaceBuyNowItem(buyNowB);

    const normalCartItems = [buyNowA];
    const checkoutItems = getCheckoutItems(normalCartItems, readBuyNowItem());

    expect(checkoutItems).toHaveLength(1);
    expect(checkoutItems[0].product_id).toBe("p_b");
    expect(checkoutItems[0].product_id).not.toBe("p_a");

    clearBuyNowItem();
  });
});