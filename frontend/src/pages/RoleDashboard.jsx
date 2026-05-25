// src/pages/RoleDashboard.jsx
// Drop-in replacement for Dashboard.jsx — auto-routes to the
// correct role-specific dashboard component.
//
// Usage in App.jsx:
//   <Route index element={<RoleDashboard />} />

import { useAuth } from "@/context/AuthContext.jsx";
import Dashboard        from "./Dashboard.jsx";          // Admin full dashboard
import ManagerDashboard from "./ManagerDashboard.jsx";   // Manager-focused view
import StaffDashboard   from "./StaffDashboard.jsx";     // Staff stock-ops view

export default function RoleDashboard() {
  const { user } = useAuth();

  if (user?.role === "MANAGER") return <ManagerDashboard />;
  if (user?.role === "STAFF")   return <StaffDashboard />;
  return <Dashboard />;          // ADMIN gets the full analytics dashboard
}
