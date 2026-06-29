// src/pages/manager/ManagerDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { salesOrdersApi, notificationsApi, analyticsApi } from "@/api/index.js";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import {
  TrendingUp, TrendingDown, ShoppingCart, Truck, AlertTriangle,
  CreditCard, Package, Users, Calendar, ArrowRight, Eye,
  FileText, CheckCircle, Clock, XCircle, DollarSign, Box
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/utils/helpers.js";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"];

const StatCard = ({ title, value, change, icon: Icon, color }) => (
  <Card className="overflow-hidden">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? "—"}</p>
          {change && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
              {change.startsWith('+') ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todayOrders: 318,
    todayRevenue: 184500,
    pendingDeliveries: 41,
    lowStockProducts: 7,
    creditSales: 38200,
    monthlySales: 2460000,
    inventoryValue: 912000,
    supplierPendingOrders: 5,
    dailySalesTrend: [],
    paymentBreakdown: { CASH: 84500, ONLINE: 61200, CREDIT: 38200 },
    recentOrders: []
  });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Try to fetch real data, fallback to mock if needed
      const [statsRes, notifRes] = await Promise.all([
        salesOrdersApi.getDashboardStats().catch(() => ({ data: {} })),
        notificationsApi.getAll({ limit: 5, isRead: "false" }).catch(() => ({ data: { data: [] } }))
      ]);
      
      setStats(prev => ({ ...prev, ...statsRes.data }));
      setNotifications(notifRes.data?.data || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const statCards = [
    { title: "Today's Orders", value: stats.todayOrders, change: "+9%", icon: ShoppingCart, color: "bg-blue-500" },
    { title: "Today's Revenue", value: formatCurrency(stats.todayRevenue), change: "+12%", icon: DollarSign, color: "bg-green-500" },
    { title: "Pending Deliveries", value: stats.pendingDeliveries, change: "+2%", icon: Truck, color: "bg-orange-500" },
    { title: "Low Stock Products", value: stats.lowStockProducts, change: "-12%", icon: AlertTriangle, color: "bg-red-500" },
    { title: "Credit Sales", value: formatCurrency(stats.creditSales), change: "+3.1%", icon: CreditCard, color: "bg-purple-500" },
    { title: "Monthly Sales", value: formatCurrency(stats.monthlySales), change: "+8.2%", icon: TrendingUp, color: "bg-emerald-500" },
    { title: "Inventory Value", value: formatCurrency(stats.inventoryValue), change: "+5.4%", icon: Package, color: "bg-cyan-500" },
    { title: "Supplier Pending Orders", value: stats.supplierPendingOrders, change: "-2", icon: Users, color: "bg-amber-500" },
  ];

  const paymentData = [
    { name: "Cash", value: stats.paymentBreakdown?.CASH || 0, color: "#10b981" },
    { name: "Online", value: stats.paymentBreakdown?.ONLINE || 0, color: "#3b82f6" },
    { name: "Credit", value: stats.paymentBreakdown?.CREDIT || 0, color: "#8b5cf6" },
  ].filter(p => p.value > 0);

  return (
    <div className="space-y-6">
      {/* Stats Grid - 4x2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.slice(0, 4).map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.slice(4, 8).map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Trend */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Daily Sales Trend</h3>
              <span className="text-xs text-gray-400">Last 7 days</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailySalesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Breakdown */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Payment Method Breakdown</h3>
              <span className="text-xs text-gray-400">Today's distribution</span>
            </div>
            <div className="flex items-center justify-center h-64">
              {paymentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400">No payment data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-5 pb-3 border-b">
            <h3 className="text-sm font-semibold text-gray-700">Recent Orders</h3>
            <p className="text-xs text-gray-400 mt-0.5">Latest customer orders and their status</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Staff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentOrders?.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-400">No recent orders</TableCell></TableRow>
                ) : (
                  stats.recentOrders?.slice(0, 7).map((order, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs font-semibold">{order.orderNumber || `#ORD-${1042 - idx}`}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">
                            {order.customer?.charAt(0) || "A"}
                          </div>
                          <span className="text-sm font-medium">{order.customer || "Amit Verma"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{order.product || "20L Jar Water"}</TableCell>
                      <TableCell>{order.qty || 12}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(order.amount || 960)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          order.payment === "Cash" ? "bg-green-100 text-green-700" :
                          order.payment === "Online" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        }`}>
                          {order.payment || "Cash"}
                        </span>
                      </TableCell>
                      <TableCell><StatusBadge value={order.status || "Delivered"} /></TableCell>
                      <TableCell className="text-sm text-gray-500">{order.assignedStaff || "Ravi Kumar"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t text-center">
            <Button variant="ghost" size="sm" onClick={() => navigate("/manager/orders")} className="text-emerald-600">
              View all orders <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}