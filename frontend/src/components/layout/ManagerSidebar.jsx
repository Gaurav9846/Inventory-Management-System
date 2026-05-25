// src/components/layout/ManagerSidebar.jsx
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { cn } from "@/lib/utils.js";
import {
  LayoutDashboard, Package, ShoppingCart, Truck, BarChart3,
  ClipboardList, Users, Box, RefreshCw, AlertTriangle,
  UserCheck, Calendar, Droplets,
} from "lucide-react";

const SECTIONS = [
  {
    label: "Overview",
    items: [
      { to: "/manager",           label: "Dashboard",        icon: LayoutDashboard },
    ],
  },
  {
    label: "Inventory",
    items: [
      { to: "/manager/inventory",  label: "Stock Overview",   icon: Box },
      { to: "/manager/products",   label: "Products",         icon: Package },
      { to: "/manager/low-stock",  label: "Low Stock Alerts", icon: AlertTriangle },
    ],
  },
  {
    label: "Orders",
    items: [
      { to: "/manager/orders",     label: "Customer Orders",  icon: ShoppingCart },
      { to: "/manager/purchase",   label: "Purchase Orders",  icon: ClipboardList },
    ],
  },
  {
    label: "Deliveries",
    items: [
      { to: "/manager/deliveries", label: "Delivery Tasks",   icon: Truck },
    ],
  },
  {
    label: "Team",
    items: [
      { to: "/manager/staff",      label: "Staff Activity",   icon: UserCheck },
      { to: "/manager/schedule",   label: "Work Schedule",    icon: Calendar },
    ],
  },
  {
    label: "Reports",
    items: [
      { to: "/manager/reports",    label: "Analytics",        icon: BarChart3 },
    ],
  },
];

const NavItem = ({ to, label, icon: Icon }) => (
  <NavLink
    to={to}
    end={to === "/manager"}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-emerald-600 text-white shadow-sm"
          : "text-slate-400 hover:bg-white/10 hover:text-white"
      )
    }
  >
    <Icon className="h-4 w-4 shrink-0" />
    <span>{label}</span>
  </NavLink>
);

export default function ManagerSidebar() {
  const { user } = useAuth();
  return (
    <aside className="flex flex-col w-64 min-h-screen shrink-0" style={{ background: "linear-gradient(180deg, #064e3b 0%, #065f46 100%)" }}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500 shrink-0">
          <Droplets className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Fusion IMS</p>
          <p className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/40 text-emerald-200 mt-0.5 inline-block">MANAGER</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-xs font-semibold text-emerald-400/70 uppercase tracking-wider px-3 mb-2">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => <NavItem key={item.to} {...item} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white text-xs font-bold shrink-0">
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-emerald-400 text-xs">Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
