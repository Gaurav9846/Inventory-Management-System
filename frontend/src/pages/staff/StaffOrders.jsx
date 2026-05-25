// src/pages/staff/StaffOrders.jsx
import { useEffect, useState, useCallback } from "react";
import { salesOrdersApi, customersApi, productsApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { TableSkeleton } from "@/components/shared/LoadingSpinner.jsx";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import {
  Plus, X, Printer, Eye, AlertTriangle, ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, formatDateTime } from "@/utils/helpers.js";

/* ─── Invoice Modal ─────────────────────────────────────────────────── */
function InvoiceDialog({ open, onOpenChange, order }) {
  if (!order) return null;
  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Printer className="h-5 w-5" />Invoice</DialogTitle></DialogHeader>
        <div id="invoice-content" className="space-y-4 font-sans">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <h2 className="text-xl font-black text-violet-700">Fusion IMS</h2>
            <p className="text-xs text-muted-foreground">Water Company · Nepal</p>
          </div>
          <div className="flex justify-between text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Invoice No.</p>
              <p className="font-mono font-bold">{order.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-semibold">{formatDate(order.createdAt)}</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <p className="text-xs text-muted-foreground mb-1">Bill To</p>
            <p className="font-semibold">{order.customer?.name}</p>
            <p className="text-muted-foreground">{order.customer?.phone}</p>
            {order.customer?.deliveryAddress && <p className="text-muted-foreground text-xs">{order.customer.deliveryAddress}</p>}
          </div>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-violet-50">
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs text-center">Qty</TableHead>
                  <TableHead className="text-xs text-right">Rate</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs">{item.product?.name}</TableCell>
                    <TableCell className="text-xs text-center">{item.quantity}</TableCell>
                    <TableCell className="text-xs text-right">{item.unitPrice ? `NPR ${item.unitPrice}` : "—"}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">{item.totalPrice ? `NPR ${item.totalPrice}` : "—"}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-violet-50 font-bold">
                  <TableCell colSpan={3} className="text-sm text-right font-bold">Total</TableCell>
                  <TableCell className="text-sm text-right font-black text-violet-700">{formatCurrency(order.totalAmount)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-center text-muted-foreground">Thank you for your purchase!</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handlePrint} className="bg-violet-600 hover:bg-violet-700">
            <Printer className="h-4 w-4 mr-1" /> Print Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Create Order Form ─────────────────────────────────────────────── */
function CreateOrderDialog({ open, onOpenChange, customers, products, onSaved }) {
  const [customerId, setCustomerId] = useState("");
  const [notes,      setNotes]      = useState("");
  const [items,      setItems]      = useState([{ productId: "", quantity: 1, unitPrice: "" }]);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    if (open) { setCustomerId(""); setNotes(""); setItems([{ productId: "", quantity: 1, unitPrice: "" }]); }
  }, [open]);

  const updateItem = (i, k, v) =>
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const handleProductChange = (i, pid) => {
    const p = products.find((x) => x.id === pid);
    setItems((prev) =>
      prev.map((it, idx) => idx === i ? { ...it, productId: pid, unitPrice: String(p?.sellingPrice ?? "") } : it)
    );
  };

  const total  = items.reduce((s, it) => s + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0), 0);
  const canAdd = items.every((it) => it.productId && it.quantity);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) return toast.error("Select a customer.");
    if (items.some((it) => !it.productId || !it.quantity)) return toast.error("Fill all item rows.");
    setSaving(true);
    try {
      await salesOrdersApi.create({ customerId, notes, items });
      toast.success("Order created successfully!");
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-violet-600" />Create Sales Order</DialogTitle></DialogHeader>
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
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions…" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Order Items *</Label>
            <div className="rounded-xl border divide-y bg-slate-50/50">
              {items.map((item, i) => {
                const selectedProduct = products.find((p) => p.id === item.productId);
                return (
                  <div key={i} className="flex gap-3 p-3 items-end">
                    <div className="flex-1 space-y-1">
                      <p className="text-xs text-muted-foreground">Product</p>
                      <Select value={item.productId} onValueChange={(v) => handleProductChange(i, v)}>
                        <SelectTrigger className={selectedProduct?.currentStock === 0 ? "border-red-300" : ""}>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id} disabled={p.currentStock === 0}>
                              {p.name} — <span className={p.currentStock <= p.reorderLevel ? "text-red-600" : "text-green-600"}>{p.currentStock} {p.unit}</span>
                              {p.currentStock === 0 ? " (Out of stock)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedProduct && selectedProduct.currentStock <= selectedProduct.reorderLevel && selectedProduct.currentStock > 0 && (
                        <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Low stock remaining</p>
                      )}
                    </div>
                    <div className="w-24 space-y-1">
                      <p className="text-xs text-muted-foreground">Qty</p>
                      <Input type="number" min="1"
                        max={selectedProduct?.currentStock}
                        value={item.quantity}
                        onChange={(e) => updateItem(i, "quantity", e.target.value)} />
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
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-1">
              <Button type="button" size="sm" variant="outline" onClick={() => setItems((p) => [...p, { productId: "", quantity: 1, unitPrice: "" }])} disabled={!canAdd}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Order Total</p>
                <p className="text-lg font-black text-violet-700">{formatCurrency(total)}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-700">
              {saving ? "Creating…" : "Create Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────── */
export default function StaffOrders() {
  const [orders,    setOrders]    = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [formOpen,  setFormOpen]  = useState(false);
  const [invoice,   setInvoice]   = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, cRes, pRes] = await Promise.all([
        salesOrdersApi.getAll({ limit: 50 }),
        customersApi.getAll(),
        productsApi.getAll(),
      ]);
      setOrders(oRes.data.data);
      setCustomers(cRes.data);
      setProducts(pRes.data);
    } catch { toast.error("Failed to load orders."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales Orders"
        description="Create customer orders and generate invoices"
        actionLabel="Create New Order"
        onAction={() => setFormOpen(true)}
      />

      {/* Status summary bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Pending",   status: "PENDING",   bg: "bg-amber-50 border-amber-200 text-amber-800"   },
          { label: "Processing",status: "PROCESSING",bg: "bg-blue-50 border-blue-200 text-blue-800"      },
          { label: "Dispatched",status: "DISPATCHED",bg: "bg-indigo-50 border-indigo-200 text-indigo-800"},
          { label: "Completed", status: "COMPLETED", bg: "bg-green-50 border-green-200 text-green-800"   },
        ].map(({ label, status, bg }) => (
          <div key={status} className={`p-3 rounded-xl border ${bg}`}>
            <p className="text-2xl font-black">{orders.filter((o) => o.status === status).length}</p>
            <p className="text-xs font-semibold mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={6} cols={6} /> : (
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
                  ? <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No orders yet. Create your first order!</TableCell></TableRow>
                  : orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs font-semibold">{o.orderNumber}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{o.customer?.name}</p>
                        <p className="text-xs text-muted-foreground">{o.customer?.phone}</p>
                      </TableCell>
                      <TableCell className="text-xs">{o.items?.length} item(s)</TableCell>
                      <TableCell className="text-sm font-semibold">{formatCurrency(o.totalAmount)}</TableCell>
                      <TableCell><StatusBadge value={o.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="h-7 text-xs border-violet-300 text-violet-700 hover:bg-violet-50"
                          onClick={() => setInvoice(o)}>
                          <Printer className="h-3.5 w-3.5 mr-1" /> Invoice
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateOrderDialog open={formOpen} onOpenChange={setFormOpen} customers={customers} products={products} onSaved={fetchAll} />
      <InvoiceDialog open={!!invoice} onOpenChange={() => setInvoice(null)} order={invoice} />
    </div>
  );
}
