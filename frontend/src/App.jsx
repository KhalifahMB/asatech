import { HashRouter, Routes, Route } from "react-router-dom";

// Layouts
import StorefrontLayout from "./layouts/StorefrontLayout";
import AuthLayout from "./layouts/AuthLayout";
import CustomerLayout from "./layouts/CustomerLayout";
import AdminLayout from "./layouts/AdminLayout";

// Guards + utilities
import { RequireAuth, RequireAdmin } from "./components/guards";
import { ErrorBoundary } from "./components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";

// Storefront
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";

// Auth
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// Customer account
import AccountOverview from "./pages/account/Overview";
import AccountProfile from "./pages/account/Profile";
import AccountOrders from "./pages/account/Orders";
import AccountOrderDetails from "./pages/account/OrderDetails";
import AccountTransactions from "./pages/account/Transactions";
import Wishlist from "./pages/account/Wishlist";
import PaymentMethods from "./pages/account/PaymentMethods";
import Notifications from "./pages/account/Notifications";
import Security from "./pages/account/Security";

// Admin
import AdminOverview from "./pages/admin/Overview";
import AdminProducts from "./pages/admin/Products";
import ProductForm from "./pages/admin/ProductForm";
import Inventory from "./pages/admin/Inventory";
import AdminOrders from "./pages/admin/Orders";
import AdminOrderDetails from "./pages/admin/OrderDetails";
import Customers from "./pages/admin/Customers";
import AdminTransactions from "./pages/admin/Transactions";
import FraudAlerts from "./pages/admin/FraudAlerts";
import FraudInvestigation from "./pages/admin/FraudInvestigation";
import AuditLogs from "./pages/admin/AuditLogs";
import AdminSettings from "./pages/admin/Settings";

import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ScrollToTop />
        <Routes>
          {/* Public storefront */}
          <Route element={<StorefrontLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Catalog />} />
            <Route path="/products/:slug" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          </Route>

          {/* Authentication */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>

          {/* Customer account */}
          <Route
            element={
              <RequireAuth>
                <CustomerLayout />
              </RequireAuth>
            }
          >
            <Route path="/account" element={<AccountOverview />} />
            <Route path="/account/profile" element={<AccountProfile />} />
            <Route path="/account/orders" element={<AccountOrders />} />
            <Route path="/account/orders/:ref" element={<AccountOrderDetails />} />
            <Route path="/account/transactions" element={<AccountTransactions />} />
            <Route path="/account/wishlist" element={<Wishlist />} />
            <Route path="/account/payment-methods" element={<PaymentMethods />} />
            <Route path="/account/notifications" element={<Notifications />} />
            <Route path="/account/security" element={<Security />} />
          </Route>

          {/* Admin console */}
          <Route
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/products/new" element={<ProductForm />} />
            <Route path="/admin/products/:id/edit" element={<ProductForm />} />
            <Route path="/admin/inventory" element={<Inventory />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/orders/:ref" element={<AdminOrderDetails />} />
            <Route path="/admin/customers" element={<Customers />} />
            <Route path="/admin/transactions" element={<AdminTransactions />} />
            <Route path="/admin/fraud-alerts" element={<FraudAlerts />} />
            <Route path="/admin/fraud-alerts/:id" element={<FraudInvestigation />} />
            <Route path="/admin/audit-logs" element={<AuditLogs />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}
