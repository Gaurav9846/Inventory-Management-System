// src/App.jsx  — complete role-separated routing
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext.jsx";
import { useAuth } from "@/context/AuthContext.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";

// ─── Layouts ───────────────────────────────────────────────────────────────
import Layout        from "@/components/layout/Layout.jsx";         // Admin  (dark blue)
import ManagerLayout from "@/components/layout/ManagerLayout.jsx";  // Manager (dark green)
import StaffLayout   from "@/components/layout/StaffLayout.jsx";    // Staff   (dark violet)

// ─── Public ────────────────────────────────────────────────────────────────
import Login          from "@/pages/Login.jsx";
import SupplierPortal from "@/pages/SupplierPortal.jsx";
import NotFound       from "@/pages/NotFound.jsx";
import ChangePassword from "@/pages/ChangePassword.jsx";

// ─── Admin pages ───────────────────────────────────────────────────────────
import Dashboard      from "@/pages/Dashboard.jsx";
import Analytics      from "@/pages/Analytics.jsx";

import Products       from "@/pages/Products.jsx";
import Categories     from "@/pages/Categories.jsx";
import Stock          from "@/pages/Stock.jsx";
import Suppliers      from "@/pages/Suppliers.jsx";
// import SupplierDetail from "@/pages/SupplierDetail.jsx";    
import PurchaseOrders from "@/pages/PurchaseOrders.jsx";
import Customers      from "@/pages/Customers.jsx";
import SalesOrders    from "@/pages/SalesOrders.jsx";
import Deliveries     from "@/pages/Deliveries.jsx";
import Users          from "@/pages/Users.jsx";

// ─── Manager pages ─────────────────────────────────────────────────────────
import ManagerDashboard    from "@/pages/manager/ManagerDashboard.jsx";
import ManagerCreateOrder from "@/pages/manager/ManagerCreateOrder.jsx";
import ManagerCustomers from "@/pages/manager/ManagerCustomers.jsx";
import ManagerStockOverview from "@/pages/manager/ManagerStockOverview.jsx";
import ManagerProducts     from "@/pages/manager/ManagerProducts.jsx";
import ManagerLowStock     from "@/pages/manager/ManagerLowStock.jsx";
import ManagerOrders       from "@/pages/manager/ManagerOrders.jsx";
import ManagerCreditAccounts from "@/pages/manager/ManagerCreditAccounts.jsx";
import ManagerDeliveries from "@/pages/manager/ManagerDeliveries.jsx";
import ManagerStaffActivity from "@/pages/manager/ManagerStaffActivity.jsx";
import ManagerSchedule     from "@/pages/manager/ManagerSchedule.jsx";
import ManagerReports      from "@/pages/manager/ManagerReports.jsx";
import ManagerStockAdjustments from "@/pages/manager/ManagerStockAdjustments.jsx";
import ManagerNotifications from "@/pages/manager/ManagerNotifications.jsx";
import ManagerStaffPerformance from "@/pages/manager/ManagerStaffPerformance.jsx";

import ManagerSuppliers from "@/pages/manager/ManagerSuppliers.jsx";
import SupplierDetail from "@/pages/manager/SupplierDetail.jsx";
import AddSupplier from "@/pages/manager/AddSupplier.jsx";
import ManagerPurchaseOrders from "@/pages/manager/ManagerPurchaseOrders.jsx";
import CreatePurchaseOrder from "@/pages/manager/CreatePurchaseOrder.jsx";
import PurchaseOrderDetail from "@/pages/manager/PurchaseOrderDetail.jsx";

// ─── Staff pages ───────────────────────────────────────────────────────────
import StaffDashboard  from "@/pages/staff/StaffDashboard.jsx";
import StaffOrders     from "@/pages/staff/StaffOrders.jsx";
import StaffInventory  from "@/pages/staff/StaffInventory.jsx";
import StaffDelivery   from "@/pages/staff/StaffDelivery.jsx";
import StaffCustomers  from "@/pages/staff/StaffCustomers.jsx";
import StaffReports    from "@/pages/staff/StaffReports.jsx";
import CreateOrder from "@/pages/staff/CreateOrder.jsx";
import StaffCreditAccounts from "@/pages/staff/StaffCreditAccounts.jsx";
import StaffStockAdjustment from "@/pages/staff/StaffStockAdjustment.jsx";

/* ─── Route guard: redirect to role home if already logged in ─────────────── */
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (user) {
    if (user.role === "MANAGER") return <Navigate to="/manager" replace />;
    if (user.role === "STAFF")   return <Navigate to="/staff"   replace />;
    return <Navigate to="/" replace />;
  }
  return children;
}

/* ─── Route guard: protect and redirect to correct panel ─────────────────── */
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user)   return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Wrong panel — redirect to their correct home
    if (user.role === "MANAGER") return <Navigate to="/manager" replace />;
    if (user.role === "STAFF")   return <Navigate to="/staff"   replace />;
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* ─── Public routes ──────────────────────────────────────────── */}
          <Route path="/login" element={
            <PublicRoute><Login /></PublicRoute>
          } />
          <Route path="/supplier-portal" element={<SupplierPortal />} />

          {/* ─── ADMIN panel (dark blue sidebar) ────────────────────────── */}
          <Route path="/" element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index                element={<Dashboard />} />
            <Route path="analytics"     element={<Analytics />} />
            <Route path="products"      element={<Products />} />
            <Route path="categories"    element={<Categories />} />
            <Route path="stock"         element={<Stock />} />
            <Route path="suppliers"     element={<Suppliers />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="customers"     element={<Customers />} />
            <Route path="sales-orders"  element={<SalesOrders />} />
            <Route path="deliveries"    element={<Deliveries />} />
            <Route path="users"         element={<Users />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="*"             element={<NotFound />} />
            <Route path="suppliers/:id" element={<SupplierDetail />} /> 
          </Route>

          {/* ─── MANAGER panel (dark green sidebar) ─────────────────────── */}
          <Route path="/manager" element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <ManagerLayout />
            </ProtectedRoute>
          }>
            <Route index                element={<ManagerDashboard />} />
            <Route path="inventory"     element={<ManagerStockOverview  />} />
            <Route path="products"      element={<ManagerProducts />} />
            <Route path="low-stock"     element={<ManagerLowStock />} />
            <Route path="orders"        element={<ManagerOrders />} />
            <Route path="create-order"  element={<ManagerCreateOrder />} />
            <Route path="customers"     element={<ManagerCustomers />} />
            <Route path="credit"        element={<ManagerCreditAccounts />} />
<Route path="suppliers" element={<ManagerSuppliers />} />
<Route path="suppliers/new" element={<AddSupplier />} />
<Route path="suppliers/:id" element={<SupplierDetail />} />
<Route path="suppliers/:id/edit" element={<AddSupplier />} />
<Route path="purchase-orders" element={<ManagerPurchaseOrders />} />
<Route path="purchase-orders/new" element={<CreatePurchaseOrder />} />
<Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
            <Route path="deliveries"    element={<ManagerDeliveries />} />
            <Route path="staff"         element={<ManagerStaffActivity />} />
            <Route path="schedule"      element={<ManagerSchedule />} />
            <Route path="reports"       element={<ManagerReports />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="*"             element={<NotFound />} />
            <Route path="stock-adjustments" element={<ManagerStockAdjustments />} />
            <Route path="notifications" element={<ManagerNotifications />} />
            <Route path="staff-performance" element={<ManagerStaffPerformance />} />
          </Route>

          {/* ─── STAFF panel (dark violet sidebar) ──────────────────────── */}
<Route path="/staff" element={<ProtectedRoute allowedRoles={["STAFF"]}><StaffLayout /></ProtectedRoute>}>
  <Route index element={<StaffDashboard />} />
  <Route path="orders" element={<StaffOrders />} />
  <Route path="create-order" element={<CreateOrder />} />  {/* Add this */}
  <Route path="inventory" element={<StaffInventory />} />
  <Route path="delivery" element={<StaffDelivery />} />
  <Route path="customers" element={<StaffCustomers />} />
  <Route path="credit-accounts" element={<StaffCreditAccounts />} />  {/* Add this */}
  <Route path="reports" element={<StaffReports />} />
  <Route path="change-password" element={<ChangePassword />} />
  <Route path="*" element={<NotFound />} />
  <Route path="stock-adjustment" element={<StaffStockAdjustment />} />
</Route>

          {/* ─── Catch-all fallback ──────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
