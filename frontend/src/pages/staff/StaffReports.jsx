// src/pages/staff/StaffReports.jsx
import { useEffect, useState } from "react";
import { salesOrdersApi, stockApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  ShoppingCart, TrendingUp, TrendingDown, Package,
  CheckCircle, Clock, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, formatDateTime } from "@/utils/helpers.js";
import { useAuth } from "@/context/AuthContext.jsx";

export default function StaffReports() {
  const { user }      = useAuth();
  const [orders,      setOrders]      = useState([]);
  const [myTx,        setMyTx]        = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      salesOrdersApi.getAll({ limit: 100 }),
      stockApi.getTransactions({ limit: 200 }),
    ])
      .then(([oRes, txRes]) => {
        setOrders(oRes.data.data ?? []);
        setMyTx(txRes.data.data?.filter((tx) => tx.user?.id === user?.id) ?? []);
      })
      .catch(() => toast.error("Failed to load report data."))
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (loading) return <LoadingSpinner />;

  // Summary stats
  const totalRevenue   = orders.filter((o) => o.status === "COMPLETED").reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalOrders    = orders.length;
  const completedOrders= orders.filter((o) => o.status === "COMPLETED").length;
  const pendingOrders  = orders.filter((o) => o.status === "PENDING").length;

  const totalStockIn   = myTx.filter((t) => t.type === "IN").reduce((s, t) => s + t.quantity, 0);
  const totalStockOut  = myTx.filter((t) => t.type === "OUT").reduce((s, t) => s + t.quantity, 0);

  // Group orders by day for chart (last 14 days)
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split("T")[0];
  });

  const ordersByDay = last14.map((date) => ({
    date: date.slice(5),
    orders: orders.filter((o) => o.createdAt?.startsWith(date)).length,
    revenue: orders
      .filter((o) => o.createdAt?.startsWith(date) && o.status === "COMPLETED")
      .reduce((s, o) => s + (o.totalAmount || 0), 0),
  }));

  // Group my transactions by day
  const txByDay = last14.map((date) => ({
    date: date.slice(5),
    IN:  myTx.filter((t) => t.createdAt?.startsWith(date) && t.type === "IN").reduce((s, t) => s + t.quantity, 0),
    OUT: myTx.filter((t) => t.createdAt?.startsWith(date) && t.type === "OUT").reduce((s, t) => s + t.quantity, 0),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="My Sales Report" description="Your personal activity, sales and stock movement history" />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <ShoppingCart className="h-5 w-5 text-violet-200" />
            <span className="text-xs text-violet-200">All time</span>
          </div>
          <p className="text-3xl font-black">{totalOrders}</p>
          <p className="text-xs text-violet-200 mt-1">Total Orders</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-5 w-5 text-green-200" />
            <span className="text-xs text-green-200">Completed</span>
          </div>
          <p className="text-3xl font-black">{completedOrders}</p>
          <p className="text-xs text-green-200 mt-1">Fulfilled Orders</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-blue-200" />
            <span className="text-xs text-blue-200">Stock IN</span>
          </div>
          <p className="text-3xl font-black">{totalStockIn}</p>
          <p className="text-xs text-blue-200 mt-1">Units Received</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="h-5 w-5 text-red-200" />
            <span className="text-xs text-red-200">Stock OUT</span>
          </div>
          <p className="text-3xl font-black">{totalStockOut}</p>
          <p className="text-xs text-red-200 mt-1">Units Dispatched</p>
        </div>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="stock">My Stock Movements</TabsTrigger>
          <TabsTrigger value="charts">Activity Charts</TabsTrigger>
        </TabsList>

        {/* ── Order History ── */}
        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" /> All Orders ({orders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!orders.length
                ? <p className="text-sm text-center text-muted-foreground py-10">No orders yet</p>
                : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order No.</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs font-semibold">{o.orderNumber}</TableCell>
                          <TableCell className="text-sm">{o.customer?.name}</TableCell>
                          <TableCell className="text-xs">{o.items?.length} item(s)</TableCell>
                          <TableCell className="text-sm font-semibold">{formatCurrency(o.totalAmount)}</TableCell>
                          <TableCell><StatusBadge value={o.status} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── My Stock Movements ── */}
        <TabsContent value="stock" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" /> My Stock Entries ({myTx.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!myTx.length
                ? <p className="text-sm text-center text-muted-foreground py-10">No stock movements recorded yet</p>
                : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Before → After</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>When</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myTx.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-medium text-sm">{tx.product?.name}</TableCell>
                          <TableCell><StatusBadge value={tx.type} /></TableCell>
                          <TableCell className="font-bold">{tx.quantity} {tx.product?.unit}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {tx.previousStock} → <strong className="text-foreground">{tx.newStock}</strong>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-36 truncate">{tx.note || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Charts ── */}
        <TabsContent value="charts" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Orders Created — Last 14 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ordersByDay} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="orders" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">My Stock Movements — Last 14 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={txByDay} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="IN"  fill="#16a34a" radius={[4, 4, 0, 0]} name="Stock IN" />
                  <Bar dataKey="OUT" fill="#dc2626" radius={[4, 4, 0, 0]} name="Stock OUT" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
