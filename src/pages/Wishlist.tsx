import { Link } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { useWishlist } from "@/providers/WishlistProvider";
import { useAuth } from "@/providers/AuthProvider";

const Wishlist = () => {
  const { items } = useWishlist();
  const { user } = useAuth();

  if (!user) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <Heart className="w-16 h-16 text-primary/50 mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold">Sign in to view wishlist</h1>
          <p className="text-muted-foreground mt-2">Save your favorites for later.</p>
          <Button asChild variant="pill" size="lg" className="mt-6">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-8">Your Wishlist</h1>
        {items.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No favourites yet — tap the heart on any saree you love.</p>
            <Button asChild variant="pill" className="mt-4">
              <Link to="/shop">Browse shop</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {items.map((i) => (
              <ProductCard key={i.id} product={i.product} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Wishlist;
