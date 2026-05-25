// src/pages/manager/ManagerDeliveries.jsx
import { useEffect, useState, useCallback } from "react";
import { deliveriesApi, salesOrdersApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { TableSkeleton } from "@/components/shared/LoadingSpinner.jsx";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import {
  Truck, PackageCheck, RotateCcw, Clock, CheckCircle, Plus, MapPin, Phone,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, formatDateTime } from "@/utils/helpers.js";

function AssignDeliveryDialog({ open, onOpenChange, orders, onSaved }) {
  const [salesOrderId, setSalesOrderId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes,        setNotes]        = useState("");
  const [saving,       setSaving]       = useState(false);

  useEffect(() => {
    if (open) { setSalesOrderId(""); setDeliveryDate(""); setNotes(""); }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!salesOrderId) return toast.error("Select a sales order.");
    setSaving(true);
    try {
      await deliveriesApi.create({
        salesOrderId,
        deliveryDate: deliveryDate || undefined,
        notes,
      });
      toast.success("Delivery task created.");
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed to create delivery."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-emerald-600" />Assign Delivery Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Sales Order *</Label>
            <Select value={salesOrderId} onValueChange={setSalesOrderId}>
              <SelectTrigger><SelectValue placeholder="Select dispatched order" /></SelectTrigger>
              <SelectContent>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.orderNumber} — {o.customer?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Expected Delivery Date</Label>
            <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
          </div>
          <div className="space-y-1.5">
            <Label>Delivery Notes / Instructions</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Address details, driver instructions, special handling…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? "Assigning…" : "Assign Delivery"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_PIPELINE = [
  { key: "PENDING",    label: "Pending",    icon: Clock,       color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { key: "IN_TRANSIT", label: "In Transit", icon: Truck,       color: "bg-cyan-100 text-cyan-800 border-cyan-200"       },
  { key: "DELIVERED",  label: "Delivered",  icon: CheckCircle, color: "bg-green-100 text-green-800 border-green-200"    },
  { key: "RETURNED",   label: "Returned",   icon: RotateCcw,   color: "bg-orange-100 text-orange-800 border-orange-200" },
];

export default function ManagerDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [orders,     setOrders]     = useState([]); // dispatched orders without delivery
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("all");
  const [formOpen,   setFormOpen]   = useState(false);
  const [updating,   setUpdating]   = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? { status: filter } : {};
      const [dRes, oRes] = await Promise.all([
        deliveriesApi.getAll(params),
        salesOrdersApi.getAll({ status: "DISPATCHED" }),
      ]);
      setDeliveries(dRes.data.data);
      setOrders(oRes.data.data);
    } catch { toast.error("Failed to load deliveries."); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleStatus = async (id, status, notes) => {
    setUpdating(id);
    try {
      await deliveriesApi.updateStatus(id, { status, notes });
      toast.success(`Delivery marked ${status.replace("_", " ").toLowerCase()}.`);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || "Update failed."); }
    finally { setUpdating(null); }
  };

  // Count per status
  const counts = STATUS_PIPELINE.reduce((a, s) => ({
    ...a,
    [s.key]: deliveries.filter((d) => d.status === s.key).length,
  }), {});

  return (
    <div className="space-y-5">
      <PageHeader
        title="Delivery Management"
        description="Assign and track all customer deliveries"
        actionLabel="Assign Delivery"
        actionIcon={Truck}
        onAction={() => setFormOpen(true)}
      />

      {/* Pipeline summary */}
      <div className="grid grid-cols-4 gap-3">
        {STATUS_PIPELINE.map(({ key, label, icon: Icon, color }) => (
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

      {/* Deliveries table */}
      <Card>
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={6} cols={6} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Expected Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Update Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!deliveries.length
                  ? <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No deliveries found</TableCell></TableRow>
                  : deliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <p className="font-mono text-xs font-semibold">{d.salesOrder?.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(d.salesOrder?.totalAmount)}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{d.salesOrder?.customer?.name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Phone className="h-3 w-3" />{d.salesOrder?.customer?.phone}
                        </div>
                        {d.salesOrder?.customer?.deliveryAddress && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3" />{d.salesOrder.customer.deliveryAddress}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {d.salesOrder?.items?.length} item(s)
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {d.salesOrder?.items?.map((i) => i.product?.name).slice(0, 2).join(", ")}
                          {(d.salesOrder?.items?.length ?? 0) > 2 ? "…" : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {d.deliveryDate ? formatDate(d.deliveryDate) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell><StatusBadge value={d.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {d.status === "PENDING" && (
                            <Button size="sm" className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700"
                              onClick={() => handleStatus(d.id, "IN_TRANSIT")} disabled={updating === d.id}>
                              <Truck className="h-3 w-3 mr-1" /> In Transit
                            </Button>
                          )}
                          {d.status === "IN_TRANSIT" && (
                            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
                              onClick={() => handleStatus(d.id, "DELIVERED")} disabled={updating === d.id}>
                              <PackageCheck className="h-3 w-3 mr-1" /> Delivered
                            </Button>
                          )}
                          {["PENDING", "IN_TRANSIT"].includes(d.status) && (
                            <Button size="sm" variant="outline" className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                              onClick={() => handleStatus(d.id, "RETURNED")} disabled={updating === d.id}>
                              <RotateCcw className="h-3 w-3 mr-1" /> Returned
                            </Button>
                          )}
                          {d.status === "DELIVERED" && (
                            <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" />
                              {d.deliveredAt ? formatDate(d.deliveredAt) : "Completed"}
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

      <AssignDeliveryDialog open={formOpen} onOpenChange={setFormOpen} orders={orders} onSaved={fetchAll} />
    </div>
  );
}
