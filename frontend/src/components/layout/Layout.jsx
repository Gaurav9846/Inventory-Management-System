// src/components/layout/AdminLayout.jsx
import { Outlet, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "@/context/AuthContext.jsx";
import AdminSidebar from "./Sidebar.jsx";
import NotificationBell from "@/components/shared/NotificationBell.jsx";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import { Button } from "@/components/ui/button.jsx";
import { LogOut, KeyRound, BellRing, Shield } from "lucide-react";
import { getInitials } from "@/utils/helpers.js";

const PAGE_TITLES = {
  "/admin/dashboard": "Dashboard",
  "/admin/orders": "Orders",
  "/admin/create-order": "Create Order",
  "/admin/customers": "Customers",
  "/admin/credit": "Credit Accounts",
  "/admin/delivery": "Delivery Management",
  "/admin/catalog": "Product Catalog",
  "/admin/stock-overview": "Stock Overview",
  "/admin/products": "Stock Production",
  "/admin/stock-adjustments": "Stock Adjustments",
  "/admin/suppliers": "Suppliers",
  "/admin/purchase-orders": "Purchase Orders",
  "/admin/reports": "Reports & Analytics",
  "/admin/staff-performance": "Staff Performance",
  "/admin/audit-logs": "Audit Logs",
  "/admin/notifications": "Notifications",
  "/admin/profile-requests": "Profile Requests",
  "/admin/users": "User Management",
  "/admin/change-password": "Change Password",
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const path = window.location.pathname;
  const title = PAGE_TITLES[path] ?? "Admin Panel";

  const handleLogout = () => { 
    logout(); 
    navigate("/login"); 
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-6 rounded-full bg-blue-600 inline-block" />
            <h1 className="text-sm font-semibold text-slate-800">{title}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <NotificationBell />
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 gap-2 px-2 hover:bg-gray-100">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {getInitials(user?.name)}
                  </div>
                  <span className="text-sm text-slate-700 font-medium hidden sm:block">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-medium text-sm">{user?.name}</p>
                  <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Shield className="h-3 w-3 text-blue-600" />
                    <p className="text-xs text-blue-600 font-medium">Administrator</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/admin/notifications")}>
                  <BellRing className="mr-2 h-4 w-4" />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/change-password")}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}