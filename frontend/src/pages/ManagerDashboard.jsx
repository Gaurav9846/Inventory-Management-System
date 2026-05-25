// src/pages/ManagerDashboard.jsx
// Shown when a MANAGER logs in — focuses on procurement, low-stock and order approvals
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { analyticsApi, alertsApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { StatsCard } from "@/components/shared/StatsCard.jsx";
import {
  ClipboardList, AlertTriangle, ShoppingCart, Truck,
  TrendingUp, TrendingDown, SlidersHorizontal, Plus,
  ShieldCheck, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime, formatCurrency } from "@/utils/helpers.js";
import { useAuth } from "@/context/AuthContext.jsx";

export default function ManagerDashboard() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [data,    setData]    = useState(null);
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.dashboard(),
      alertsApi.getAll({ isRead: false }),
    ])
      .then(([dashRes, alertRes]) => {
        setData(dashRes.data);
        setAlerts(alertRes.data.slice(0, 5));
      })
      .catch(() => toast.error("Failed to load manager dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const quickActions = [
    { label: "Create Purchase Order", sub: "Procure from supplier",   icon: ClipboardList, color: "bg-blue-50 border-blue-200 text-blue-700",   to: "/purchase-orders" },
    { label: "New Sales Order",       sub: "Create customer order",   icon: ShoppingCart,  color: "bg-green-50 border-green-200 text-green-700",  to: "/sales-orders" },
    { label: "Stock In",              sub: "Record goods receipt",    icon: TrendingUp,    color: "bg-amber-50 border-amber-200 text-amber-700",  to: "/stock" },
    { label: "Stock Out",             sub: "Record goods dispatch",   icon: TrendingDown,  color: "bg-red-50 border-red-200 text-red-700",        to: "/stock" },
    { label: "Adjust Stock",          sub: "Physical count update",   icon: SlidersHorizontal, color: "bg-purple-50 border-purple-200 text-purple-700", to: "/stock" },
    { label: "Add Customer",          sub: "Register new customer",   icon: Plus,          color: "bg-cyan-50 border-cyan-200 text-cyan-700",     to: "/customers" },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Role banner */}
      <div className="flex items-center gap-3 px-4 py-3 bg-cyan-50 border border-cyan-200 rounded-xl">
        <ShieldCheck className="h-5 w-5 text-cyan-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-cyan-900">
            Welcome, {user?.name} — Manager Panel
          </p>
          <p className="text-xs text-cyan-700 mt-0.5">
            You can create and manage inventory, orders, suppliers and customers.
            User management is restricted to Admins.
          </p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Pending POs"
          value={data?.pendingPOs}
          icon={ClipboardList}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          trendLabel="Need your approval"
        />
        <StatsCard
          label="Low Stock Items"
          value={data?.lowStockCount}
          icon={AlertTriangle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          trendLabel="Below reorder level"
        />
        <StatsCard
          label="Pending Orders"
          value={data?.pendingDeliveries}
          icon={ShoppingCart}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          trendLabel="Sales orders"
        />
        <StatsCard
          label="In Transit"
          value={data?.pendingDeliveries}
          icon={Truck}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          trendLabel="Active deliveries"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-opacity hover:opacity-80 ${action.color}`}
              >
                <action.icon className="h-4 w-4 shrink-0" />
                <div>
                  <p className="text-xs font-semibold leading-tight">{action.label}</p>
                  <p className="text-xs opacity-75 mt-0.5">{action.sub}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Low Stock Alerts</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/alerts")}>
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {!alerts.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">✅ No unread alerts</p>
            ) : alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-red-900 truncate">{alert.product?.name}</p>
                    <p className="text-xs text-red-600">Stock: {alert.product?.currentStock} / Reorder: {alert.product?.reorderLevel}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-6 text-xs shrink-0"
                  onClick={() => navigate("/purchase-orders")}
                >
                  Order
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Recent Stock Transactions</CardTitle>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/stock")}>
            View all <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {!data?.recentTransactions?.length ? (
            <p className="text-sm text-center text-muted-foreground py-10">No transactions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Before → After</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium text-sm">{tx.product?.name}</TableCell>
                    <TableCell><StatusBadge value={tx.type} /></TableCell>
                    <TableCell>{tx.quantity} {tx.product?.unit}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {tx.previousStock} → <strong className="text-foreground">{tx.newStock}</strong>
                    </TableCell>
                    <TableCell className="text-sm">{tx.user?.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
