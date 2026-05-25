// src/pages/manager/ManagerLowStock.jsx
import { useEffect, useState, useCallback } from "react";
import { productsApi, alertsApi, purchaseOrdersApi, suppliersApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { AlertTriangle, Bell, BellOff, CheckCheck, ClipboardPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/utils/helpers.js";

function QuickPODialog({ open, onOpenChange, product, suppliers, onSaved }) {
  const [supplierId, setSupplierId] = useState("");
  const [quantity,   setQuantity]   = useState(String((product?.reorderLevel ?? 10) * 2));
  const [unitPrice,  setUnitPrice]  = useState(String(product?.costPrice ?? ""));
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    if (open) {
      setSupplierId(product?.supplierId ?? "");
      setQuantity(String((product?.reorderLevel ?? 10) * 2));
      setUnitPrice(String(product?.costPrice ?? ""));
    }
  }, [open, product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierId) return toast.error("Select a supplier.");
    setSaving(true);
    try {
      await purchaseOrdersApi.create({
        supplierId,
        notes: `Auto PO for low stock: ${product?.name}`,
        items: [{ productId: product.id, quantity: Number(quantity), unitPrice: unitPrice ? Number(unitPrice) : null }],
      });
      toast.success(`PO created for ${product?.name}.`);
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPlus className="h-5 w-5 text-emerald-600" /> Quick Purchase Order
          </DialogTitle>
        </DialogHeader>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-2">
          <p className="text-sm font-semibold text-red-900">{product?.name}</p>
          <p className="text-xs text-red-700 mt-0.5">
            Stock: <strong>{product?.currentStock}</strong> {product?.unit}(s) · Reorder at: {product?.reorderLevel}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Supplier *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Select supplier…" /></SelectTrigger>
              <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Qty to Order *</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Unit Price (NPR)</Label>
              <Input type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? "Creating…" : "Create PO"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ManagerLowStock() {
  const [lowProducts, setLowProducts] = useState([]);
  const [alerts,      setAlerts]      = useState([]);
  const [suppliers,   setSuppliers]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filterUnread,setFilterUnread]= useState(true);
  const [poTarget,    setPoTarget]    = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterUnread ? { isRead: false } : {};
      const [pRes, aRes, sRes] = await Promise.all([
        productsApi.getAll({ lowStock: true }),
        alertsApi.getAll(params),
        suppliersApi.getAll(),
      ]);
      setLowProducts(pRes.data);
      setAlerts(aRes.data);
      setSuppliers(sRes.data);
    } catch { toast.error("Failed to load low stock data."); }
    finally { setLoading(false); }
  }, [filterUnread]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const markRead    = async (id) => { try { await alertsApi.markRead(id); fetchAll(); } catch { toast.error("Failed."); } };
  const markAllRead = async ()   => { try { await alertsApi.markAllRead(); toast.success("All marked read."); fetchAll(); } catch { toast.error("Failed."); } };
  const deleteAlert = async (id) => { try { await alertsApi.remove(id); toast.success("Dismissed."); fetchAll(); } catch { toast.error("Failed."); } };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Low Stock Alerts" description="Products below reorder level — act immediately" />

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-600 text-white rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-100">Critical (≤50% reorder)</p>
          <p className="text-3xl font-black mt-1">{lowProducts.filter((p) => p.currentStock <= p.reorderLevel * 0.5).length}</p>
        </div>
        <div className="bg-amber-500 text-white rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">Warning (≤ reorder)</p>
          <p className="text-3xl font-black mt-1">{lowProducts.filter((p) => p.currentStock > p.reorderLevel * 0.5 && p.currentStock <= p.reorderLevel).length}</p>
        </div>
        <div className="bg-slate-800 text-white rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Unread Alerts</p>
          <p className="text-3xl font-black mt-1">{alerts.filter((a) => !a.isRead).length}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" /> Products Below Reorder Level ({lowProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!lowProducts.length ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">All products above reorder level!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Shortage</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowProducts.map((p) => {
                  const isCritical = p.currentStock <= p.reorderLevel * 0.5;
                  const shortage   = p.reorderLevel - p.currentStock;
                  return (
                    <TableRow key={p.id} className={isCritical ? "bg-red-50/60" : "bg-amber-50/40"}>
                      <TableCell>
                        <p className="font-semibold text-sm">{p.name}</p>
                        {p.sku && <p className="text-xs font-mono text-muted-foreground">{p.sku}</p>}
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{p.categoryName || p.category?.name}</Badge></TableCell>
                      <TableCell>
                        <span className={`text-xl font-black ${isCritical ? "text-red-600" : "text-amber-600"}`}>{p.currentStock}</span>
                        <span className="text-xs text-muted-foreground ml-1">{p.unit}(s)</span>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{p.reorderLevel} {p.unit}(s)</TableCell>
                      <TableCell>
                        <span className={`text-sm font-bold ${isCritical ? "text-red-600" : "text-amber-600"}`}>-{shortage}</span>
                        <Badge className={`ml-2 text-xs ${isCritical ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {isCritical ? "Critical" : "Warning"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.supplierName || p.supplier?.name || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => setPoTarget(p)}>
                          <ClipboardPlus className="h-3.5 w-3.5 mr-1" /> Quick PO
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={filterUnread ? "default" : "outline"} className="h-7 text-xs" onClick={() => setFilterUnread(true)}>
              <Bell className="h-3.5 w-3.5 mr-1" /> Unread
            </Button>
            <Button size="sm" variant={!filterUnread ? "default" : "outline"} className="h-7 text-xs" onClick={() => setFilterUnread(false)}>
              <BellOff className="h-3.5 w-3.5 mr-1" /> All
            </Button>
            {alerts.some((a) => !a.isRead) && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={markAllRead}>
                <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-4">
          {!alerts.length
            ? <p className="text-sm text-center text-muted-foreground py-6">No {filterUnread ? "unread " : ""}alerts</p>
            : alerts.map((alert) => (
              <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-xl border ${alert.isRead ? "opacity-50 bg-slate-50 border-slate-200" : "bg-orange-50 border-orange-200"}`}>
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{alert.message}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-muted-foreground">{timeAgo(alert.createdAt)}</p>
                    {!alert.isRead && <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">New</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!alert.isRead && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markRead(alert.id)}>Mark read</Button>}
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteAlert(alert.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      <QuickPODialog open={!!poTarget} onOpenChange={() => setPoTarget(null)} product={poTarget} suppliers={suppliers} onSaved={fetchAll} />
    </div>
  );
}
