// src/pages/manager/ManagerReports.jsx
import { useEffect, useState } from "react";
import { analyticsApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import { formatCurrency } from "@/utils/helpers.js";
import { toast } from "sonner";

const COLORS = ["#059669", "#0d9488", "#0891b2", "#6366f1", "#f59e0b", "#ef4444"];

export default function ManagerReports() {
  const [movement,  setMovement]  = useState([]);
  const [topProds,  setTopProds]  = useState([]);
  const [revenue,   setRevenue]   = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [days,      setDays]      = useState("30");
  const [months,    setMonths]    = useState("6");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsApi.stockMovement({ days }),
      analyticsApi.topProducts({ days, limit: 8 }),
      analyticsApi.revenue({ months }),
      analyticsApi.auditLogs({ limit: 20 }),
    ])
      .then(([mRes, tRes, rRes, aRes]) => {
        setMovement(mRes.data);
        setTopProds(tRes.data);
        setRevenue(rRes.data);
        setAuditLogs(aRes.data.data);
      })
      .catch(() => toast.error("Failed to load reports."))
      .finally(() => setLoading(false));
  }, [days, months]);

  if (loading) return <LoadingSpinner />;

  // Pie data from top products
  const pieData = topProds.slice(0, 6).map((t) => ({
    name: t.product?.name ?? "—",
    value: t.totalSold,
  }));

  // Revenue totals
  const totalRevenue = revenue.reduce((s, r) => s + (r.revenue || 0), 0);
  const totalOrders  = revenue.reduce((s, r) => s + (r.orderCount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Analytics & Reports</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Daily sales, inventory movements, delivery and revenue</p>
      </div>

      {/* Revenue summary row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Total Revenue ({months}m)</p>
          <p className="text-3xl font-black mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Total Orders ({months}m)</p>
          <p className="text-3xl font-black mt-1">{totalOrders}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">Avg Order Value</p>
          <p className="text-3xl font-black mt-1">{totalOrders ? formatCurrency(totalRevenue / totalOrders) : "—"}</p>
        </div>
      </div>

      <Tabs defaultValue="sales">
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="sales">Daily Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        {/* SALES */}
        <TabsContent value="sales" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Monthly Revenue (NPR)</CardTitle>
                <Select value={months} onValueChange={setMonths}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {!revenue.length
                ? <p className="text-center text-muted-foreground py-10 text-sm">No revenue data yet</p>
                : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={revenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} name="Revenue (NPR)" />
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVENTORY */}
        <TabsContent value="inventory" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Stock Movement (IN vs OUT)</CardTitle>
                <Select value={days} onValueChange={setDays}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {!movement.length
                ? <p className="text-center text-muted-foreground py-10 text-sm">No movement data yet</p>
                : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={movement}>
                      <defs>
                        <linearGradient id="mIn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="mOut" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="IN"  stroke="#059669" fill="url(#mIn)"  strokeWidth={2} name="Stock In" />
                      <Area type="monotone" dataKey="OUT" stroke="#ef4444" fill="url(#mOut)" strokeWidth={2} name="Stock Out" />
                    </AreaChart>
                  </ResponsiveContainer>
                )
              }
            </CardContent>
          </Card>
        </TabsContent>

        {/* TOP PRODUCTS */}
        <TabsContent value="products" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Fast-Moving Products (Bar)</CardTitle></CardHeader>
              <CardContent>
                {!topProds.length
                  ? <p className="text-center text-muted-foreground py-10 text-sm">No data</p>
                  : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={topProds.map((t) => ({ name: t.product?.name ?? "—", sold: t.totalSold }))} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={110} />
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="sold" fill="#059669" radius={[0, 4, 4, 0]} name="Units Sold" />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                }
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Sales Share (Pie)</CardTitle></CardHeader>
              <CardContent>
                {!pieData.length
                  ? <p className="text-center text-muted-foreground py-10 text-sm">No data</p>
                  : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )
                }
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ACTIVITY LOG */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Recent System Activity</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!auditLogs.length
                    ? <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No activity recorded</TableCell></TableRow>
                    : auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <p className="text-xs font-medium">{log.user?.name}</p>
                          <p className="text-xs text-muted-foreground">{log.user?.role}</p>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{log.action}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.entity}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString("en-NP")}</TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
