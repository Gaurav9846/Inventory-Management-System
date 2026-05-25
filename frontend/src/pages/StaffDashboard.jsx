// src/pages/StaffDashboard.jsx
// Shown when a STAFF member logs in — focused on daily stock operations only
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { stockApi, productsApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import {
  TrendingUp, TrendingDown, Package, AlertTriangle,
  ClipboardList, UserCircle, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/utils/helpers.js";
import { useAuth } from "@/context/AuthContext.jsx";

// Inline quick stock action modal (IN or OUT)
function QuickStockDialog({ open, onOpenChange, mode, products, onSaved }) {
  const [productId, setProductId] = useState("");
  const [quantity,  setQuantity]  = useState("");
  const [note,      setNote]      = useState("");
  const [saving,    setSaving]    = useState(false);

  const selectedProduct = products.find((p) => p.id === productId);

  useEffect(() => {
    if (open) { setProductId(""); setQuantity(""); setNote(""); }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId || !quantity) return toast.error("Select a product and enter quantity.");
    setSaving(true);
    try {
      if (mode === "in")  await stockApi.in({ productId, quantity: Number(quantity), note });
      if (mode === "out") await stockApi.out({ productId, quantity: Number(quantity), note });
      toast.success(`Stock ${mode === "in" ? "IN" : "OUT"} recorded successfully.`);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update stock.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "in"
              ? <><TrendingUp className="h-5 w-5 text-green-600" /> Record Stock IN</>
              : <><TrendingDown className="h-5 w-5 text-red-600" /> Record Stock OUT</>}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Select product…" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id} disabled={mode === "out" && p.currentStock === 0}>
                    {p.name} — <span className={p.currentStock <= p.reorderLevel ? "text-destructive font-semibold" : ""}>{p.currentStock} {p.unit}(s)</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current stock indicator */}
          {selectedProduct && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border ${
              selectedProduct.currentStock <= selectedProduct.reorderLevel
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-green-50 border-green-200 text-green-700"
            }`}>
              <span>Current stock: <strong>{selectedProduct.currentStock} {selectedProduct.unit}(s)</strong></span>
              {selectedProduct.currentStock <= selectedProduct.reorderLevel && (
                <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Low stock</span>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Quantity *</Label>
            <Input
              type="number"
              min="1"
              max={mode === "out" ? selectedProduct?.currentStock : undefined}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Units to move"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note / Reference</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Optional — e.g. delivery note, customer name…"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button
              type="submit"
              disabled={saving}
              variant={mode === "out" ? "destructive" : "default"}
              className={mode === "in" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {saving ? "Saving…" : mode === "in" ? "Record IN" : "Record OUT"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function StaffDashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [products,      setProducts]     = useState([]);
  const [transactions,  setTransactions] = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [dialogMode,    setDialogMode]   = useState(null); // "in" | "out"

  const fetchAll = async () => {
    try {
      const [pRes, txRes] = await Promise.all([
        productsApi.getAll(),
        stockApi.getTransactions({ limit: 15 }),
      ]);
      setProducts(pRes.data);
      setTransactions(txRes.data.data);
    } catch {
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const lowStockItems  = products.filter((p) => p.currentStock <= p.reorderLevel);
  const todayTx        = transactions.filter((tx) => {
    const today = new Date().toDateString();
    return new Date(tx.createdAt).toDateString() === today;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5 animate-in">
      {/* Staff role banner */}
      <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
        <UserCircle className="h-5 w-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-900">Welcome, {user?.name} — Staff View</p>
          <p className="text-xs text-green-700 mt-0.5">
            You can record stock movements and view inventory. To create orders or manage suppliers, contact your manager.
          </p>
        </div>
      </div>

      {/* Primary actions — large prominent buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setDialogMode("in")}
          className="flex flex-col items-center justify-center gap-3 p-8 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors shadow-sm"
        >
          <TrendingUp className="h-10 w-10" />
          <div className="text-center">
            <p className="text-lg font-semibold">Stock IN</p>
            <p className="text-sm text-green-100">Record goods received</p>
          </div>
        </button>
        <button
          onClick={() => setDialogMode("out")}
          className="flex flex-col items-center justify-center gap-3 p-8 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors shadow-sm"
        >
          <TrendingDown className="h-10 w-10" />
          <div className="text-center">
            <p className="text-lg font-semibold">Stock OUT</p>
            <p className="text-sm text-red-100">Record goods dispatched</p>
          </div>
        </button>
      </div>

      {/* Secondary navigation tiles */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => navigate("/products")}
          className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:bg-muted/50 transition-colors"
        >
          <Package className="h-6 w-6 text-blue-600" />
          <p className="text-xs font-medium">View Products</p>
        </button>
        <button
          onClick={() => navigate("/stock")}
          className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:bg-muted/50 transition-colors"
        >
          <ClipboardList className="h-6 w-6 text-purple-600" />
          <p className="text-xs font-medium">Stock History</p>
        </button>
        <button
          onClick={() => navigate("/sales-orders")}
          className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:bg-muted/50 transition-colors"
        >
          <TrendingUp className="h-6 w-6 text-amber-600" />
          <p className="text-xs font-medium">Sales Orders</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Low stock summary */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Low Stock ({lowStockItems.length})
            </CardTitle>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/products?lowStock=true")}>
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {!lowStockItems.length ? (
              <p className="text-sm text-center text-muted-foreground py-6">✅ All items above reorder level</p>
            ) : lowStockItems.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 border border-red-200">
                <div>
                  <p className="text-xs font-semibold text-red-900">{p.name}</p>
                  <p className="text-xs text-red-600">Reorder at: {p.reorderLevel} {p.unit}(s)</p>
                </div>
                <span className="text-base font-bold text-red-600">{p.currentStock}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Today's transactions */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Today's Transactions ({todayTx.length})</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/stock")}>
              All history <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {!todayTx.length ? (
              <p className="text-sm text-center text-muted-foreground py-6">No transactions recorded today</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayTx.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs font-medium">{tx.product?.name}</TableCell>
                      <TableCell><StatusBadge value={tx.type} /></TableCell>
                      <TableCell className="text-xs">{tx.quantity} {tx.product?.unit}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleTimeString("en-NP", { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <QuickStockDialog
        open={!!dialogMode}
        onOpenChange={() => setDialogMode(null)}
        mode={dialogMode}
        products={products}
        onSaved={fetchAll}
      />
    </div>
  );
}
