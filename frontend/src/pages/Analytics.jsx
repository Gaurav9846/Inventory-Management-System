import { useEffect, useState } from "react";
import { analyticsApi } from "@/api/index.js";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/helpers.js";

export default function Analytics() {
  const [stockMovement, setStockMovement] = useState([]);
  const [topProducts,   setTopProducts]   = useState([]);
  const [revenue,       setRevenue]        = useState([]);
  const [loading,       setLoading]        = useState(true);
  const [days,          setDays]           = useState("30");
  const [months,        setMonths]         = useState("6");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsApi.stockMovement({ days }),
      analyticsApi.topProducts({ days, limit: 8 }),
      analyticsApi.revenue({ months }),
    ])
      .then(([smRes, tpRes, revRes]) => {
        setStockMovement(smRes.data);
        setTopProducts(tpRes.data);
        setRevenue(revRes.data);
      })
      .catch(() => toast.error("Failed to load analytics."))
      .finally(() => setLoading(false));
  }, [days, months]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-in">
      {/* Stock Movement */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Stock Movement</CardTitle>
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
          {!stockMovement.length ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stockMovement} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorIN"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                  <linearGradient id="colorOUT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(214.3 31.8% 91.4%)", fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="IN"  stroke="#22c55e" fill="url(#colorIN)"  strokeWidth={2} name="Stock In" />
                <Area type="monotone" dataKey="OUT" stroke="#ef4444" fill="url(#colorOUT)" strokeWidth={2} name="Stock Out" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top Fast-Moving Products</CardTitle></CardHeader>
          <CardContent>
            {!topProducts.length ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topProducts.map((t) => ({ name: t.product?.name || "—", sold: t.totalSold }))} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={110} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="sold" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Units Sold" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Monthly Revenue (NPR)</CardTitle>
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
            {!revenue.length ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No revenue data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Revenue (NPR)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
