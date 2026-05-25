import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { Button } from "@/components/ui/button.jsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.jsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.jsx";
import { LogOut, User, KeyRound } from "lucide-react";
import { getInitials } from "@/utils/helpers.js";

const PAGE_TITLES = {
  "/":               "Dashboard",
  "/analytics":      "Analytics",
  "/alerts":         "Alerts",
  "/products":       "Products",
  "/categories":     "Categories",
  "/stock":          "Stock Management",
  "/suppliers":      "Suppliers",
  "/purchase-orders":"Purchase Orders",
  "/customers":      "Customers",
  "/sales-orders":   "Sales Orders",
  "/deliveries":     "Deliveries",
  "/users":          "User Management",
};

export default function Header() {
  const { user, logout } = useAuth();
  const { pathname }     = useLocation();
  const navigate         = useNavigate();

  const title = PAGE_TITLES[pathname] ?? "Fusion IMS";

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-card border-b border-border shrink-0">
      <h1 className="text-base font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground font-medium">{user?.role}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/change-password")}>
              <KeyRound className="mr-2 h-4 w-4" />
              Change Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
