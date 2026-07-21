// src/components/layout/Sidebar.jsx
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { cn } from "@/lib/utils.js";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  BarChart3,
  ClipboardList,
  Users,
  Box,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  Calendar,
  CreditCard,
  Bell,
  Settings,
  Droplets,
  PlusCircle,
  Tag,
  Building2,
  Boxes,
  TrendingUp,
  Award,
  FileText,
} from "lucide-react";
import { useState } from "react";
import ProfileSidebar from "./ProfileSidebar.jsx";

const SECTIONS = [
  {
    label: "DASHBOARD",
    items: [
      { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },

  {
    label: "ORDER MANAGEMENT",
    items: [
      { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
      { to: "/admin/create-order", label: "Create Order", icon: PlusCircle },
    ],
  },

  {
    label: "CUSTOMER MANAGEMENT",
    items: [
      { to: "/admin/customers", label: "Customers", icon: Users },
      { to: "/admin/credit", label: "Credit Accounts", icon: CreditCard },
    ],
  },

  {
    label: "DELIVERY",
    items: [
      { to: "/admin/delivery", label: "Deliveries", icon: Truck },
    ],
  },

  {
    label: "INVENTORY",
    items: [
      { to: "/admin/catalog", label: "Inventory", icon: Boxes },
      { to: "/admin/stock-overview", label: "Stock Overview", icon: Box },
      { to: "/admin/products", label: "Stock Production", icon: Package },
      { to: "/admin/stock-adjustments", label: "Stock Adjustments", icon: RefreshCw },
    ],
  },

  {
    label: "SUPPLIER MANAGEMENT",
    items: [
      { to: "/admin/suppliers", label: "Suppliers", icon: Building2 },
      { to: "/admin/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
    ],
  },

  {
    label: "REPORTS & ANALYTICS",
    items: [
      { to: "/admin/reports", label: "Reports & Analytics", icon: BarChart3 },
      { to: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
    ],
  },

  {
    label: "NOTIFICATIONS",
    items: [
      { to: "/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },

  {
    label: "ADMINISTRATION",
    roles: ["ADMIN"],
    items: [
      { to: "/admin/users", label: "User Management", icon: Users },
      { to: "/admin/profile-requests", label: "Profile Requests", icon: UserCheck },
    ],
  },
];

const NavItem = ({ to, label, icon: Icon }) => (
  <NavLink
    to={to}
    end={to === "/admin/dashboard"}
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

export default function Sidebar() {
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleProfileToggle = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleProfileClose = () => {
    setIsProfileOpen(false);
  };

  return (
    <>
      <aside className="flex flex-col w-64 min-h-screen shrink-0 bg-white border-r border-gray-200">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-200">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 shrink-0">
            <Droplets className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-gray-900 font-bold text-sm leading-tight">
              Fusion IMS
            </p>
            <p className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 mt-0.5 inline-block">
              ADMIN
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {SECTIONS.map((section) => {
            // Filter section by role
            if (section.roles && !section.roles.includes(user?.role)) return null;

            const visibleItems = section.items.filter(
              (item) => !item.roles || item.roles.includes(user?.role)
            );
            if (!visibleItems.length) return null;

            return (
              <div key={section.label}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {visibleItems.map((item) => (
                    <NavItem key={item.to} {...item} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="px-3 py-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
              {user?.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 text-sm font-medium truncate">
                {user?.name}
              </p>
              <p className="text-gray-500 text-xs">Admin</p>
            </div>

            {/* Settings button opens ProfileSidebar */}
            <button
              onClick={handleProfileToggle}
              className="text-gray-500 hover:text-gray-900 transition-colors p-1 rounded hover:bg-gray-100"
              title="Profile Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Profile Sidebar */}
      <ProfileSidebar 
        isOpen={isProfileOpen} 
        onClose={handleProfileClose} 
      />
    </>
  );
}