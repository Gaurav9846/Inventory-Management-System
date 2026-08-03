// src/App.jsx  — complete role-separated routing with proper path structure
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";

// ─── Layouts ───────────────────────────────────────────────────────────────
import Layout        from "@/components/layout/Layout.jsx";         // Admin  (dark blue)
import ManagerLayout from "@/components/layout/ManagerLayout.jsx";  // Manager (dark green)
import StaffLayout   from "@/components/layout/StaffLayout.jsx";    // Staff   (dark violet)

// ─── Public ────────────────────────────────────────────────────────────────
import Login          from "@/pages/Login.jsx";
import NotFound       from "@/pages/NotFound.jsx";
import ChangePassword from "@/pages/ChangePassword.jsx";

// ─── Admin wrapper pages (re-exporting Manager/Staff components) ─────────
import AdminAddSupplier from "@/pages/admin/AdminAddSupplier.jsx";
import AdminCreateOrder from "@/pages/admin/AdminCreateOrder.jsx";
import AdminCreatePurchaseOrder from "@/pages/admin/AdminCreatePurchaseOrder.jsx";
import AdminCreditAccounts from "@/pages/admin/AdminCreditAccounts.jsx";
import AdminCustomers from "@/pages/admin/AdminCustomers.jsx";
import AdminDashboard from "@/pages/admin/AdminDashboard.jsx";
import AdminDeliveries from "@/pages/admin/AdminDeliveries.jsx";
import AdminNotifications from "@/pages/admin/AdminNotifications.jsx";
import AdminOrders from "@/pages/admin/AdminOrders.jsx";
import AdminProducts from "@/pages/admin/AdminProducts.jsx";
import AdminProfileRequests from "@/pages/admin/AdminProfileRequests.jsx";
import AdminPurchaseOrderDetail from "@/pages/admin/AdminPurchaseOrderDetail.jsx";
import AdminPurchaseOrders from "@/pages/admin/AdminPurchaseOrders.jsx";
import AdminReports from "@/pages/admin/AdminReports.jsx";
import AdminStockAdjustments from "@/pages/admin/AdminStockAdjustments.jsx";
import AdminStockOverview from "@/pages/admin/AdminStockOverview.jsx";
import AdminSupplierDetail from "@/pages/admin/AdminSupplierDetail.jsx";
import AdminSuppliers from "@/pages/admin/AdminSuppliers.jsx";
import AdminUsers from "@/pages/admin/AdminUsers.jsx";
import AdminProductCatalog from "@/pages/admin/AdminProductCatalog.jsx";
import AdminAuditlogs from "@/pages/admin/AdminAuditlogs.jsx";

// ─── Manager pages ─────────────────────────────────────────────────────────
import ManagerDashboard    from "@/pages/manager/ManagerDashboard.jsx";
import ManagerCreateOrder from "@/pages/manager/ManagerCreateOrder.jsx";
import ManagerCustomers from "@/pages/manager/ManagerCustomers.jsx";
import ManagerStockOverview from "@/pages/manager/ManagerStockOverview.jsx";
import ManagerProducts     from "@/pages/manager/ManagerProducts.jsx";
import ManagerOrders       from "@/pages/manager/ManagerOrders.jsx";
import ManagerCreditAccounts from "@/pages/manager/ManagerCreditAccounts.jsx";
import ManagerDeliveries from "@/pages/manager/ManagerDeliveries.jsx";
import ManagerReports      from "@/pages/manager/ManagerReports.jsx";
import ManagerStockAdjustments from "@/pages/manager/ManagerStockAdjustments.jsx";
import ManagerNotifications from "@/pages/manager/ManagerNotifications.jsx";
import ManagerSuppliers from "@/pages/manager/ManagerSuppliers.jsx";
import SupplierDetail from "@/pages/manager/SupplierDetail.jsx";
import AddSupplier from "@/pages/manager/AddSupplier.jsx";
import ManagerPurchaseOrders from "@/pages/manager/ManagerPurchaseOrders.jsx";
import CreatePurchaseOrder from "@/pages/manager/CreatePurchaseOrder.jsx";
import PurchaseOrderDetail from "@/pages/manager/PurchaseOrderDetail.jsx";

// ─── Staff pages ───────────────────────────────────────────────────────────
import StaffDashboard  from "@/pages/staff/StaffDashboard.jsx";
import StaffOrders     from "@/pages/staff/StaffOrders.jsx";
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
    // ✅ FIXED: Redirect to role-specific dashboard with /dashboard path
    if (user.role === "MANAGER") return <Navigate to="/manager/dashboard" replace />;
    if (user.role === "STAFF")   return <Navigate to="/staff/dashboard" replace />;
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}

/* ─── Route guard: protect and redirect to correct panel ─────────────────── */
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user)   return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // ✅ FIXED: Redirect to role-specific dashboard with /dashboard path
    if (user.role === "MANAGER") return <Navigate to="/manager/dashboard" replace />;
    if (user.role === "STAFF")   return <Navigate to="/staff/dashboard" replace />;
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}

/* ─── ✅ NEW: Root redirect to role-specific dashboard ───────────────────── */
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  // ✅ Redirect to role-specific dashboard with /dashboard path
  if (user.role === "MANAGER") return <Navigate to="/manager/dashboard" replace />;
  if (user.role === "STAFF")   return <Navigate to="/staff/dashboard" replace />;
  return <Navigate to="/admin/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* ─── ✅ NEW: ROOT REDIRECT ────────────────────────────────────── */}
          <Route path="/" element={<RootRedirect />} />

          {/* ─── Public routes ──────────────────────────────────────────── */}
          <Route path="/login" element={
            <PublicRoute><Login /></PublicRoute>
          } />

          {/* ─── ADMIN panel (dark blue sidebar) ────────────────────────── */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <Layout />
            </ProtectedRoute>
          }>
            {/* ✅ CHANGED: /admin/dashboard instead of /admin */}
            <Route path="dashboard" element={<AdminDashboard />} />
            
            {/* Orders */}
            <Route path="orders" element={<AdminOrders />} />
            <Route path="create-order" element={<AdminCreateOrder />} />
            
            {/* Customers */}
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="credit" element={<AdminCreditAccounts />} />
            
            {/* Deliveries */}
            <Route path="delivery" element={<AdminDeliveries />} />
            
            {/* Inventory */}
            <Route path="stock-overview" element={<AdminStockOverview />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="stock-adjustments" element={<AdminStockAdjustments />} />
            <Route path="catalog" element={<AdminProductCatalog />} />
            
            {/* Suppliers */}
            <Route path="suppliers" element={<AdminSuppliers />} />
            <Route path="suppliers/new" element={<AdminAddSupplier />} />
            <Route path="suppliers/:id" element={<AdminSupplierDetail />} />
            <Route path="suppliers/:id/edit" element={<AdminAddSupplier />} />
            
            {/* Purchase Orders */}
            <Route path="purchase-orders" element={<AdminPurchaseOrders />} />
            <Route path="purchase-orders/new" element={<AdminCreatePurchaseOrder />} />
            <Route path="purchase-orders/:id" element={<AdminPurchaseOrderDetail />} />
            
            {/* Reports */}
            <Route path="reports" element={<AdminReports />} />
            
            {/* Notifications */}
            <Route path="notifications" element={<AdminNotifications />} />
            
            {/* Profile Requests */}
            <Route path="profile-requests" element={<AdminProfileRequests />} />
            
            {/* Administration */}
            <Route path="users" element={<AdminUsers />} />
            <Route path="audit-logs" element={<AdminAuditlogs />} />
            
            {/* Password Change */}
            <Route path="change-password" element={<ChangePassword />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* ─── MANAGER panel ───────────────────────────────────────────── */}
          <Route path="/manager" element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <ManagerLayout />
            </ProtectedRoute>
          }>
            {/* ✅ CHANGED: /manager/dashboard instead of index */}
            <Route path="dashboard" element={<ManagerDashboard />} />
            
            <Route path="inventory" element={<ManagerStockOverview />} />
            <Route path="products" element={<ManagerProducts />} />
            <Route path="orders" element={<ManagerOrders />} />
            <Route path="create-order" element={<ManagerCreateOrder />} />
            <Route path="customers" element={<ManagerCustomers />} />
            <Route path="credit" element={<ManagerCreditAccounts />} />
            <Route path="suppliers" element={<ManagerSuppliers />} />
            <Route path="suppliers/new" element={<AddSupplier />} />
            <Route path="suppliers/:id" element={<SupplierDetail />} />
            <Route path="suppliers/:id/edit" element={<AddSupplier />} />
            <Route path="purchase-orders" element={<ManagerPurchaseOrders />} />
            <Route path="purchase-orders/new" element={<CreatePurchaseOrder />} />
            <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
            <Route path="delivery" element={<ManagerDeliveries />} />
            <Route path="reports" element={<ManagerReports />} />
            <Route path="stock-adjustments" element={<ManagerStockAdjustments />} />
            <Route path="notifications" element={<ManagerNotifications />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* ─── STAFF panel ─────────────────────────────────────────────── */}
          <Route path="/staff" element={
            <ProtectedRoute allowedRoles={["STAFF"]}>
              <StaffLayout />
            </ProtectedRoute>
          }>
            {/* ✅ CHANGED: /staff/dashboard instead of index */}
            <Route path="dashboard" element={<StaffDashboard />} />
            
            <Route path="orders" element={<StaffOrders />} />
            <Route path="create-order" element={<CreateOrder />} />
            <Route path="delivery" element={<StaffDelivery />} />
            <Route path="customers" element={<StaffCustomers />} />
            <Route path="credit-accounts" element={<StaffCreditAccounts />} />
            <Route path="reports" element={<StaffReports />} />
            <Route path="stock-adjustment" element={<StaffStockAdjustment />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* ─── Catch-all ────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}