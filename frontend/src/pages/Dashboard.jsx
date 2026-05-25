import { useEffect, useState } from "react";
import { analyticsApi } from "@/api/index.js";
import { StatsCard } from "@/components/shared/StatsCard.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Package, AlertTriangle, ShoppingCart, Truck, Bell, Tag, Users, Building2 } from "lucide-react";
import { formatDateTime, formatCurrency } from "@/utils/helpers.js";
import { toast } from "sonner";

export default function Dashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.dashboard()
      .then(({ data }) => setData(data))
      .catch(() => toast.error("Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-in">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Products"    value={data?.totalProducts}   icon={Package}       iconBg="bg-blue-100"   iconColor="text-blue-600" />
        <StatsCard label="Low Stock Items"   value={data?.lowStockCount}   icon={AlertTriangle} iconBg="bg-red-100"    iconColor="text-red-600" />
        <StatsCard label="Pending POs"       value={data?.pendingPOs}      icon={ShoppingCart}  iconBg="bg-amber-100"  iconColor="text-amber-600" />
        <StatsCard label="Pending Deliveries" value={data?.pendingDeliveries} icon={Truck}      iconBg="bg-purple-100" iconColor="text-purple-600" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Categories"   value={data?.totalCategories} icon={Tag}       iconBg="bg-green-100"  iconColor="text-green-600" />
        <StatsCard label="Suppliers"    value={data?.totalSuppliers}  icon={Building2} iconBg="bg-cyan-100"   iconColor="text-cyan-600" />
        <StatsCard label="Customers"    value={data?.totalCustomers}  icon={Users}     iconBg="bg-indigo-100" iconColor="text-indigo-600" />
        <StatsCard label="Unread Alerts" value={data?.unreadAlerts}   icon={Bell}      iconBg="bg-rose-100"   iconColor="text-rose-600" />
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Stock Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!data?.recentTransactions?.length ? (
            <div className="py-10 text-center text-muted-foreground text-sm">No transactions yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Stock (Before → After)</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.product?.name ?? "—"}</TableCell>
                    <TableCell><StatusBadge value={tx.type} /></TableCell>
                    <TableCell>{tx.quantity} {tx.product?.unit}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {tx.previousStock} → {tx.newStock}
                    </TableCell>
                    <TableCell>{tx.user?.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt)}</TableCell>
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
