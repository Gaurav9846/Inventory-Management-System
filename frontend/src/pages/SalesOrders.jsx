import { useEffect, useState, useCallback } from "react";
import { salesOrdersApi, customersApi, productsApi } from "@/api/index.js";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog.jsx";
import { TableSkeleton } from "@/components/shared/LoadingSpinner.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/utils/helpers.js";
import { useAuth } from "@/context/AuthContext.jsx";

function SOForm({ open, onOpenChange, customers, products, onSaved }) {
  const [customerId, setCustomerId] = useState("");
  const [notes,      setNotes]      = useState("");
  const [items,      setItems]      = useState([{ productId: "", quantity: 1, unitPrice: "" }]);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => { if (open) { setCustomerId(""); setNotes(""); setItems([{ productId: "", quantity: 1, unitPrice: "" }]); } }, [open]);

  const updateItem = (i, k, v) => setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  const handleProductChange = (i, productId) => {
    const product = products.find((p) => p.id === productId);
    updateItem(i, "productId", productId);
    if (product?.sellingPrice) updateItem(i, "unitPrice", String(product.sellingPrice));
  };

  const total = items.reduce((s, it) => s + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) return toast.error("Select a customer.");
    if (items.some((it) => !it.productId || !it.quantity)) return toast.error("Fill all item rows.");
    setSaving(true);
    try {
      await salesOrdersApi.create({ customerId, notes, items });
      toast.success("Sales order created.");
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed to create order."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>New Sales Order</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
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
            <div className="rounded-lg border border-border divide-y divide-border">
              {items.map((item, i) => (
                <div key={i} className="flex gap-3 p-3 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Product</Label>
                    <Select value={item.productId} onValueChange={(v) => handleProductChange(i, v)}>
                      <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id} disabled={p.currentStock === 0}>
                            {p.name} — {p.currentStock} {p.unit}(s)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
                  </div>
                  <div className="w-32 space-y-1">
                    <Label className="text-xs text-muted-foreground">Unit Price</Label>
                    <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(i, "unitPrice", e.target.value)} placeholder="NPR" />
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} disabled={items.length === 1}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-1">
              <Button type="button" size="sm" variant="outline" onClick={() => setItems((p) => [...p, { productId: "", quantity: 1, unitPrice: "" }])}><Plus className="h-4 w-4" />Add Item</Button>
              <p className="text-sm font-semibold">Total: {formatCurrency(total)}</p>
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

const SO_STATUSES = ["PENDING", "PROCESSING", "DISPATCHED", "COMPLETED", "CANCELLED"];

export default function SalesOrders() {
  const { isManager } = useAuth();
  const [orders,    setOrders]    = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [formOpen,  setFormOpen]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,  setDeleting]  = useState(false);
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
    } catch { toast.error("Failed to load sales orders."); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleStatusChange = async (id, status) => {
    setUpdating(id);
    try {
      await salesOrdersApi.updateStatus(id, status);
      toast.success(`Order ${status === "DISPATCHED" ? "dispatched – stock deducted!" : `marked ${status.toLowerCase()}`}`);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || "Status update failed."); }
    finally { setUpdating(null); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await salesOrdersApi.remove(deleteTarget.id); toast.success("Order deleted."); setDeleteTarget(null); fetchAll(); }
    catch (err) { toast.error(err.response?.data?.message || "Delete failed."); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Sales Orders" description="Manage customer orders and dispatches"
        onAction={() => setFormOpen(true)} actionLabel="New Order"
      />
      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {SO_STATUSES.map((s) => <TabsTrigger key={s} value={s}>{s}</TabsTrigger>)}
        </TabsList>
      </Tabs>
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
                  <TableHead>Delivery</TableHead>
                  <TableHead>Date</TableHead>
                  {isManager && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!orders.length ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No sales orders found</TableCell></TableRow>
                ) : orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs font-semibold">{o.orderNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{o.customer?.name}</p>
                      <p className="text-xs text-muted-foreground">{o.customer?.phone}</p>
                    </TableCell>
                    <TableCell className="text-sm">{o.items?.length} item(s)</TableCell>
                    <TableCell className="font-semibold text-sm">{formatCurrency(o.totalAmount)}</TableCell>
                    <TableCell><StatusBadge value={o.status} /></TableCell>
                    <TableCell>{o.delivery ? <StatusBadge value={o.delivery.status} /> : <span className="text-xs text-muted-foreground">No delivery</span>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
                    {isManager && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {o.status === "PENDING"    && <Button size="sm" variant="outline" className="h-7 text-xs border-blue-300 text-blue-700"    onClick={() => handleStatusChange(o.id, "PROCESSING")} disabled={updating === o.id}>Process</Button>}
                          {o.status === "PROCESSING" && <Button size="sm" variant="outline" className="h-7 text-xs border-indigo-300 text-indigo-700" onClick={() => handleStatusChange(o.id, "DISPATCHED")} disabled={updating === o.id}>Dispatch</Button>}
                          {!["DISPATCHED","COMPLETED","CANCELLED"].includes(o.status) && (
                            <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-700" onClick={() => handleStatusChange(o.id, "CANCELLED")} disabled={updating === o.id}>Cancel</Button>
                          )}
                          {!["DISPATCHED","COMPLETED"].includes(o.status) && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(o)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <SOForm open={formOpen} onOpenChange={setFormOpen} customers={customers} products={products} onSaved={fetchAll} />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}
        title="Delete Sales Order" description={`Delete order "${deleteTarget?.orderNumber}"?`}
        onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}
