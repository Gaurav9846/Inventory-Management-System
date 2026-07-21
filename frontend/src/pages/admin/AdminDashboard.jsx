// src/pages/admin/AdminDashboard.jsx
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
  Package,
  Users,
  ArrowRight,
  FileText,
  DollarSign,
  Building2,
  UserCheck,
  Bell,
  Wallet,
  RefreshCw,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/helpers.js";
import {
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart
} from "recharts";

// ==================== STAT CARD COMPONENT ====================
const StatCard = ({ title, value, change, icon: Icon, color, onClick }) => (
  <Card 
    className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    onClick={onClick}
  >
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? "—"}</p>
          {change !== undefined && change !== null && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${Number(change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Number(change) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Number(change).toFixed(1)}%
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

// ==================== MAIN DASHBOARD ====================
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState("monthly");
  
  // ✅ Static data - doesn't change with timeframe
  const [staticStats, setStaticStats] = useState({
    totalRevenue: 0,
    netProfit: 0,
    totalOrders: 0,
    activeCustomers: 0,
    lowStockProducts: 0,
    inventoryValue: 0,
    pendingApprovals: 0,
    revenueGrowth: 0,
    totalProducts: 0,
    totalSuppliers: 0,
    totalStaff: 0,
    pendingDeliveries: 0,
    creditSales: 0,
    unreadAlerts: 0,
    paymentBreakdown: { CASH: 0, ONLINE: 0, CREDIT: 0, PAY_LATER: 0 },
    recentOrders: [],
  });
  
  // ✅ Chart data - changes with timeframe
  const [chartData, setChartData] = useState({
    monthlyTrend: [],
    monthlyRevenue: 0,
    monthlyGrowth: 0,
    ordersGrowth: 0,
    customersGrowth: 0,
    profitGrowth: 0,
  });

  // ✅ Fetch initial data on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ✅ Fetch chart data when timeframe changes
  useEffect(() => {
    if (!loading && timeFrame) {
      fetchChartData();
    }
  }, [timeFrame]);

  // ✅ Fetch ALL data (initial load or refresh)
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsRes = await salesOrdersApi.getDashboardStats({ 
        params: { timeFrame: "monthly" } 
      }).catch(() => ({ data: { data: {} } }));
      
      const dashboardData = statsRes.data?.data || {};
      
      const notifRes = await notificationsApi.getAll({ 
        params: { limit: 5, isRead: "false" } 
      }).catch(() => ({ data: { data: [] } }));
      
      // ✅ CORRECT: Use lowStockProducts directly from API
      // The backend already calculates this correctly as products with stock <= reorder level
      const lowStockCount = dashboardData.lowStockProducts || 0;
      
      setStaticStats({
        totalRevenue: dashboardData.totalRevenue || 0,
        netProfit: dashboardData.netProfit || 0,
        totalOrders: dashboardData.totalOrders || 0,
        activeCustomers: dashboardData.activeCustomers || 0,
        lowStockProducts: lowStockCount, // ✅ Use correct value from API
        inventoryValue: dashboardData.inventoryValue || 0,
        pendingApprovals: dashboardData.pendingApprovals || 0,
        revenueGrowth: dashboardData.revenueGrowth || 0,
        totalProducts: dashboardData.totalProducts || 0,
        totalSuppliers: dashboardData.totalSuppliers || 0,
        totalStaff: dashboardData.totalStaff || 0,
        pendingDeliveries: dashboardData.pendingDeliveries || 0,
        creditSales: dashboardData.creditSales || 0,
        unreadAlerts: dashboardData.unreadAlerts || 0,
        paymentBreakdown: dashboardData.paymentBreakdown || { CASH: 0, ONLINE: 0, CREDIT: 0, PAY_LATER: 0 },
        recentOrders: dashboardData.recentOrders || [],
      });
      
      const trendData = dashboardData.monthlyTrend || [];
      const lastMonth = trendData[trendData.length - 1];
      const prevMonth = trendData[trendData.length - 2];
      
      setChartData({
        monthlyTrend: trendData,
        monthlyRevenue: dashboardData.todayRevenue || dashboardData.monthlyRevenue || 0,
        monthlyGrowth: prevMonth?.revenue 
          ? Math.round(((lastMonth?.revenue - prevMonth?.revenue) / prevMonth?.revenue) * 100) 
          : 0,
        ordersGrowth: dashboardData.ordersGrowth || 0,
        customersGrowth: dashboardData.customersGrowth || 4.1,
        profitGrowth: dashboardData.profitGrowth || 11,
      });
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // ✅ Fetch ONLY chart data when timeframe changes
  const fetchChartData = async () => {
    setIsChartLoading(true);
    try {
      console.log(`📊 Fetching ${timeFrame.toUpperCase()} chart data...`);
      
      const token = localStorage.getItem('ims_token');
      const response = await fetch(
        `http://localhost:3000/api/sales-orders/dashboard-stats?timeFrame=${timeFrame}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const dashboardData = data.data || {};
      const trendData = dashboardData.monthlyTrend || [];
      
      console.log(`📊 ${timeFrame.toUpperCase()} LABELS:`, trendData.map(item => item.month));
      console.log(`📊 ${timeFrame.toUpperCase()} REVENUE:`, trendData.map(item => item.revenue));
      console.log(`📊 ${timeFrame.toUpperCase()} COUNT:`, trendData.length);
      
      const lastMonth = trendData[trendData.length - 1];
      const prevMonth = trendData[trendData.length - 2];
      
      setChartData({
        monthlyTrend: trendData,
        monthlyRevenue: dashboardData.todayRevenue || dashboardData.monthlyRevenue || 0,
        monthlyGrowth: prevMonth?.revenue 
          ? Math.round(((lastMonth?.revenue - prevMonth?.revenue) / prevMonth?.revenue) * 100) 
          : 0,
        ordersGrowth: dashboardData.ordersGrowth || 0,
        customersGrowth: dashboardData.customersGrowth || 4.1,
        profitGrowth: dashboardData.profitGrowth || 11,
      });
      
      console.log(`✅ ${timeFrame.toUpperCase()} chart updated with ${trendData.length} items`);
      
    } catch (error) {
      console.error("Error fetching chart data:", error);
      toast.error("Failed to update chart");
    } finally {
      setIsChartLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    toast.success("Dashboard refreshed");
  };

  const handleTimeFrameChange = (newTimeFrame) => {
    if (newTimeFrame !== timeFrame) {
      console.log(`🔄 Changing timeframe from ${timeFrame} to ${newTimeFrame}`);
      setTimeFrame(newTimeFrame);
    }
  };

  if (loading) return <LoadingSpinner />;

  // ==================== GET CHART LABEL ====================
  const getChartLabel = () => {
    if (timeFrame === 'daily') {
      return 'Last 7 days performance';
    } else if (timeFrame === 'weekly') {
      return 'Last 4 weeks performance';
    } else {
      return 'Last 12 months performance';
    }
  };

  // ==================== STAT CARDS ====================
  const statCards = [
    { 
      title: "Total Revenue", 
      value: formatCurrency(staticStats.totalRevenue), 
      change: staticStats.revenueGrowth,
      icon: DollarSign, 
      color: "bg-blue-500",
      onClick: () => navigate("/admin/reports?tab=revenue")
    },
    { 
      title: "Monthly Revenue", 
      value: formatCurrency(chartData.monthlyRevenue), 
      change: chartData.monthlyGrowth,
      icon: TrendingUp, 
      color: "bg-green-500",
      onClick: () => navigate("/admin/reports?tab=revenue")
    },
    { 
      title: "Net Profit", 
      value: formatCurrency(staticStats.netProfit), 
      change: chartData.profitGrowth,
      icon: TrendingUp, 
      color: "bg-purple-500",
      onClick: () => navigate("/admin/reports?tab=profit")
    },
    { 
      title: "Total Orders", 
      value: staticStats.totalOrders, 
      change: chartData.ordersGrowth,
      icon: ShoppingCart, 
      color: "bg-orange-500",
      onClick: () => navigate("/admin/orders")
    },
    { 
      title: "Active Customers", 
      value: staticStats.activeCustomers, 
      change: chartData.customersGrowth,
      icon: Users, 
      color: "bg-cyan-500",
      onClick: () => navigate("/admin/customers")
    },
    { 
      title: "Low Stock Items", 
      value: staticStats.lowStockProducts, 
      change: null, // No change calculation for this
      icon: AlertTriangle, 
      color: staticStats.lowStockProducts > 0 ? "bg-red-500" : "bg-gray-400",
      onClick: () => navigate("/admin/inventory?filter=low-stock")
    },
    { 
      title: "Inventory Value", 
      value: formatCurrency(staticStats.inventoryValue), 
      change: 5.4,
      icon: Package, 
      color: "bg-indigo-500",
      onClick: () => navigate("/admin/inventory")
    },
    { 
      title: "Pending Approvals", 
      value: staticStats.pendingApprovals, 
      change: staticStats.pendingApprovals > 0 ? 2 : 0,
      icon: Clock, 
      color: staticStats.pendingApprovals > 0 ? "bg-yellow-500" : "bg-gray-400",
      onClick: () => navigate("/admin/purchase-orders?filter=pending")
    },
  ];

  // ==================== PAYMENT DATA ====================
  const paymentData = [
    { name: "Cash", value: staticStats.paymentBreakdown?.CASH || 0, color: "#10b981" },
    { name: "Online", value: staticStats.paymentBreakdown?.ONLINE || 0, color: "#3b82f6" },
    { name: "Credit", value: staticStats.paymentBreakdown?.CREDIT || 0, color: "#8b5cf6" },
    { name: "Pay Later", value: staticStats.paymentBreakdown?.PAY_LATER || 0, color: "#f59e0b" },
  ].filter(p => p.value > 0);

  const totalPayment = paymentData.reduce((sum, p) => sum + p.value, 0);

  // ==================== QUICK STATS ====================
  const quickStats = [
    { label: "Total Products", value: staticStats.totalProducts, icon: Package, color: "text-blue-500", path: "/admin/inventory" },
    { label: "Suppliers", value: staticStats.totalSuppliers, icon: Building2, color: "text-cyan-500", path: "/admin/suppliers" },
    { label: "Staff Members", value: staticStats.totalStaff, icon: UserCheck, color: "text-green-500", path: "/admin/users" },
    { label: "Pending Deliveries", value: staticStats.pendingDeliveries, icon: Truck, color: "text-orange-500", path: "/admin/deliveries" },
    { label: "Credit Sales", value: formatCurrency(staticStats.creditSales), icon: Wallet, color: "text-purple-500", path: "/admin/credit" },
    { label: "Unread Alerts", value: staticStats.unreadAlerts, icon: Bell, color: staticStats.unreadAlerts > 0 ? "text-red-500" : "text-gray-400", path: "/admin/notifications" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time overview of your business performance</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            size="sm" 
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate("/admin/reports")}
          >
            <FileText className="h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Stats Grid - Static data */}
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

      {/* Revenue & Sales Trend - ONLY THIS SECTION UPDATES */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Revenue & Sales Trend</h3>
              <p className="text-sm text-gray-500">
                {getChartLabel()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant={timeFrame === "monthly" ? "default" : "outline"}
                className={timeFrame === "monthly" ? "bg-blue-600 hover:bg-blue-700" : ""}
                onClick={() => handleTimeFrameChange("monthly")}
                disabled={isChartLoading}
              >
                Monthly
              </Button>
              <Button 
                size="sm" 
                variant={timeFrame === "weekly" ? "default" : "outline"}
                className={timeFrame === "weekly" ? "bg-blue-600 hover:bg-blue-700" : ""}
                onClick={() => handleTimeFrameChange("weekly")}
                disabled={isChartLoading}
              >
                Weekly
              </Button>
              <Button 
                size="sm" 
                variant={timeFrame === "daily" ? "default" : "outline"}
                className={timeFrame === "daily" ? "bg-blue-600 hover:bg-blue-700" : ""}
                onClick={() => handleTimeFrameChange("daily")}
                disabled={isChartLoading}
              >
                Daily
              </Button>
            </div>
          </div>

          <div className="h-80 relative">
            {isChartLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : chartData.monthlyTrend && chartData.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    interval={0}
                  />
                  <YAxis 
                    yAxisId="left" 
                    tick={{ fontSize: 12 }} 
                    tickFormatter={(v) => {
                      if (v >= 1000000) return `${(v/1000000).toFixed(1)}M`;
                      if (v >= 1000) return `${(v/1000).toFixed(0)}k`;
                      return v;
                    }}
                  />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === "Revenue" || name === "Profit") return formatCurrency(value);
                      return value;
                    }}
                    labelFormatter={(label, payload) => {
                      if (timeFrame === 'weekly' && payload && payload[0] && payload[0].payload) {
                        const data = payload[0].payload;
                        if (data.weekRange) {
                          return `${label}: ${data.weekRange}`;
                        }
                      }
                      return label;
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} barSize={30} />
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#10b981" name="Orders" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
                  <Line yAxisId="left" type="monotone" dataKey="profit" stroke="#8b5cf6" name="Profit" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 4 }} strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No trend data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method + Recent Orders - Static */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Chart */}
        <Card className="lg:col-span-1 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900">Payment Method Distribution</h3>
            <p className="text-sm text-gray-500 mb-4">All-time breakdown</p>
            
            {paymentData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                No payment data available
              </div>
            ) : (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {paymentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2 border-t pt-4">
                  {paymentData.map((item, index) => {
                    const percentage = totalPayment > 0 ? ((item.value / totalPayment) * 100).toFixed(0) : 0;
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-gray-600">{item.name}</span>
                          <span className="text-xs text-gray-400">({percentage}%)</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(item.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                <p className="text-sm text-gray-500">Latest customer orders and their status</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin/orders")} className="text-blue-600">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            
            {staticStats.recentOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No recent orders</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staticStats.recentOrders.map((order, idx) => (
                      <TableRow 
                        key={idx} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/admin/orders/${order.id || idx}`)}
                      >
                        <TableCell className="font-mono text-xs font-semibold">
                          {order.orderNumber || `ORD-${1042 - idx}`}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">
                              {order.customer?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <span className="text-sm font-medium">{order.customer || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{order.product || "N/A"}</TableCell>
                        <TableCell className="text-center">{order.qty || 0}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(order.amount || 0)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            order.payment === "CASH" ? "bg-green-100 text-green-700" :
                            order.payment === "ONLINE" ? "bg-blue-100 text-blue-800" :
                            order.payment === "CREDIT" ? "bg-purple-100 text-purple-700" :
                            order.payment === "PAY_LATER" ? "bg-yellow-100 text-yellow-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {order.payment || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell><StatusBadge value={order.status || "PENDING"} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row - Static */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickStats.map((item, index) => (
          <div 
            key={index} 
            className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(item.path)}
          >
            <item.icon className={`h-6 w-6 mx-auto ${item.color} mb-2`} />
            <p className="text-xl font-bold text-gray-900">{item.value}</p>
            <p className="text-xs text-gray-500">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}