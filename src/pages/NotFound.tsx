import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <div className="container flex flex-col items-center justify-center py-24 text-center">
        <h1 className="mb-4 font-display text-6xl font-bold">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">
          Oops! The page you're looking for doesn't exist.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild variant="pill" size="lg">
            <Link to="/">Return home</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/shop">Browse shop</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
