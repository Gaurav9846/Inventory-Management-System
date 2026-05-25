// src/pages/manager/ManagerDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { analyticsApi, alertsApi, salesOrdersApi, purchaseOrdersApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import {
  Package, AlertTriangle, ShoppingCart, Truck,
  ClipboardList, TrendingUp, TrendingDown,
  SlidersHorizontal, UserCheck, ArrowRight, Plus, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/utils/helpers.js";
import { useAuth } from "@/context/AuthContext.jsx";

const StatCard = ({ label, value, sub, icon: Icon, iconClass, bgClass, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-5 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 ${bgClass}`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">{label}</p>
        <p className="text-3xl font-bold">{value ?? "—"}</p>
        {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-white/30`}>
        <Icon className={`h-5 w-5 ${iconClass}`} />
      </div>
    </div>
  </button>
);

const QuickAction = ({ label, sub, icon: Icon, color, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-sm hover:-translate-y-0.5 text-left w-full ${color}`}
  >
    <div className="w-9 h-9 rounded-lg bg-white/50 flex items-center justify-center shrink-0">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-sm font-semibold leading-tight">{label}</p>
      <p className="text-xs opacity-65 mt-0.5">{sub}</p>
    </div>
  </button>
);

export default function ManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary,  setSummary]  = useState(null);
  const [alerts,   setAlerts]   = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentTx,     setRecentTx]    = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.dashboard(),
      alertsApi.getAll({ isRead: false }),
      salesOrdersApi.getAll({ limit: 5 }),
    ])
      .then(([dRes, aRes, oRes]) => {
        setSummary(dRes.data);
        setAlerts(aRes.data.slice(0, 4));
        setRecentOrders(oRes.data.data?.slice(0, 5) ?? []);
        setRecentTx(dRes.data.recentTransactions?.slice(0, 5) ?? []);
      })
      .catch(() => toast.error("Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-in">
      {/* Welcome banner */}
      <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)" }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-emerald-100 text-sm font-medium">Good {new Date().getHours() < 12 ? "morning" : "afternoon"},</p>
            <h2 className="text-2xl font-bold mt-0.5">{user?.name}</h2>
            <p className="text-emerald-100 text-sm mt-1">
              {new Date().toLocaleDateString("en-NP", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-emerald-100 text-xs">Unread alerts</p>
            <p className="text-4xl font-black">{summary?.unreadAlerts ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending POs"        value={summary?.pendingPOs}
          sub="Awaiting approval"    icon={ClipboardList}
          iconClass="text-amber-600" bgClass="bg-amber-50 border-amber-200 text-amber-900"
          onClick={() => navigate("/manager/purchase")}
        />
        <StatCard
          label="Low Stock"          value={summary?.lowStockCount}
          sub="Below reorder level"  icon={AlertTriangle}
          iconClass="text-red-600"   bgClass="bg-red-50 border-red-200 text-red-900"
          onClick={() => navigate("/manager/low-stock")}
        />
        <StatCard
          label="Active Orders"      value={summary?.pendingDeliveries}
          sub="Sales orders"         icon={ShoppingCart}
          iconClass="text-blue-600"  bgClass="bg-blue-50 border-blue-200 text-blue-900"
          onClick={() => navigate("/manager/orders")}
        />
        <StatCard
          label="In Transit"         value={summary?.pendingDeliveries}
          sub="Pending deliveries"   icon={Truck}
          iconClass="text-purple-600" bgClass="bg-purple-50 border-purple-200 text-purple-900"
          onClick={() => navigate("/manager/deliveries")}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <QuickAction label="New Purchase Order" sub="Order from supplier"  icon={ClipboardList} color="bg-amber-50 border-amber-200 text-amber-800" onClick={() => navigate("/manager/purchase")} />
          <QuickAction label="New Sales Order"    sub="Create customer order" icon={ShoppingCart}  color="bg-blue-50 border-blue-200 text-blue-800"   onClick={() => navigate("/manager/orders")} />
          <QuickAction label="Stock IN"           sub="Record goods received" icon={TrendingUp}    color="bg-green-50 border-green-200 text-green-800" onClick={() => navigate("/manager/inventory")} />
          <QuickAction label="Stock OUT"          sub="Record dispatch"       icon={TrendingDown}  color="bg-red-50 border-red-200 text-red-800"      onClick={() => navigate("/manager/inventory")} />
          <QuickAction label="Adjust Stock"       sub="Physical count"        icon={SlidersHorizontal} color="bg-slate-50 border-slate-200 text-slate-800" onClick={() => navigate("/manager/inventory")} />
          <QuickAction label="Staff Activity"     sub="Monitor team"          icon={UserCheck}     color="bg-indigo-50 border-indigo-200 text-indigo-800" onClick={() => navigate("/manager/staff")} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Low Stock Alerts ({alerts.length})
            </CardTitle>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-700" onClick={() => navigate("/manager/low-stock")}>
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {!alerts.length
              ? <p className="text-sm text-center text-muted-foreground py-6">✅ No unread alerts</p>
              : alerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <p className="text-xs font-semibold text-red-900">{a.product?.name}</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      In stock: <strong>{a.product?.currentStock}</strong> {a.product?.unit} · Reorder: {a.product?.reorderLevel}
                    </p>
                  </div>
                  <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700" onClick={() => navigate("/manager/purchase")}>
                    + Order
                  </Button>
                </div>
              ))
            }
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700">Recent Sales Orders</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-700" onClick={() => navigate("/manager/orders")}>
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {!recentOrders.length
              ? <p className="text-sm text-center text-muted-foreground py-6">No orders yet</p>
              : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="text-xs font-mono font-semibold">{o.orderNumber}</TableCell>
                        <TableCell className="text-xs">{o.customer?.name}</TableCell>
                        <TableCell className="text-xs font-semibold">{formatCurrency(o.totalAmount)}</TableCell>
                        <TableCell><StatusBadge value={o.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            }
          </CardContent>
        </Card>
      </div>

      {/* Recent stock transactions */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700">Recent Stock Movements</CardTitle>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-700" onClick={() => navigate("/manager/inventory")}>
            Full history <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {!recentTx.length
            ? <p className="text-sm text-center text-muted-foreground py-6">No transactions yet</p>
            : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Before → After</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTx.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs font-medium">{tx.product?.name}</TableCell>
                      <TableCell><StatusBadge value={tx.type} /></TableCell>
                      <TableCell className="text-xs font-semibold">{tx.quantity}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{tx.previousStock} → {tx.newStock}</TableCell>
                      <TableCell className="text-xs">{tx.user?.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          }
        </CardContent>
      </Card>
    </div>
  );
}
