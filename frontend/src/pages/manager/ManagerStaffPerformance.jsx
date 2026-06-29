// src/pages/manager/ManagerStaffPerformance.jsx
import { useEffect, useState } from "react";
import { usersApi, salesOrdersApi, creditApi, deliveriesApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import { 
  Trophy, Medal, TrendingUp, Package, Truck, DollarSign, 
  Users, Calendar, Clock, CheckCircle, Star, Award,
  BarChart3, TrendingDown, UserCheck, Filter
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/utils/helpers.js";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

export default function ManagerStaffPerformance() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffDetails, setStaffDetails] = useState(null);
  const [totals, setTotals] = useState({
    ordersProcessed: 0,
    revenueGenerated: 0,
    deliveriesCompleted: 0,
    creditCollected: 0
  });

  useEffect(() => {
    fetchStaffPerformance();
  }, [selectedMonth]);

  const fetchStaffPerformance = async () => {
    setLoading(true);
    try {
      const { data: users } = await usersApi.getAll();
      const staffUsers = users.filter(u => u.role === "STAFF" && u.isActive !== false);
      
      // Get performance for each staff member
      const staffWithPerformance = await Promise.all(staffUsers.map(async (staffMember) => {
        // Get orders created by this staff member
        const { data: ordersData } = await salesOrdersApi.getAll({ 
          createdById: staffMember.id, 
          limit: 1000,
          startDate: `${selectedMonth}-01`,
          endDate: `${selectedMonth}-31`
        });
        const orders = ordersData.data || [];
        
        const ordersProcessed = orders.length;
        const revenueGenerated = orders
          .filter(o => o.status === "COMPLETED")
          .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        
        // Get deliveries completed
        const deliveriesCompleted = orders.filter(o => o.delivery?.status === "DELIVERED").length;
        
        // Get credit collections
        let creditCollected = 0;
        try {
          const creditRes = await creditApi.getTransactions({ 
            recordedById: staffMember.id,
            page: 1, 
            limit: 500 
          });
          creditCollected = creditRes.data.data?.reduce((sum, t) => sum + t.amount, 0) || 0;
        } catch(e) {}
        
        // Calculate performance score based on multiple factors
        const maxOrders = Math.max(...staffUsers.map(s => s.ordersCount || 0), 1);
        const maxRevenue = Math.max(...staffUsers.map(s => s.revenueCount || 0), 1);
        const maxDeliveries = Math.max(...staffUsers.map(s => s.deliveryCount || 0), 1);
        
        const orderScore = (ordersProcessed / Math.max(maxOrders, 1)) * 30;
        const revenueScore = (revenueGenerated / Math.max(maxRevenue, 1)) * 40;
        const deliveryScore = (deliveriesCompleted / Math.max(maxDeliveries, 1)) * 20;
        const creditScore = Math.min(10, (creditCollected / 10000) * 10);
        
        const performanceScore = Math.min(100, Math.round(orderScore + revenueScore + deliveryScore + creditScore));
        
        return {
          ...staffMember,
          ordersProcessed,
          revenueGenerated,
          deliveriesCompleted,
          creditCollected,
          performanceScore,
          roleType: staffMember.roleType || "Staff"
        };
      }));
      
      // Sort by performance score
      const sorted = staffWithPerformance.sort((a, b) => b.performanceScore - a.performanceScore);
      setStaff(sorted);
      
      setTotals({
        ordersProcessed: sorted.reduce((sum, s) => sum + s.ordersProcessed, 0),
        revenueGenerated: sorted.reduce((sum, s) => sum + s.revenueGenerated, 0),
        deliveriesCompleted: sorted.reduce((sum, s) => sum + s.deliveriesCompleted, 0),
        creditCollected: sorted.reduce((sum, s) => sum + s.creditCollected, 0)
      });
      
    } catch (error) {
      console.error("Error fetching staff performance:", error);
      toast.error("Failed to load staff performance data");
      // Load mock data for demo
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    const mockStaff = [
      { id: "1", name: "Rahul Sharma", email: "rahul@example.com", ordersProcessed: 142, revenueGenerated: 84250, deliveriesCompleted: 38, creditCollected: 12400, performanceScore: 94, roleType: "Distribution Staff" },
      { id: "2", name: "Priya Nair", email: "priya@example.com", ordersProcessed: 128, revenueGenerated: 76800, deliveriesCompleted: 31, creditCollected: 9200, performanceScore: 87, roleType: "Sales Staff" },
      { id: "3", name: "Suresh Kumar", email: "suresh@example.com", ordersProcessed: 115, revenueGenerated: 69000, deliveriesCompleted: 28, creditCollected: 7800, performanceScore: 81, roleType: "Delivery Staff" },
      { id: "4", name: "Neha Gupta", email: "neha@example.com", ordersProcessed: 98, revenueGenerated: 58800, deliveriesCompleted: 24, creditCollected: 5600, performanceScore: 72, roleType: "Sales Staff" },
      { id: "5", name: "Kavita Singh", email: "kavita@example.com", ordersProcessed: 87, revenueGenerated: 52200, deliveriesCompleted: 19, creditCollected: 4100, performanceScore: 65, roleType: "Distribution Staff" },
      { id: "6", name: "Arjun Das", email: "arjun@example.com", ordersProcessed: 76, revenueGenerated: 45600, deliveriesCompleted: 22, creditCollected: 3500, performanceScore: 58, roleType: "Delivery Staff" },
    ];
    setStaff(mockStaff);
    setTotals({
      ordersProcessed: mockStaff.reduce((s, i) => s + i.ordersProcessed, 0),
      revenueGenerated: mockStaff.reduce((s, i) => s + i.revenueGenerated, 0),
      deliveriesCompleted: mockStaff.reduce((s, i) => s + i.deliveriesCompleted, 0),
      creditCollected: mockStaff.reduce((s, i) => s + i.creditCollected, 0)
    });
  };

  const fetchStaffDetails = async (staffMember) => {
    setSelectedStaff(staffMember);
    setStaffDetails(null);
    
    try {
      // Get detailed order history
      const { data: ordersData } = await salesOrdersApi.getAll({ 
        createdById: staffMember.id, 
        limit: 200 
      });
      const orders = ordersData.data || [];
      
      // Group orders by day
      const dailyOrders = {};
      orders.forEach(order => {
        const date = formatDate(order.createdAt, "yyyy-MM-dd");
        if (!dailyOrders[date]) {
          dailyOrders[date] = { date, orders: 0, revenue: 0 };
        }
        dailyOrders[date].orders++;
        if (order.status === "COMPLETED") {
          dailyOrders[date].revenue += order.totalAmount || 0;
        }
      });
      
      const chartData = Object.values(dailyOrders).slice(-14);
      
      // Get monthly trend
      const monthlyTrend = {};
      orders.forEach(order => {
        const month = formatDate(order.createdAt, "MMM yyyy");
        if (!monthlyTrend[month]) {
          monthlyTrend[month] = { month, revenue: 0, orders: 0 };
        }
        monthlyTrend[month].orders++;
        if (order.status === "COMPLETED") {
          monthlyTrend[month].revenue += order.totalAmount || 0;
        }
      });
      
      setStaffDetails({
        orders,
        chartData,
        monthlyTrend: Object.values(monthlyTrend),
        totalOrders: orders.length,
        totalRevenue: orders.filter(o => o.status === "COMPLETED").reduce((s, o) => s + (o.totalAmount || 0), 0),
        avgOrderValue: orders.length > 0 ? orders.filter(o => o.status === "COMPLETED").reduce((s, o) => s + (o.totalAmount || 0), 0) / orders.length : 0
      });
    } catch (error) {
      console.error("Error fetching staff details:", error);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-semibold text-gray-400">{rank}</span>;
  };

  const getPerformanceColor = (score) => {
    if (score >= 90) return "bg-emerald-100 text-emerald-700";
    if (score >= 75) return "bg-blue-100 text-blue-700";
    if (score >= 60) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  if (loading && staff.length === 0) return <LoadingSpinner />;

  // Chart data for staff performance comparison
  const chartData = staff.slice(0, 6).map(m => ({
    name: m.name.split(' ')[0],
    orders: m.ordersProcessed,
    revenue: m.revenueGenerated / 1000,
    score: m.performanceScore
  }));

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Staff Performance" 
        description="Monthly performance metrics across all staff members"
      >
        <div className="flex gap-2">
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </PageHeader>

      {/* Totals Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Orders Processed", value: totals.ordersProcessed, icon: Package, color: "bg-blue-500" },
          { label: "Total Revenue Generated", value: formatCurrency(totals.revenueGenerated), icon: DollarSign, color: "bg-green-500" },
          { label: "Total Deliveries", value: totals.deliveriesCompleted, icon: Truck, color: "bg-orange-500" },
          { label: "Total Credit Collected", value: formatCurrency(totals.creditCollected), icon: TrendingUp, color: "bg-purple-500" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Performance Comparison</CardTitle>
          <p className="text-xs text-gray-400">Orders vs Revenue by Staff Member</p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value, name) => name === "revenue" ? formatCurrency(value * 1000) : value} />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" fill="#3b82f6" name="Orders" radius={[4,4,0,0]} />
                <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Revenue (₦'000)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Staff Leaderboard</CardTitle>
          <p className="text-xs text-gray-400">Monthly performance metrics across all staff members</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Staff Member</TableHead>
                  <TableHead className="text-right">Orders Processed</TableHead>
                  <TableHead className="text-right">Revenue Generated</TableHead>
                  <TableHead className="text-right">Deliveries Completed</TableHead>
                  <TableHead className="text-right">Credit Collections</TableHead>
                  <TableHead className="text-right">Performance Score</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member, index) => (
                  <TableRow 
                    key={member.id} 
                    className={`cursor-pointer hover:bg-gray-50 ${index < 3 ? "bg-gradient-to-r from-yellow-50/30 to-transparent" : ""}`}
                    onClick={() => fetchStaffDetails(member)}
                  >
                    <TableCell>{getRankIcon(index + 1)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <Badge variant="secondary" className="text-xs">{member.roleType}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{member.ordersProcessed}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">{formatCurrency(member.revenueGenerated)}</TableCell>
                    <TableCell className="text-right">{member.deliveriesCompleted}</TableCell>
                    <TableCell className="text-right text-purple-600">{formatCurrency(member.creditCollected)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ width: `${member.performanceScore}%` }} 
                          />
                        </div>
                        <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${getPerformanceColor(member.performanceScore)}`}>
                          {member.performanceScore}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <button className="text-blue-600 hover:text-blue-700 text-sm">
                        View →
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Staff Details Modal/Drawer */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setSelectedStaff(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div 
            className="relative bg-white rounded-t-xl sm:rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">{selectedStaff.name}</h3>
                <p className="text-sm text-gray-500">{selectedStaff.email}</p>
              </div>
              <button onClick={() => setSelectedStaff(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="p-5 space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <Package className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                  <p className="text-2xl font-bold text-blue-700">{selectedStaff.ordersProcessed}</p>
                  <p className="text-xs text-blue-600">Orders Processed</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <DollarSign className="h-5 w-5 mx-auto text-green-600 mb-1" />
                  <p className="text-xl font-bold text-green-700">{formatCurrency(selectedStaff.revenueGenerated)}</p>
                  <p className="text-xs text-green-600">Revenue Generated</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <Truck className="h-5 w-5 mx-auto text-orange-600 mb-1" />
                  <p className="text-2xl font-bold text-orange-700">{selectedStaff.deliveriesCompleted}</p>
                  <p className="text-xs text-orange-600">Deliveries</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto text-purple-600 mb-1" />
                  <p className="text-xl font-bold text-purple-700">{formatCurrency(selectedStaff.creditCollected)}</p>
                  <p className="text-xs text-purple-600">Credit Collected</p>
                </div>
              </div>

              {/* Performance Score */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Performance Score</span>
                  <span className="text-2xl font-bold text-emerald-600">{selectedStaff.performanceScore}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${selectedStaff.performanceScore}%` }} />
                </div>
              </div>

              {staffDetails && (
                <>
                  {/* Monthly Trend */}
                  {staffDetails.monthlyTrend?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Revenue Trend</h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={staffDetails.monthlyTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" fontSize={10} />
                            <YAxis tickFormatter={(v) => `${v/1000}k`} />
                            <Tooltip formatter={(v) => formatCurrency(v)} />
                            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Recent Orders */}
                  {staffDetails.orders?.slice(0, 5).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Recent Orders</h4>
                      <div className="space-y-2">
                        {staffDetails.orders.slice(0, 5).map((order, i) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-mono text-xs font-semibold">{order.orderNumber}</p>
                              <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(order.totalAmount)}</p>
                              <Badge variant="outline" className="text-xs">{order.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}