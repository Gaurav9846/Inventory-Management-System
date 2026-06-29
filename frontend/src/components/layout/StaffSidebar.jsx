// src/components/layout/StaffSidebar.jsx
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { cn } from "@/lib/utils.js";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  PlusCircle, 
  Users, 
  CreditCard, 
  Truck, 
  Droplets,
  PackageX,  // Added for Stock Adjustment
  TrendingDown  // Alternative icon
} from "lucide-react";

const SECTIONS = [
  { label: "MAIN", items: [{ to: "/staff", label: "Dashboard", icon: LayoutDashboard }] },
  { 
    label: "ORDER MANAGEMENT", 
    items: [
      { to: "/staff/orders", label: "Orders", icon: ShoppingCart }, 
      { to: "/staff/create-order", label: "Create Order", icon: PlusCircle }
    ] 
  },
  { 
    label: "CUSTOMER MANAGEMENT", 
    items: [
      { to: "/staff/customers", label: "Customers", icon: Users }, 
      { to: "/staff/credit-accounts", label: "Credit Accounts", icon: CreditCard }
    ] 
  },
  { 
    label: "DELIVERY", 
    items: [{ to: "/staff/delivery", label: "Delivery", icon: Truck }] 
  },
  { 
    label: "INVENTORY", 
    items: [{ to: "/staff/stock-adjustment", label: "Stock Adjustment", icon: PackageX }] 
  },
];

const NavItem = ({ to, label, icon: Icon }) => (
  <NavLink 
    to={to} 
    end={to === "/staff"} 
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
        isActive 
          ? "bg-blue-50 text-blue-700" 
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      )
    }
  >
    <Icon className="h-4 w-4 shrink-0" />
    <span>{label}</span>
  </NavLink>
);

export default function StaffSidebar() {
  const { user } = useAuth();
  
  return (
    <aside className="flex flex-col w-64 min-h-screen shrink-0 bg-white border-r border-gray-200">
      {/* Brand Section */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-200">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 shrink-0">
          <Droplets className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-gray-900 font-bold text-sm leading-tight">WaterFlow</p>
          <p className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 mt-0.5 inline-block">
            STAFF
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="px-3 py-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 text-sm font-medium truncate">{user?.name}</p>
            <p className="text-gray-500 text-xs">Staff</p>
          </div>
        </div>
      </div>
    </aside>
  );
}