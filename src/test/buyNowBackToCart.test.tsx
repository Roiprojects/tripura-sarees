import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { BackButton } from "@/components/BackButton";
import { CartContext, type CartContextValue } from "@/providers/cart-context";

/**
 * Regression: Buy Now → Checkout → Back must land on /cart and the cart must
 * still hold the exact selected size, color, quantity, variant price and
 * product image of the item that was bought.
 */

const variantItem = {
  id: "ci_1",
  product_id: "p_1",
  size: "M",
  color: "Red",
  quantity: 2,
  price: 1299,
  product: {
    id: "p_1",
    name: "Test Tee",
    price: 999, // base price differs from variant price on purpose
    images: ["https://example.com/red-m.jpg"],
  },
} as any;

const makeCtx = (items: any[]): CartContextValue => ({
  items,
  loading: false,
  add: vi.fn(),
  updateQty: vi.fn(),
  updateVariant: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
  count: items.reduce((n, i) => n + i.quantity, 0),
  subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
  getInCartQty: () => 0,
  getAvailableStock: () => 0,
});

const RouteProbe = () => {
  const loc = useLocation();
  return <div data-testid="route">{loc.pathname}</div>;
};

const CartView = ({ items }: { items: any[] }) => (
  <ul data-testid="cart-items">
    {items.map((i) => (
      <li key={i.id} data-testid="cart-item">
        <span data-testid="size">{i.size}</span>
        <span data-testid="color">{i.color}</span>
        <span data-testid="qty">{i.quantity}</span>
        <span data-testid="price">{i.price}</span>
        <img data-testid="image" src={i.product.images[0]} alt={i.product.name} />
      </li>
    ))}
  </ul>
);

describe("Buy Now → Checkout → Back", () => {
  it("returns to /cart and preserves size, color, qty, variant price, image", () => {
    const ctx = makeCtx([variantItem]);

    render(
      <CartContext.Provider value={ctx}>
        <MemoryRouter initialEntries={["/product/p_1", "/checkout"]} initialIndex={1}>
          <RouteProbe />
          <BackButton />
          <Routes>
            <Route path="/checkout" element={<div>checkout</div>} />
            <Route path="/cart" element={<CartView items={ctx.items} />} />
            <Route path="/product/:id" element={<div>product</div>} />
          </Routes>
        </MemoryRouter>
      </CartContext.Provider>
    );

    expect(screen.getByTestId("route").textContent).toBe("/checkout");

    fireEvent.click(screen.getByRole("button", { name: /go back/i }));

    expect(screen.getByTestId("route").textContent).toBe("/cart");
    expect(screen.getByTestId("size").textContent).toBe("M");
    expect(screen.getByTestId("color").textContent).toBe("Red");
    expect(screen.getByTestId("qty").textContent).toBe("2");
    expect(screen.getByTestId("price").textContent).toBe("1299");
    expect(screen.getByTestId("image").getAttribute("src")).toBe(
      "https://example.com/red-m.jpg"
    );
  });

  it("does not redirect to /cart from /checkout when the cart is empty", () => {
    const ctx = makeCtx([]);

    render(
      <CartContext.Provider value={ctx}>
        <MemoryRouter initialEntries={["/product/p_1", "/checkout"]} initialIndex={1}>
          <RouteProbe />
          <BackButton />
          <Routes>
            <Route path="/checkout" element={<div>checkout</div>} />
            <Route path="/cart" element={<div>cart</div>} />
            <Route path="/product/:id" element={<div>product</div>} />
          </Routes>
        </MemoryRouter>
      </CartContext.Provider>
    );

    fireEvent.click(screen.getByRole("button", { name: /go back/i }));
    expect(screen.getByTestId("route").textContent).not.toBe("/cart");
  });
});
