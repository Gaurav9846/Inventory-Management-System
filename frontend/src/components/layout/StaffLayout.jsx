// src/components/layout/StaffLayout.jsx
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "@/context/AuthContext.jsx";
import StaffSidebar from "./StaffSidebar.jsx";
import ProfileSidebar from "./ProfileSidebar.jsx";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu.jsx";
import { Button } from "@/components/ui/button.jsx";
import { LogOut, KeyRound, UserCircle } from "lucide-react";
import { getInitials } from "@/utils/helpers.js";

const PAGE_TITLES = {
  "/staff": "Dashboard",
  "/staff/orders": "Orders",
  "/staff/create-order": "Create Order",
  "/staff/inventory": "Stock Entry",
  "/staff/delivery": "Delivery",
  "/staff/customers": "Customers",
  "/staff/credit-accounts": "Credit Accounts",
  "/staff/reports": "My Sales",
};

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const path = window.location.pathname;
  const title = PAGE_TITLES[path] ?? "Staff Panel";
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => { 
    logout(); 
    navigate("/login"); 
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <StaffSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-6 rounded-full bg-blue-500 inline-block" />
            <h1 className="text-sm font-semibold text-slate-800">{title}</h1>
          </div>
          
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
                <p className="text-xs text-blue-600 font-medium mt-1">Staff</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                <UserCircle className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/staff/change-password")}>
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
        </header>
        
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
      
      <ProfileSidebar isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <Toaster richColors position="top-right" />
    </div>
  );
}