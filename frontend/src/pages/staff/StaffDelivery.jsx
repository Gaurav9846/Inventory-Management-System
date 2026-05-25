// src/pages/staff/StaffDelivery.jsx
import { useEffect, useState, useCallback } from "react";
import { deliveriesApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { TableSkeleton } from "@/components/shared/LoadingSpinner.jsx";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import {
  Truck, PackageCheck, RotateCcw, Clock,
  CheckCircle, MapPin, Phone, Package,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/utils/helpers.js";

const PIPELINE = [
  { key: "PENDING",    label: "Pending",    icon: Clock,        color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
  { key: "IN_TRANSIT", label: "In Transit", icon: Truck,        color: "bg-cyan-50 border-cyan-200 text-cyan-800"       },
  { key: "DELIVERED",  label: "Delivered",  icon: CheckCircle,  color: "bg-green-50 border-green-200 text-green-800"    },
  { key: "RETURNED",   label: "Returned",   icon: RotateCcw,    color: "bg-orange-50 border-orange-200 text-orange-800" },
];

export default function StaffDelivery() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("all");
  const [updating,   setUpdating]   = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? { status: filter } : {};
      const { data } = await deliveriesApi.getAll(params);
      setDeliveries(data.data);
    } catch { toast.error("Failed to load deliveries."); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleStatus = async (id, status) => {
    setUpdating(id);
    try {
      await deliveriesApi.updateStatus(id, { status });
      toast.success(`Delivery marked ${status.replace("_", " ").toLowerCase()}.`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed.");
    } finally { setUpdating(null); }
  };

  const counts = PIPELINE.reduce((a, s) => ({
    ...a, [s.key]: deliveries.filter((d) => d.status === s.key).length,
  }), {});

  return (
    <div className="space-y-5">
      <PageHeader title="Deliveries" description="Prepare products and update delivery completion" />

      {/* Pipeline cards */}
      <div className="grid grid-cols-4 gap-3">
        {PIPELINE.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? "all" : key)}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-sm ${color} ${filter === key ? "ring-2 ring-offset-1 ring-current" : ""}`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <div className="text-left">
              <p className="text-2xl font-black leading-none">{counts[key] ?? 0}</p>
              <p className="text-xs font-semibold mt-1">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Info banner for staff */}
      <div className="flex items-start gap-3 px-4 py-3 bg-violet-50 border border-violet-200 rounded-xl">
        <Truck className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-violet-900">Staff Delivery Instructions</p>
          <p className="text-xs text-violet-700 mt-0.5">
            You can mark deliveries as <strong>In Transit</strong> when you hand off to the driver,
            and <strong>Delivered</strong> once the customer confirms receipt. Only managers can create new delivery tasks.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={6} cols={6} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items to Deliver</TableHead>
                  <TableHead>Expected Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!deliveries.length
                  ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Truck className="h-8 w-8 opacity-30" />
                          <p className="text-sm">No deliveries found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                  : deliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <p className="font-mono text-xs font-semibold">{d.salesOrder?.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(d.salesOrder?.totalAmount)}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{d.salesOrder?.customer?.name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Phone className="h-3 w-3" />
                          {d.salesOrder?.customer?.phone}
                        </div>
                        {d.salesOrder?.customer?.deliveryAddress && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-40">{d.salesOrder.customer.deliveryAddress}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {d.salesOrder?.items?.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center gap-1 text-xs">
                              <Package className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="text-slate-700">{item.product?.name}</span>
                              <span className="text-muted-foreground">×{item.quantity}</span>
                            </div>
                          ))}
                          {(d.salesOrder?.items?.length ?? 0) > 3 && (
                            <p className="text-xs text-muted-foreground">+{d.salesOrder.items.length - 3} more</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {d.deliveryDate ? formatDate(d.deliveryDate) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell><StatusBadge value={d.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {d.status === "PENDING" && (
                            <Button
                              size="sm" className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700"
                              onClick={() => handleStatus(d.id, "IN_TRANSIT")}
                              disabled={updating === d.id}
                            >
                              <Truck className="h-3 w-3 mr-1" /> In Transit
                            </Button>
                          )}
                          {d.status === "IN_TRANSIT" && (
                            <Button
                              size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
                              onClick={() => handleStatus(d.id, "DELIVERED")}
                              disabled={updating === d.id}
                            >
                              <PackageCheck className="h-3 w-3 mr-1" /> Delivered
                            </Button>
                          )}
                          {["PENDING", "IN_TRANSIT"].includes(d.status) && (
                            <Button
                              size="sm" variant="outline"
                              className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                              onClick={() => handleStatus(d.id, "RETURNED")}
                              disabled={updating === d.id}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" /> Return
                            </Button>
                          )}
                          {d.status === "DELIVERED" && (
                            <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> Complete
                            </span>
                          )}
                          {d.status === "RETURNED" && (
                            <span className="text-xs text-orange-600 font-semibold flex items-center gap-1">
                              <RotateCcw className="h-3.5 w-3.5" /> Returned
                            </span>
                          )}
                        </div>
                      </TableCell>
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
