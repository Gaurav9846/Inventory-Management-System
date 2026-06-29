// src/pages/staff/StaffDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { salesOrdersApi, creditApi } from "@/api/index.js";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  ShoppingBag,
  DollarSign,
  Truck,
  CreditCard,
  PlusCircle,
  Banknote,
  Landmark,
} from "lucide-react";
import {
  ComposedChart,
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
} from "recharts";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/helpers.js";

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'];

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    pendingDeliveries: 0,
    cashPayments: 0,
    onlinePayments: 0,
    paymentBreakdown: { CASH: 0, ONLINE: 0, CREDIT: 0 },
    weeklyTrend: [],
    creditSales: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, ordersRes, creditRes] = await Promise.all([
        salesOrdersApi.getDashboardStats(),
        salesOrdersApi.getRecentOrders(),
        creditApi.getSummary(),
      ]);
      
      setStats({
        ...statsRes.data,
        cashPayments: statsRes.data?.paymentBreakdown?.CASH || 0,
        onlinePayments: statsRes.data?.paymentBreakdown?.ONLINE || 0,
        creditSales: creditRes.data?.totalRemaining || 0,
      });
      setRecentOrders(ordersRes.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: "Today's Orders",
      value: stats.todayOrders,
      change: "+12%",
      icon: ShoppingBag,
      color: "bg-blue-500",
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(stats.todayRevenue),
      change: "+8.4%",
      icon: DollarSign,
      color: "bg-green-500",
    },
    {
      title: "Pending Deliveries",
      value: stats.pendingDeliveries,
      subtitle: "In transit",
      icon: Truck,
      color: "bg-yellow-500",
    },
    {
      title: "Credit Sales",
      value: formatCurrency(stats.creditSales),
      change: "+3.2%",
      icon: CreditCard,
      color: "bg-purple-500",
    },
    {
      title: "Cash Payments",
      value: formatCurrency(stats.cashPayments),
      change: "+5.2%",
      icon: Banknote,
      color: "bg-emerald-500",
    },
    {
      title: "Online Payments",
      value: formatCurrency(stats.onlinePayments),
      change: "+15.3%",
      icon: Landmark,
      color: "bg-cyan-500",
    },
  ];

  const paymentData = [
    { name: 'Cash', value: stats.cashPayments || 0, color: COLORS[0] },
    { name: 'Online Payment', value: stats.onlinePayments || 0, color: COLORS[1] },
    { name: 'Credit', value: stats.creditSales || 0, color: COLORS[2] },
  ].filter(item => item.value > 0);

  const getStatusColor = (status) => {
    const colors = {
      COMPLETED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      DISPATCHED: 'bg-purple-100 text-purple-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{label}</p>
          {payload.map((p, index) => (
            <p key={index} className="text-sm" style={{ color: p.color }}>
              {p.name}: {p.name === "Orders" ? p.value : formatCurrency(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid - 6 cards in 2 rows */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statsCards.map((card, index) => (
          <div key={index} className="overflow-hidden rounded-lg bg-white shadow hover:shadow-md transition-shadow">
            <div className="p-4">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-lg p-2 ${card.color} bg-opacity-10`}>
                  <card.icon className={`h-4 w-4 ${card.color.replace("bg-", "text-")}`} />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-xs font-medium text-gray-500 truncate">{card.title}</dt>
                    <dd>
                      <div className="text-base font-semibold text-gray-900">{card.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            {(card.change || card.subtitle) && (
              <div className="bg-gray-50 px-4 py-2">
                {card.change && (
                  <div className="text-xs">
                    <span className="font-medium text-green-600">{card.change}</span>
                    <span className="text-gray-500"> from yesterday</span>
                  </div>
                )}
                {card.subtitle && <div className="text-xs text-gray-500">{card.subtitle}</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Combined Bar + Line Chart */}
        <div className="lg:col-span-2 rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Daily Orders & Revenue Trend</h3>
              <p className="text-sm text-gray-500">Last 7 days performance</p>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs text-gray-500">Orders (Bar)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-gray-500">Revenue (Line)</span>
              </div>
            </div>
          </div>
          <div className="mt-2 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stats.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  yAxisId="left" 
                  dataKey="orders" 
                  fill="#3B82F6" 
                  name="Orders" 
                  barSize={40} 
                  radius={[4, 4, 0, 0]} 
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10B981" 
                  strokeWidth={3} 
                  name="Revenue (₦)" 
                  dot={{ r: 4, fill: "#10B981" }} 
                  activeDot={{ r: 6 }} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Method Breakdown Pie Chart */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Method Breakdown</h3>
          <p className="text-sm text-gray-500 mb-4">Today's distribution</p>
          
          {paymentData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No payment data available for today
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
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Payment breakdown details */}
              <div className="mt-4 space-y-2 border-t pt-4">
                {paymentData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(item.value)}</span>
                      <span className="text-xs text-gray-400 ml-1">
                        ({((item.value / (stats.cashPayments + stats.onlinePayments + stats.creditSales)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
                
                {/* Total */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 mt-2">
                  <span className="text-sm font-semibold text-gray-700">Total Today</span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(stats.cashPayments + stats.onlinePayments + stats.creditSales)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
          <p className="text-sm text-gray-500 mt-1">Latest customer orders and their status</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.orderId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.orderId}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {order.customer}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {order.phone}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {order.product}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {order.qty}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(order.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        order.payment === 'CASH' ? 'bg-green-100 text-green-800' :
                        order.payment === 'ONLINE' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {order.payment}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          onClick={() => navigate("/staff/create-order")}
          className="h-16 bg-violet-600 hover:bg-violet-700 text-white shadow-md hover:shadow-lg transition-all"
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          Create New Order
        </Button>
        <Button 
          onClick={() => navigate("/staff/delivery")}
          variant="outline"
          className="h-16 border-violet-600 text-violet-600 hover:bg-violet-50 transition-all"
        >
          <Truck className="h-5 w-5 mr-2" />
          View Deliveries
        </Button>
      </div>
    </div>
  );
}