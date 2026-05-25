// src/pages/staff/StaffDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { stockApi, productsApi, salesOrdersApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import {
  ShoppingCart, Box, Truck, Users, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Clock, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/utils/helpers.js";
import { useAuth } from "@/context/AuthContext.jsx";

const ActionTile = ({ label, sub, icon: Icon, bg, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border text-white transition-all hover:opacity-90 hover:scale-[1.02] shadow-sm ${bg}`}
  >
    <Icon className="h-9 w-9" />
    <div className="text-center">
      <p className="text-base font-bold">{label}</p>
      <p className="text-xs opacity-75 mt-0.5">{sub}</p>
    </div>
  </button>
);

export default function StaffDashboard() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [products,  setProducts]  = useState([]);
  const [myOrders,  setMyOrders]  = useState([]);
  const [todaysTx,  setTodaysTx]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      productsApi.getAll(),
      salesOrdersApi.getAll({ limit: 20 }),
      stockApi.getTransactions({ limit: 50 }),
    ])
      .then(([pRes, oRes, txRes]) => {
        setProducts(pRes.data);
        setMyOrders(oRes.data.data?.slice(0, 5) ?? []);
        const today = new Date().toDateString();
        setTodaysTx(txRes.data.data?.filter((tx) => new Date(tx.createdAt).toDateString() === today) ?? []);
      })
      .catch(() => toast.error("Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const lowStock = products.filter((p) => p.currentStock <= p.reorderLevel);

  return (
    <div className="space-y-6 animate-in">
      {/* Welcome */}
      <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)" }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-violet-200 text-sm font-medium">Staff Dashboard</p>
            <h2 className="text-2xl font-bold mt-0.5">Hello, {user?.name?.split(" ")[0]}! 👋</h2>
            <p className="text-violet-200 text-sm mt-1">
              {new Date().toLocaleDateString("en-NP", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-violet-300 text-xs">Today's transactions</p>
            <p className="text-4xl font-black">{todaysTx.length}</p>
          </div>
        </div>
      </div>

      {/* Primary action tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ActionTile label="Create Order"  sub="New customer order"   icon={ShoppingCart} bg="bg-gradient-to-br from-blue-600 to-blue-700"   onClick={() => navigate("/staff/orders")} />
        <ActionTile label="Stock IN"      sub="Record goods received" icon={TrendingUp}   bg="bg-gradient-to-br from-green-600 to-green-700"  onClick={() => navigate("/staff/inventory")} />
        <ActionTile label="Stock OUT"     sub="Record goods dispatch"  icon={TrendingDown} bg="bg-gradient-to-br from-red-600 to-red-700"     onClick={() => navigate("/staff/inventory")} />
        <ActionTile label="Deliveries"   sub="Update delivery status" icon={Truck}        bg="bg-gradient-to-br from-indigo-600 to-indigo-700" onClick={() => navigate("/staff/delivery")} />
      </div>

      {/* Secondary tiles */}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => navigate("/staff/customers")}
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm hover:border-violet-300 transition-all text-left">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0"><Users className="h-5 w-5 text-violet-600" /></div>
          <div><p className="font-semibold text-sm text-slate-800">Add Customer</p><p className="text-xs text-muted-foreground">Record new customer</p></div>
          <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
        </button>
        <button onClick={() => navigate("/staff/reports")}
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm hover:border-violet-300 transition-all text-left">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0"><Box className="h-5 w-5 text-amber-600" /></div>
          <div><p className="font-semibold text-sm text-slate-800">My Sales Report</p><p className="text-xs text-muted-foreground">View your history</p></div>
          <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Low stock warning */}
        {lowStock.length > 0 && (
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" /> Low Stock Warning ({lowStock.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {lowStock.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-semibold text-red-900">{p.name}</p>
                  <span className="text-sm font-black text-red-600">{p.currentStock} <span className="font-normal text-xs">{p.unit}</span></span>
                </div>
              ))}
              <p className="text-xs text-center text-muted-foreground pt-1">Notify your manager to place a purchase order.</p>
            </CardContent>
          </Card>
        )}

        {/* Today's transactions */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Today's Stock Movements ({todaysTx.length})</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-violet-700" onClick={() => navigate("/staff/inventory")}>
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {!todaysTx.length
              ? <p className="text-sm text-center text-muted-foreground py-6">No movements recorded today</p>
              : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todaysTx.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs font-medium">{tx.product?.name}</TableCell>
                        <TableCell><StatusBadge value={tx.type} /></TableCell>
                        <TableCell className="text-xs font-semibold">{tx.quantity}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleTimeString("en-NP", { hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>
      </div>

      {/* My recent orders */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">My Recent Orders</CardTitle>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-violet-700" onClick={() => navigate("/staff/orders")}>
            View all <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {!myOrders.length
            ? <p className="text-sm text-center text-muted-foreground py-6">No orders created yet</p>
            : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order No.</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs font-semibold">{o.orderNumber}</TableCell>
                      <TableCell className="text-sm">{o.customer?.name}</TableCell>
                      <TableCell className="text-xs">{o.items?.length} item(s)</TableCell>
                      <TableCell><StatusBadge value={o.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</TableCell>
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
