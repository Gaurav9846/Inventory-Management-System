// src/pages/manager/ManagerDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { salesOrdersApi, notificationsApi } from "@/api/index.js";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Truck,
  AlertTriangle,
  CreditCard,
  Package,
  Users,
  Calendar,
  ArrowRight,
  Eye,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Box,
  Store,
  UserCheck,
  Bell,
  Building2,
  PlusCircle,
  MinusCircle,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/utils/helpers.js";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Color palette for charts
const CHART_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

// ==================== STAT CARD COMPONENT ====================
const StatCard = ({ title, value, change, icon: Icon, color, subtitle }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{value ?? "—"}</p>
          {change !== undefined && change !== null && (
            <p
              className={`text-xs mt-1 flex items-center gap-1 ${
                change >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {change >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {change >= 0 ? "+" : ""}
              {change.toFixed(1)}%
            </p>
          )}
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl flex-shrink-0 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// ==================== MAIN COMPONENT ====================
export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState("monthly");
  const [refreshing, setRefreshing] = useState(false);

  // ==================== FETCH DATA ====================
  const fetchDashboardData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      console.log(`📊 Fetching dashboard data with timeFrame: ${timeFrame}`);

      const [statsRes, notifRes] = await Promise.all([
        salesOrdersApi.getDashboardStats({ params: { timeFrame } }),
        notificationsApi
          .getAll({ limit: 5, isRead: "false" })
          .catch(() => ({ data: { data: [] } })),
      ]);

      console.log("📊 Dashboard API Response:", statsRes.data);

      const responseData = statsRes.data?.data || statsRes.data || {};
      setDashboardData(responseData);
      setNotifications(notifRes.data?.data || []);

      if (showRefresh) {
        toast.success("Dashboard refreshed successfully");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeFrame]);

  // ==================== RENDER ====================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  // Extract data from the real API response
  const data = dashboardData || {};

  // Main metrics
  const totalRevenue = data.totalRevenue || 0;
  const todayRevenue = data.todayRevenue || 0;
  const netProfit = data.netProfit || 0;
  const totalOrders = data.totalOrders || 0;
  const activeCustomers = data.activeCustomers || 0;
  const lowStockProducts = data.lowStockProducts || 0; // ✅ Already correct from backend
  const inventoryValue = data.inventoryValue || 0;
  const pendingApprovals = data.pendingApprovals || 0;

  // Additional metrics
  const totalProducts = data.totalProducts || 0;
  const totalSuppliers = data.totalSuppliers || 0;
  const totalStaff = data.totalStaff || 0;
  const pendingDeliveries = data.pendingDeliveries || 0;
  const creditSales = data.creditSales || 0;
  const unreadAlerts = data.unreadAlerts || 0;

  // Growth metrics
  const revenueGrowth = data.revenueGrowth || 0;
  const monthlyGrowth = data.monthlyGrowth || 0;
  const ordersGrowth = data.ordersGrowth || 0;
  const profitGrowth = data.profitGrowth || 0;
  const customersGrowth = data.customersGrowth || 0;

  // Chart data
  const monthlyTrend = data.monthlyTrend || [];
  const paymentBreakdown = data.paymentBreakdown || { CASH: 0, ONLINE: 0, CREDIT: 0 };
  const recentOrders = data.recentOrders || [];

  // ==================== STAT CARDS CONFIGURATION ====================
  const statCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      change: revenueGrowth,
      icon: TrendingUp,
      color: "bg-green-500",
      subtitle: `${monthlyTrend.length > 0 ? formatCurrency(monthlyTrend[monthlyTrend.length - 1]?.revenue || 0) : formatCurrency(0)} this month`,
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(todayRevenue),
      change: null,
      icon: DollarSign,
      color: "bg-blue-500",
      subtitle: "Today's sales",
    },
    {
      title: "Total Orders",
      value: totalOrders,
      change: ordersGrowth,
      icon: ShoppingCart,
      color: "bg-emerald-500",
      subtitle: `${recentOrders.length} recent orders`,
    },
    {
      title: "Active Customers",
      value: activeCustomers,
      change: customersGrowth,
      icon: Users,
      color: "bg-cyan-500",
      subtitle: "Last 30 days",
    },
    {
      title: "Low Stock Products",
      value: lowStockProducts, // ✅ Correct value from backend
      change: null,
      icon: AlertTriangle,
      color: lowStockProducts > 0 ? "bg-red-500" : "bg-gray-400",
      subtitle: lowStockProducts > 0 ? "Below reorder level" : "All items in stock",
    },
    {
      title: "Inventory Value",
      value: formatCurrency(inventoryValue),
      change: null,
      icon: Package,
      color: "bg-purple-500",
      subtitle: `${totalProducts} products`,
    },
    {
      title: "Pending Deliveries",
      value: pendingDeliveries,
      change: null,
      icon: Truck,
      color: "bg-orange-500",
      subtitle: "In transit / pending",
    },
    {
      title: "Credit Outstanding",
      value: formatCurrency(creditSales),
      change: null,
      icon: CreditCard,
      color: "bg-amber-500",
      subtitle: "Pending payments",
    },
  ];

  // Split into two rows of 4
  const firstRowStats = statCards.slice(0, 4);
  const secondRowStats = statCards.slice(4, 8);

  // ==================== PAYMENT BREAKDOWN DATA ====================
  const paymentData = [
    { name: "Cash", value: paymentBreakdown.CASH || 0, color: "#10b981" },
    { name: "Online", value: paymentBreakdown.ONLINE || 0, color: "#3b82f6" },
    { name: "Credit", value: paymentBreakdown.CREDIT || 0, color: "#8b5cf6" },
  ].filter((p) => p.value > 0);

  // ==================== TIME FRAME BUTTONS ====================
  const timeFrameOptions = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
  ];

  // ==================== NOTIFICATION ITEMS ====================
  const getNotificationIcon = (type) => {
    switch (type) {
      case "LOW_STOCK":
        return AlertTriangle;
      case "CREDIT_DUE":
        return CreditCard;
      case "ORDER_UPDATE":
        return ShoppingCart;
      case "DELIVERY_UPDATE":
        return Truck;
      case "PAYMENT_RECEIVED":
        return DollarSign;
      case "APPROVAL_REQUEST":
        return FileText;
      case "SYSTEM_WARNING":
        return AlertTriangle;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (priority) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-100 text-red-700 border-red-200";
      case "WARNING":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  // ==================== RENDER ====================
  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back! Here's what's happening with your business today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time Frame Selector */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {timeFrameOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeFrame(option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  timeFrame === option.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-1"
          >
            <svg
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* ===== STATS GRID - ROW 1 ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {firstRowStats.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      {/* ===== STATS GRID - ROW 2 ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {secondRowStats.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      {/* ===== CHARTS ROW ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">
                  Revenue Trend
                </h3>
                <p className="text-xs text-gray-400">
                  {timeFrame === "daily"
                    ? "Last 7 days"
                    : timeFrame === "weekly"
                    ? "Last 4 weeks"
                    : "Last 12 months"}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  Revenue
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  Orders
                </span>
              </div>
            </div>
            <div className="h-64">
              {monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "revenue" || name === "Revenue")
                          return [formatCurrency(value), "Revenue"];
                        if (name === "orders" || name === "Orders")
                          return [value, "Orders"];
                        return [value, name];
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", r: 4 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No revenue data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Breakdown */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">
                  Payment Methods
                </h3>
                <p className="text-xs text-gray-400">All-time breakdown</p>
              </div>
            </div>
            <div className="flex items-center justify-center h-64">
              {paymentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400">No payment data available</p>
              )}
            </div>
            {/* Payment Totals */}
            <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t">
              {paymentData.map((p) => (
                <div key={p.name} className="text-center">
                  <p className="text-xs text-gray-500">{p.name}</p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(p.value)}
                  </p>
                </div>
              ))}
              {paymentData.length === 0 && (
                <div className="col-span-3 text-center text-xs text-gray-400">
                  No payments recorded
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== BOTTOM ROW: Recent Orders + Notifications ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div className="p-5 pb-3 border-b flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">
                  Recent Orders
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Latest customer orders and their status
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/manager/orders")}
                className="text-emerald-600"
              >
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-gray-400"
                      >
                        No recent orders
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentOrders.map((order, idx) => (
                      <TableRow
                        key={idx}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => navigate(`/manager/orders/${order.id}`)}
                      >
                        <TableCell className="font-mono text-xs font-semibold">
                          {order.orderNumber || `#ORD-${1000 + idx}`}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">
                              {order.customer?.charAt(0) || "U"}
                            </div>
                            <span className="text-sm font-medium">
                              {order.customer || "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm max-w-[120px] truncate">
                          {order.product || "N/A"}
                        </TableCell>
                        <TableCell>{order.qty || 0}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(order.amount || 0)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              order.payment === "CASH"
                                ? "bg-green-100 text-green-700"
                                : order.payment === "ONLINE" ||
                                  order.payment === "Online"
                                ? "bg-blue-100 text-blue-700"
                                : order.payment === "CREDIT"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {order.payment || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={order.status || "PENDING"} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Panel */}
        <Card>
          <CardContent className="p-0">
            <div className="p-5 pb-3 border-b flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">
                  Recent Alerts
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {unreadAlerts > 0
                    ? `${unreadAlerts} unread notifications`
                    : "All caught up!"}
                </p>
              </div>
              {unreadAlerts > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/manager/notifications")}
                  className="text-emerald-600"
                >
                  View all
                </Button>
              )}
            </div>
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No new notifications</p>
                  <p className="text-xs text-gray-300 mt-1">
                    You're all caught up!
                  </p>
                </div>
              ) : (
                notifications.slice(0, 5).map((notif) => {
                  const Icon = getNotificationIcon(notif.type);
                  return (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-lg border ${getNotificationColor(
                        notif.priority
                      )} cursor-pointer hover:opacity-80 transition-opacity`}
                      onClick={() =>
                        navigate(
                          notif.actionUrl ||
                            `/manager/notifications/${notif.id}`
                        )
                      }
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {notif.title}
                          </p>
                          <p className="text-xs opacity-80 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-xs opacity-60 mt-1">
                            {formatDate(notif.createdAt)}
                          </p>
                        </div>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== QUICK LINKS ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <QuickLink
          icon={Package}
          label="Products"
          onClick={() => navigate("/manager/inventory")}
          color="bg-blue-50 text-blue-600"
        />
        <QuickLink
          icon={ShoppingCart}
          label="Orders"
          onClick={() => navigate("/manager/orders")}
          color="bg-emerald-50 text-emerald-600"
        />
        <QuickLink
          icon={Users}
          label="Customers"
          onClick={() => navigate("/manager/customers")}
          color="bg-purple-50 text-purple-600"
        />
        <QuickLink
          icon={Truck}
          label="Deliveries"
          onClick={() => navigate("/manager/deliveries")}
          color="bg-orange-50 text-orange-600"
        />
        <QuickLink
          icon={Store}
          label="Suppliers"
          onClick={() => navigate("/manager/suppliers")}
          color="bg-cyan-50 text-cyan-600"
        />
        <QuickLink
          icon={FileText}
          label="Reports"
          onClick={() => navigate("/manager/reports")}
          color="bg-red-50 text-red-600"
        />
      </div>
    </div>
  );
}

// ==================== QUICK LINK COMPONENT ====================
const QuickLink = ({ icon: Icon, label, onClick, color }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 bg-white"
  >
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <span className="text-xs font-medium text-gray-700">{label}</span>
  </button>
);