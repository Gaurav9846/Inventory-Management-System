// src/components/layout/ManagerLayout.jsx
import { Outlet, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "@/context/AuthContext.jsx";
import ManagerSidebar from "./ManagerSidebar.jsx";
import NotificationBell from "@/components/shared/NotificationBell.jsx";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import { Button } from "@/components/ui/button.jsx";
import { LogOut, KeyRound, UserCircle, BellRing } from "lucide-react";
import { getInitials } from "@/utils/helpers.js";

const PAGE_TITLES = {
  "/manager": "Dashboard",
  "/manager/inventory": "Stock Overview",
  "/manager/products": "Products Catalog",
  "/manager/low-stock": "Low Stock Alerts",
  "/manager/orders": "Customer Orders",
  "/manager/purchase": "Purchase Orders",
  "/manager/deliveries": "Delivery Management",
  "/manager/staff": "Staff Activity",
  "/manager/schedule": "Work Schedule",
  "/manager/reports": "Analytics & Reports",
  "/manager/notifications": "Notifications",
  "/manager/stock-adjustments": "Stock Adjustment Requests",
  "/manager/credit": "Credit Accounts",
};

export default function ManagerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const path = window.location.pathname;
  const title = PAGE_TITLES[path] ?? "Manager Panel";

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <ManagerSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-6 rounded-full bg-emerald-500 inline-block" />
            <h1 className="text-sm font-semibold text-slate-800">{title}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <NotificationBell />
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 gap-2 px-2 hover:bg-gray-100">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                    {getInitials(user?.name)}
                  </div>
                  <span className="text-sm text-slate-700 font-medium hidden sm:block">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-medium text-sm">{user?.name}</p>
                  <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
                  <p className="text-xs text-emerald-600 font-medium mt-1">Manager</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/manager/notifications")}>
                  <BellRing className="mr-2 h-4 w-4" />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/change-password")}>
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