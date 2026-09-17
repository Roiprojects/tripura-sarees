import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "@/providers/cart-context";
import { clearBuyNowCartLine, readBuyNowItem } from "@/lib/buyNowCart";

export const BackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items } = useCart();

  const hiddenPaths = ["/"];
  if (
    hiddenPaths.includes(location.pathname) ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/staff")
  ) {
    return null;
  }

  const handleBack = () => {
    // From Checkout, prefer /cart if there is a cart to show
    if (location.pathname === "/checkout" && (readBuyNowItem() || items.length > 0)) {
      navigate("/cart");
      return;
    }

    // Leaving Cart clears the Buy Now marker
    if (location.pathname === "/cart") clearBuyNowCartLine();

    // Prefer real browser back so scroll restoration works; fall back to home
    // only when we're on the first history entry.
    const hasHistory =
      typeof window !== "undefined" && window.history.length > 1 &&
      location.key && location.key !== "default";

    if (hasHistory) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="container pt-2">
      <button
        onClick={handleBack}
        aria-label="Go back"
        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 pl-2 pr-3 h-7 text-xs font-medium text-foreground/80 shadow-sm backdrop-blur hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>
    </div>
  );

};
