// src/pages/manager/ManagerOrders.jsx
import { useEffect, useState, useCallback } from "react";
import { salesOrdersApi, customersApi, productsApi, deliveriesApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { TableSkeleton } from "@/components/shared/LoadingSpinner.jsx";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { Plus, X, Eye, CheckCircle, XCircle, Truck } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/utils/helpers.js";

// View order detail drawer
function OrderDetailDialog({ open, onOpenChange, order }) {
  if (!order) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Order Detail — {order.orderNumber}</DialogTitle>
          <DialogDescription>
            {order.customer?.name} · {formatDate(order.createdAt)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <StatusBadge value={order.status} />
            <span className="font-bold text-lg">{formatCurrency(order.totalAmount)}</span>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm font-medium">{item.product?.name}</TableCell>
                    <TableCell className="text-center text-sm">{item.quantity} {item.product?.unit}</TableCell>
                    <TableCell className="text-right text-sm">{item.unitPrice ? formatCurrency(item.unitPrice) : "—"}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{item.totalPrice ? formatCurrency(item.totalPrice) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {order.notes && <p className="text-sm text-muted-foreground italic">Note: {order.notes}</p>}
          {order.delivery && (
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-xs">
              <Truck className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-purple-800">Delivery status: {order.delivery.status.replace("_", " ")}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// New order form
function NewOrderDialog({ open, onOpenChange, customers, products, onSaved }) {
  const [customerId, setCustomerId] = useState("");
  const [notes,      setNotes]      = useState("");
  const [items,      setItems]      = useState([{ productId: "", quantity: 1, unitPrice: "" }]);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => { if (open) { setCustomerId(""); setNotes(""); setItems([{ productId: "", quantity: 1, unitPrice: "" }]); } }, [open]);

  const updateItem = (i, k, v) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const handleProductChange = (i, productId) => {
    const p = products.find((x) => x.id === productId);
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, productId, unitPrice: p?.sellingPrice ?? "" } : it));
  };

  const total = items.reduce((s, it) => s + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) return toast.error("Select a customer.");
    if (items.some((it) => !it.productId || !it.quantity)) return toast.error("Fill all items.");
    setSaving(true);
    try {
      await salesOrdersApi.create({ customerId, notes, items });
      toast.success("Sales order created.");
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New Sales Order</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} – {c.phone}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional…" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Order Items *</Label>
            <div className="rounded-lg border divide-y">
              {items.map((item, i) => (
                <div key={i} className="flex gap-3 p-3 items-end">
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-muted-foreground">Product</p>
                    <Select value={item.productId} onValueChange={(v) => handleProductChange(i, v)}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id} disabled={p.currentStock === 0}>
                            {p.name} — {p.currentStock} {p.unit}{p.currentStock === 0 ? " (Out of stock)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1"><p className="text-xs text-muted-foreground">Qty</p>
                    <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
                  </div>
                  <div className="w-32 space-y-1"><p className="text-xs text-muted-foreground">Unit Price</p>
                    <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(i, "unitPrice", e.target.value)} placeholder="NPR" />
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} disabled={items.length === 1}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Button type="button" size="sm" variant="outline" onClick={() => setItems((p) => [...p, { productId: "", quantity: 1, unitPrice: "" }])}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
              <p className="text-sm font-bold">Total: {formatCurrency(total)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create Order"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const STATUSES = ["all", "PENDING", "PROCESSING", "DISPATCHED", "COMPLETED", "CANCELLED"];

export default function ManagerOrders() {
  const [orders,    setOrders]    = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [formOpen,  setFormOpen]  = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [updating,  setUpdating]  = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStatus !== "all" ? { status: filterStatus } : {};
      const [oRes, cRes, pRes] = await Promise.all([
        salesOrdersApi.getAll(params),
        customersApi.getAll(),
        productsApi.getAll(),
      ]);
      setOrders(oRes.data.data);
      setCustomers(cRes.data);
      setProducts(pRes.data);
    } catch { toast.error("Failed to load orders."); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleStatus = async (id, status) => {
    setUpdating(id);
    try {
      await salesOrdersApi.updateStatus(id, status);
      toast.success(`Order ${status === "DISPATCHED" ? "dispatched — stock deducted" : `marked ${status}`}.`);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || "Update failed."); }
    finally { setUpdating(null); }
  };

  // Counts per status
  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = s === "all" ? orders.length : orders.filter((o) => o.status === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <PageHeader title="Customer Orders" description="Create, approve and track all sales orders"
        actionLabel="New Order" onAction={() => setFormOpen(true)}
      />

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.filter((s) => s !== "all").map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              filterStatus === s ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-200 text-slate-600 hover:border-emerald-400"
            }`}>
            {s} <span className="ml-1 opacity-60">({orders.filter((o) => o.status === s).length})</span>
          </button>
        ))}
        <button onClick={() => setFilterStatus("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            filterStatus === "all" ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200 text-slate-600"
          }`}>All ({orders.length})</button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={6} cols={7} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!orders.length
                  ? <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No orders found</TableCell></TableRow>
                  : orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs font-semibold">{o.orderNumber}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{o.customer?.name}</p>
                        <p className="text-xs text-muted-foreground">{o.customer?.phone}</p>
                      </TableCell>
                      <TableCell className="text-sm">{o.items?.length} item(s)</TableCell>
                      <TableCell className="font-semibold text-sm">{formatCurrency(o.totalAmount)}</TableCell>
                      <TableCell><StatusBadge value={o.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewOrder(o)}><Eye className="h-3.5 w-3.5" /></Button>
                          {o.status === "PENDING"    && <Button size="sm" variant="outline" className="h-7 text-xs border-blue-300 text-blue-700"   onClick={() => handleStatus(o.id, "PROCESSING")} disabled={updating === o.id}><CheckCircle className="h-3 w-3 mr-1" />Process</Button>}
                          {o.status === "PROCESSING" && <Button size="sm" variant="outline" className="h-7 text-xs border-indigo-300 text-indigo-700" onClick={() => handleStatus(o.id, "DISPATCHED")} disabled={updating === o.id}><Truck className="h-3 w-3 mr-1" />Dispatch</Button>}
                          {!["DISPATCHED","COMPLETED","CANCELLED"].includes(o.status) && (
                            <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-700" onClick={() => handleStatus(o.id, "CANCELLED")} disabled={updating === o.id}><XCircle className="h-3 w-3 mr-1" />Cancel</Button>
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

      <NewOrderDialog open={formOpen} onOpenChange={setFormOpen} customers={customers} products={products} onSaved={fetchAll} />
      <OrderDetailDialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)} order={viewOrder} />
    </div>
  );
}
