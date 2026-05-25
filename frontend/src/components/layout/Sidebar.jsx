import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { cn } from "@/lib/utils.js";
import {
  LayoutDashboard, Package, Tag, TrendingUp, TrendingDown,
  ShoppingCart, Users, Truck, BarChart3, Bell, ClipboardList,
  UserCircle, Building2, Boxes, ChevronRight, Droplets,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { to: "/",           label: "Dashboard",      icon: LayoutDashboard },
      { to: "/analytics",  label: "Analytics",      icon: BarChart3 },
      { to: "/alerts",     label: "Alerts",         icon: Bell,   roles: ["ADMIN","MANAGER"] },
    ],
  },
  {
    label: "Inventory",
    items: [
      { to: "/products",   label: "Products",       icon: Package },
      { to: "/categories", label: "Categories",     icon: Tag },
      { to: "/stock",      label: "Stock",          icon: Boxes },
    ],
  },
  {
    label: "Procurement",
    items: [
      { to: "/suppliers",       label: "Suppliers",       icon: Building2 },
      { to: "/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/customers",    label: "Customers",    icon: UserCircle },
      { to: "/sales-orders", label: "Sales Orders", icon: ShoppingCart },
      { to: "/deliveries",   label: "Deliveries",   icon: Truck },
    ],
  },
  {
    label: "Administration",
    roles: ["ADMIN", "MANAGER"],
    items: [
      { to: "/users", label: "Users", icon: Users, roles: ["ADMIN"] },
    ],
  },
];

const NavItem = ({ to, label, icon: Icon }) => (
  <NavLink
    to={to}
    end={to === "/"}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
        isActive
          ? "bg-sidebar-accent text-white"
          : "text-slate-400 hover:bg-sidebar-accent/60 hover:text-white"
      )
    }
  >
    <Icon className="h-4 w-4 shrink-0" />
    <span>{label}</span>
  </NavLink>
);

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary shrink-0">
          <Droplets className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Fusion IMS</p>
          <p className="text-slate-400 text-xs">Water Co. Inventory</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_SECTIONS.map((section) => {
          // Filter section by role
          if (section.roles && !section.roles.includes(user?.role)) return null;

          const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(user?.role)
          );
          if (!visibleItems.length) return null;

          return (
            <div key={section.label}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavItem key={item.to} {...item} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-xs font-bold shrink-0">
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-slate-400 text-xs truncate">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
