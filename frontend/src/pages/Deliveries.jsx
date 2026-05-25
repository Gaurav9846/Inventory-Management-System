import { useEffect, useState, useCallback } from "react";
import { deliveriesApi, salesOrdersApi } from "@/api/index.js";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { TableSkeleton } from "@/components/shared/LoadingSpinner.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Truck } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/utils/helpers.js";
import { useAuth } from "@/context/AuthContext.jsx";

function CreateDeliveryDialog({ open, onOpenChange, orders, onSaved }) {
  const [salesOrderId, setSalesOrderId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes]               = useState("");
  const [saving, setSaving]             = useState(false);

  useEffect(() => { if (open) { setSalesOrderId(""); setDeliveryDate(""); setNotes(""); } }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!salesOrderId) return toast.error("Select a sales order.");
    setSaving(true);
    try {
      await deliveriesApi.create({ salesOrderId, deliveryDate: deliveryDate || undefined, notes });
      toast.success("Delivery created.");
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed to create delivery."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create Delivery</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Sales Order *</Label>
            <Select value={salesOrderId} onValueChange={setSalesOrderId}>
              <SelectTrigger><SelectValue placeholder="Select dispatched order" /></SelectTrigger>
              <SelectContent>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.orderNumber} – {o.customer?.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Expected Delivery Date</Label>
            <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const DELIVERY_STATUSES = ["PENDING", "IN_TRANSIT", "DELIVERED", "RETURNED"];

export default function Deliveries() {
  const { isManager } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [formOpen,   setFormOpen]   = useState(false);
  const [updating,   setUpdating]   = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStatus !== "all" ? { status: filterStatus } : {};
      const [dRes, oRes] = await Promise.all([
        deliveriesApi.getAll(params),
        salesOrdersApi.getAll({ status: "DISPATCHED" }),
      ]);
      setDeliveries(dRes.data.data);
      setOrders(oRes.data.data);
    } catch { toast.error("Failed to load deliveries."); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleStatusChange = async (id, status) => {
    setUpdating(id);
    try {
      await deliveriesApi.updateStatus(id, { status });
      toast.success(`Delivery marked ${status.replace("_", " ").toLowerCase()}.`);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || "Update failed."); }
    finally { setUpdating(null); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Deliveries" description="Track customer delivery statuses"
        onAction={isManager ? () => setFormOpen(true) : undefined}
        actionLabel="Create Delivery"
        actionIcon={Truck}
      />
      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {DELIVERY_STATUSES.map((s) => <TabsTrigger key={s} value={s}>{s.replace("_", " ")}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      <Card>
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={6} cols={6} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Delivery Address</TableHead>
                  <TableHead>Expected Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Update Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!deliveries.length ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No deliveries found</TableCell></TableRow>
                ) : deliveries.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs font-semibold">{d.salesOrder?.orderNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{d.salesOrder?.customer?.name}</p>
                      <p className="text-xs text-muted-foreground">{d.salesOrder?.customer?.phone}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-40 truncate">
                      {d.salesOrder?.customer?.deliveryAddress || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{d.deliveryDate ? formatDate(d.deliveryDate) : "—"}</TableCell>
                    <TableCell><StatusBadge value={d.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {d.status === "PENDING"    && <Button size="sm" variant="outline" className="h-7 text-xs border-cyan-300 text-cyan-700"    onClick={() => handleStatusChange(d.id, "IN_TRANSIT")} disabled={updating === d.id}>In Transit</Button>}
                        {d.status === "IN_TRANSIT" && <Button size="sm" variant="outline" className="h-7 text-xs border-green-300 text-green-700"  onClick={() => handleStatusChange(d.id, "DELIVERED")}  disabled={updating === d.id}>Delivered</Button>}
                        {["PENDING","IN_TRANSIT"].includes(d.status) && <Button size="sm" variant="outline" className="h-7 text-xs border-orange-300 text-orange-700" onClick={() => handleStatusChange(d.id, "RETURNED")} disabled={updating === d.id}>Returned</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <CreateDeliveryDialog open={formOpen} onOpenChange={setFormOpen} orders={orders} onSaved={fetchAll} />
    </div>
  );
}
