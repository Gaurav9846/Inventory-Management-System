// src/pages/manager/ManagerPurchase.jsx
import { useEffect, useState, useCallback } from "react";
import { purchaseOrdersApi, suppliersApi, productsApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { TableSkeleton } from "@/components/shared/LoadingSpinner.jsx";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog.jsx";
import {
  Plus, X, Eye, CheckCircle, PackageCheck, XCircle, Trash2, Send,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, formatDateTime } from "@/utils/helpers.js";

/* ─── Detail Dialog ─────────────────────────────────────────────────── */
function PODetailDialog({ open, onOpenChange, order }) {
  if (!order) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>PO Detail — {order.orderNumber}</DialogTitle>
          <DialogDescription>
            Supplier: {order.supplier?.name} · Placed: {formatDate(order.createdAt)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <StatusBadge value={order.status} />
            <span className="font-bold text-lg">{formatCurrency(order.totalAmount)}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Supplier Contact</p>
              <p className="font-medium">{order.supplier?.name}</p>
              <p className="text-muted-foreground">{order.supplier?.phone}</p>
              <p className="text-muted-foreground">{order.supplier?.email ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Order Info</p>
              <p>Created by: <strong>{order.createdBy?.name}</strong></p>
              <p className="text-muted-foreground">{formatDateTime(order.createdAt)}</p>
            </div>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Ordered</TableHead>
                  <TableHead className="text-center">Received</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-sm">{item.product?.name}</TableCell>
                    <TableCell className="text-center">{item.quantity} {item.product?.unit}</TableCell>
                    <TableCell className="text-center">
                      {item.receivedQty > 0
                        ? <span className="text-green-600 font-semibold">{item.receivedQty}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">{item.unitPrice ? formatCurrency(item.unitPrice) : "—"}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.unitPrice ? formatCurrency(item.unitPrice * item.quantity) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {order.notes && <p className="text-sm text-muted-foreground italic">Note: {order.notes}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Create PO Dialog ──────────────────────────────────────────────── */
function CreatePODialog({ open, onOpenChange, suppliers, products, onSaved }) {
  const [supplierId, setSupplierId] = useState("");
  const [notes,      setNotes]      = useState("");
  const [items,      setItems]      = useState([{ productId: "", quantity: 1, unitPrice: "" }]);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    if (open) { setSupplierId(""); setNotes(""); setItems([{ productId: "", quantity: 1, unitPrice: "" }]); }
  }, [open]);

  const updateItem = (i, k, v) =>
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const handleProductChange = (i, pid) => {
    const p = products.find((x) => x.id === pid);
    setItems((prev) =>
      prev.map((it, idx) => idx === i ? { ...it, productId: pid, unitPrice: String(p?.costPrice ?? "") } : it)
    );
  };

  const total = items.reduce((s, it) => s + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierId) return toast.error("Select a supplier.");
    if (items.some((it) => !it.productId || !it.quantity)) return toast.error("Fill all item rows.");
    setSaving(true);
    try {
      await purchaseOrdersApi.create({ supplierId, notes, items });
      toast.success("Purchase order created. Email sent to supplier.");
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Supplier *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.paymentTerms ? ` — ${s.paymentTerms}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions, urgency…" />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <Label>Order Items *</Label>
            <div className="rounded-xl border divide-y bg-slate-50/50">
              {items.map((item, i) => (
                <div key={i} className="flex gap-3 p-3 items-end">
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-muted-foreground">Product</p>
                    <Select value={item.productId} onValueChange={(v) => handleProductChange(i, v)}>
                      <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} (stock: {p.currentStock})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1">
                    <p className="text-xs text-muted-foreground">Qty</p>
                    <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
                  </div>
                  <div className="w-32 space-y-1">
                    <p className="text-xs text-muted-foreground">Unit Price (NPR)</p>
                    <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(i, "unitPrice", e.target.value)} placeholder="0.00" />
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="text-destructive hover:text-destructive"
                    onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} disabled={items.length === 1}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-1">
              <Button type="button" size="sm" variant="outline"
                onClick={() => setItems((p) => [...p, { productId: "", quantity: 1, unitPrice: "" }])}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
              <p className="text-sm font-bold">Total: {formatCurrency(total)}</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              <Send className="h-4 w-4 mr-1" />
              {saving ? "Creating…" : "Create & Send to Supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────── */
const STATUSES = ["PENDING", "APPROVED", "RECEIVED", "CANCELLED"];

export default function ManagerPurchase() {
  const [orders,     setOrders]     = useState([]);
  const [suppliers,  setSuppliers]  = useState([]);
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("all");
  const [formOpen,   setFormOpen]   = useState(false);
  const [viewOrder,  setViewOrder]  = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,   setDeleting]   = useState(false);
  const [updating,   setUpdating]   = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? { status: filter } : {};
      const [oRes, sRes, pRes] = await Promise.all([
        purchaseOrdersApi.getAll(params),
        suppliersApi.getAll(),
        productsApi.getAll(),
      ]);
      setOrders(oRes.data.data);
      setSuppliers(sRes.data);
      setProducts(pRes.data);
    } catch { toast.error("Failed to load purchase orders."); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleStatus = async (id, status) => {
    setUpdating(id);
    try {
      await purchaseOrdersApi.updateStatus(id, status);
      const msg = status === "RECEIVED"
        ? "Order marked received — stock updated automatically!"
        : `Order marked ${status.toLowerCase()}.`;
      toast.success(msg);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || "Update failed."); }
    finally { setUpdating(null); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await purchaseOrdersApi.remove(deleteTarget.id);
      toast.success("Purchase order deleted.");
      setDeleteTarget(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || "Delete failed."); }
    finally { setDeleting(false); }
  };

  /* summary counts */
  const counts = STATUSES.reduce((a, s) => ({ ...a, [s]: orders.filter((o) => o.status === s).length }), {});

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase Orders"
        description="Procure stock from suppliers and track deliveries"
        actionLabel="New Purchase Order"
        onAction={() => setFormOpen(true)}
      />

      {/* Status summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Pending",   status: "PENDING",   color: "bg-amber-50 border-amber-200 text-amber-800"  },
          { label: "Approved",  status: "APPROVED",  color: "bg-blue-50 border-blue-200 text-blue-800"     },
          { label: "Received",  status: "RECEIVED",  color: "bg-green-50 border-green-200 text-green-800"  },
          { label: "Cancelled", status: "CANCELLED", color: "bg-red-50 border-red-200 text-red-800"        },
        ].map(({ label, status, color }) => (
          <button key={status}
            onClick={() => setFilter(filter === status ? "all" : status)}
            className={`text-left p-3 rounded-xl border transition-all hover:shadow-sm ${color} ${filter === status ? "ring-2 ring-offset-1 ring-current" : ""}`}
          >
            <p className="text-2xl font-black">{counts[status] ?? 0}</p>
            <p className="text-xs font-semibold mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={6} cols={7} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!orders.length
                  ? <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No purchase orders found</TableCell></TableRow>
                  : orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs font-semibold">{o.orderNumber}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{o.supplier?.name}</p>
                        <p className="text-xs text-muted-foreground">{o.supplier?.phone}</p>
                      </TableCell>
                      <TableCell className="text-sm">{o.items?.length} item(s)</TableCell>
                      <TableCell className="font-semibold text-sm">{formatCurrency(o.totalAmount)}</TableCell>
                      <TableCell><StatusBadge value={o.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewOrder(o)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {o.status === "PENDING" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                              onClick={() => handleStatus(o.id, "APPROVED")} disabled={updating === o.id}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Approve
                            </Button>
                          )}
                          {o.status === "APPROVED" && (
                            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
                              onClick={() => handleStatus(o.id, "RECEIVED")} disabled={updating === o.id}>
                              <PackageCheck className="h-3 w-3 mr-1" /> Mark Received
                            </Button>
                          )}
                          {["PENDING", "APPROVED"].includes(o.status) && (
                            <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
                              onClick={() => handleStatus(o.id, "CANCELLED")} disabled={updating === o.id}>
                              <XCircle className="h-3 w-3 mr-1" /> Cancel
                            </Button>
                          )}
                          {o.status !== "RECEIVED" && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(o)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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

      <CreatePODialog open={formOpen} onOpenChange={setFormOpen} suppliers={suppliers} products={products} onSaved={fetchAll} />
      <PODetailDialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)} order={viewOrder} />
      <ConfirmDialog
        open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}
        title="Delete Purchase Order"
        description={`Delete PO "${deleteTarget?.orderNumber}"? This cannot be undone.`}
        onConfirm={handleDelete} loading={deleting}
      />
    </div>
  );
}
