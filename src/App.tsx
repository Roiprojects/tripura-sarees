import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/providers/AuthProvider";
import { CartProvider } from "@/providers/CartProvider";
import { WishlistProvider } from "@/providers/WishlistProvider";
import { ScrollToTop } from "./components/ScrollToTop";

// Eagerly load storefront pages so button/link taps don't flash a loading screen.
import Index from "./pages/Index.tsx";
import Shop from "./pages/Shop.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import Cart from "./pages/Cart.tsx";
import Wishlist from "./pages/Wishlist.tsx";
import Checkout from "./pages/Checkout.tsx";
import ExpressCheckout from "./pages/ExpressCheckout.tsx";
import Account from "./pages/Account.tsx";
import Auth from "./pages/Auth.tsx";
import Collection from "./pages/Collection.tsx";
import ReturnPolicy from "./pages/ReturnPolicy.tsx";
import About from "./pages/About.tsx";
import Contact from "./pages/Contact.tsx";
import Shipping from "./pages/Shipping.tsx";
import Finance from "./pages/Finance.tsx";
import PaymentOptions from "./pages/PaymentOptions.tsx";
import Press from "./pages/Press.tsx";
import Blog from "./pages/Blog.tsx";

// Lazy-load admin/rare pages for code-splitting.
const AdminLogin = lazy(() => import("./pages/AdminLogin.tsx"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts.tsx"));
const AdminProductForm = lazy(() => import("./pages/admin/AdminProductForm.tsx"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories.tsx"));
const AdminCategoriesTree = lazy(() => import("./pages/admin/AdminCategoriesTree.tsx"));
const AdminCategoriesEasy = lazy(() => import("./pages/admin/AdminCategoriesEasy.tsx"));
const AdminCategoryBanners = lazy(() => import("./pages/admin/AdminCategoryBanners.tsx"));
const AdminBanners = lazy(() => import("./pages/admin/AdminBanners.tsx"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons.tsx"));
const AdminSections = lazy(() => import("./pages/admin/AdminSections.tsx"));
const AdminReels = lazy(() => import("./pages/admin/AdminReels.tsx"));
const AdminHomepage = lazy(() => import("./pages/admin/AdminHomepage.tsx"));
const AdminHomepageImages = lazy(() => import("./pages/admin/AdminHomepageImages.tsx"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders.tsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.tsx"));
const AdminNavBar = lazy(() => import("./pages/admin/AdminNavBar.tsx"));
const AdminRefunds = lazy(() => import("./pages/admin/AdminRefunds.tsx"));
const AdminWalletConfirmation = lazy(() => import("./pages/admin/AdminWalletConfirmation.tsx"));
const AdminStaff = lazy(() => import("./pages/admin/AdminStaff.tsx"));
const AdminStaffActivity = lazy(() => import("./pages/admin/AdminStaffActivity.tsx"));
const AdminSubscribers = lazy(() => import("./pages/admin/AdminSubscribers.tsx"));
const AdminErpIntegration = lazy(() => import("./pages/admin/AdminErpIntegration.tsx"));
const AdminVideoConsultations = lazy(() => import("./pages/admin/AdminVideoConsultations.tsx"));
const AdminSizeGuides = lazy(() => import("./pages/admin/AdminSizeGuides.tsx"));
const AdminFilters = lazy(() => import("./pages/admin/AdminFilters.tsx"));
const AdminPaymentMethods = lazy(() => import("./pages/admin/AdminPaymentMethods.tsx"));
const AdminOccasions = lazy(() => import("./pages/admin/AdminOccasions.tsx"));

// Staff dashboard removed — staff now signs in to the main admin panel and
// sees only the modules permitted by the Super Admin via AdminLayout.
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

import { useRealtimeProductsSync } from "@/hooks/useSectionProducts";
import { useImageGroupRealtime } from "@/hooks/useImageGroup";

const queryClient = new QueryClient();

const RealtimeBridge = () => {
  useRealtimeProductsSync();
  useImageGroupRealtime();
  return null;
};

// Subtle top progress bar instead of a full-screen spinner so navigation
// feels instant — the previous page stays visible until the next chunk loads.
const PageFallback = () => (
  <div
    aria-hidden
    className="fixed top-0 left-0 right-0 z-[100] h-[2px] bg-primary/70 animate-pulse"
  />
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <RealtimeBridge />
              <ScrollToTop />
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/products" element={<Shop />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/wishlist" element={<Wishlist />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/checkout/express" element={<ExpressCheckout />} />
                  <Route path="/orders" element={<Account />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/sarees" element={<Shop />} />
                  {/* Dynamic category / occasion / collection pages */}
                  <Route path="/category/:slug" element={<Collection />} />
                  <Route path="/occasion/:slug" element={<Collection />} />
                  <Route path="/collection/:slug" element={<Collection />} />
                  <Route path="/shop-by-occasion" element={<Shop />} />
                  <Route path="/silk-sarees" element={<Navigate to="/category/silk-sarees" replace />} />
                  <Route path="/handloom-sarees" element={<Navigate to="/category/handloom-sarees" replace />} />
                  <Route path="/designer-sarees" element={<Navigate to="/category/designer-sarees" replace />} />
                  <Route path="/wedding-sarees" element={<Navigate to="/occasion/wedding" replace />} />
                  <Route path="/best-seller" element={<Navigate to="/shop?sort=popular" replace />} />
                  <Route path="/best-sellers" element={<Navigate to="/shop?sort=popular" replace />} />
                  <Route path="/return-policy" element={<ReturnPolicy />} />
                  <Route path="/returns" element={<ReturnPolicy />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/shipping" element={<Shipping />} />
                  <Route path="/finance" element={<Finance />} />
                  <Route path="/payment-options" element={<PaymentOptions />} />
                  <Route path="/press" element={<Press />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/featured" element={<Collection />} />
                  <Route path="/new" element={<Collection />} />
                  <Route path="/trending" element={<Collection />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="products/new" element={<AdminProductForm />} />
                    <Route path="products/:id" element={<AdminProductForm />} />
                    <Route path="categories" element={<AdminCategoriesEasy />} />
                    <Route path="categories/tree" element={<AdminCategoriesTree />} />
                    <Route path="categories/flat" element={<AdminCategories />} />
                    <Route path="category-banners" element={<AdminCategoryBanners />} />
                    <Route path="sections" element={<AdminSections />} />
                    <Route path="reels" element={<AdminReels />} />
                    <Route path="homepage" element={<AdminHomepage />} />
                    <Route path="homepage-images" element={<AdminHomepageImages />} />
                    <Route path="banners" element={<AdminBanners />} />
                    <Route path="coupons" element={<AdminCoupons />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="refunds" element={<AdminRefunds />} />
                    <Route path="wallet-confirmation" element={<AdminWalletConfirmation />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="nav-bar" element={<AdminNavBar />} />
                    <Route path="staff" element={<AdminStaff />} />
                    <Route path="staff/activity" element={<AdminStaffActivity />} />
                    <Route path="subscribers" element={<AdminSubscribers />} />
                    <Route path="erp-integration" element={<AdminErpIntegration />} />
                    <Route path="video-consultations" element={<AdminVideoConsultations />} />
                    <Route path="size-guides" element={<AdminSizeGuides />} />
                    <Route path="filters" element={<AdminFilters />} />
                    <Route path="payment-methods" element={<AdminPaymentMethods />} />
                    <Route path="occasions" element={<AdminOccasions />} />

                  </Route>
                  {/* Legacy staff routes — everything now lives inside /admin */}
                  <Route path="/staff/login" element={<Navigate to="/admin/login" replace />} />
                  <Route path="/staff" element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="/staff/*" element={<Navigate to="/admin/dashboard" replace />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
