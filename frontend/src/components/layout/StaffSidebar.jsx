// src/components/layout/StaffSidebar.jsx
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { cn } from "@/lib/utils.js";
import {
  LayoutDashboard, ShoppingCart, Box, Truck,
  Users, FileText, Droplets,
} from "lucide-react";

const SECTIONS = [
  {
    label: "My Work",
    items: [
      { to: "/staff",             label: "My Dashboard",     icon: LayoutDashboard },
    ],
  },
  {
    label: "Daily Operations",
    items: [
      { to: "/staff/orders",      label: "Create Order",     icon: ShoppingCart },
      { to: "/staff/inventory",   label: "Stock Entry",      icon: Box },
      { to: "/staff/delivery",    label: "Delivery",         icon: Truck },
      { to: "/staff/customers",   label: "Customers",        icon: Users },
    ],
  },
  {
    label: "Reports",
    items: [
      { to: "/staff/reports",     label: "My Sales",         icon: FileText },
    ],
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
          ? "bg-violet-600 text-white shadow-sm"
          : "text-slate-400 hover:bg-white/10 hover:text-white"
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
    <aside className="flex flex-col w-64 min-h-screen shrink-0" style={{ background: "linear-gradient(180deg, #2e1065 0%, #3b0764 100%)" }}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-500 shrink-0">
          <Droplets className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Fusion IMS</p>
          <p className="text-xs px-1.5 py-0.5 rounded bg-violet-500/40 text-violet-200 mt-0.5 inline-block">STAFF</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-xs font-semibold text-violet-400/70 uppercase tracking-wider px-3 mb-2">
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
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-500 text-white text-xs font-bold shrink-0">
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-violet-400 text-xs">Staff</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
