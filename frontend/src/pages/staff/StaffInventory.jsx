// src/pages/staff/StaffInventory.jsx
import { useEffect, useState, useCallback } from "react";
import { stockApi, productsApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { TableSkeleton } from "@/components/shared/LoadingSpinner.jsx";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import {
  TrendingUp, TrendingDown, Search, AlertTriangle,
  Package, CheckCircle, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/utils/helpers.js";

/* ─── Stock Action Dialog ────────────────────────────────────────────── */
function StockActionDialog({ open, onOpenChange, mode, products, onSaved }) {
  const [productId, setProductId] = useState("");
  const [quantity,  setQuantity]  = useState("");
  const [note,      setNote]      = useState("");
  const [saving,    setSaving]    = useState(false);

  const selected = products.find((p) => p.id === productId);

  useEffect(() => {
    if (open) { setProductId(""); setQuantity(""); setNote(""); }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId || !quantity) return toast.error("Product and quantity are required.");
    if (Number(quantity) <= 0) return toast.error("Quantity must be greater than 0.");
    if (mode === "out" && selected && Number(quantity) > selected.currentStock) {
      return toast.error(`Only ${selected.currentStock} ${selected.unit}(s) available.`);
    }
    setSaving(true);
    try {
      if (mode === "in")  await stockApi.in({ productId, quantity: Number(quantity), note });
      if (mode === "out") await stockApi.out({ productId, quantity: Number(quantity), note });
      toast.success(`Stock ${mode === "in" ? "IN" : "OUT"} recorded successfully.`);
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed to update stock."); }
    finally { setSaving(false); }
  };

  const isLow = selected && selected.currentStock <= selected.reorderLevel;

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
                    <span className="flex items-center gap-2">
                      {p.name}
                      <span className={`text-xs font-semibold ${p.currentStock <= p.reorderLevel ? "text-red-500" : "text-green-600"}`}>
                        ({p.currentStock} {p.unit})
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Live stock indicator */}
          {selected && (
            <div className={`rounded-xl p-3 border text-sm ${isLow ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
              <div className="flex items-center justify-between">
                <span className={`font-semibold ${isLow ? "text-red-700" : "text-green-700"}`}>
                  {selected.name}
                </span>
                {isLow
                  ? <span className="flex items-center gap-1 text-xs text-red-600 font-medium"><AlertTriangle className="h-3.5 w-3.5" />Low Stock</span>
                  : <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle className="h-3.5 w-3.5" />Healthy</span>}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className={isLow ? "text-red-600" : "text-green-600"}>
                  Current: <strong className="text-base">{selected.currentStock}</strong> {selected.unit}(s)
                </span>
                <span className="text-muted-foreground">Reorder at: {selected.reorderLevel}</span>
              </div>
              {mode === "out" && Number(quantity) > 0 && (
                <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                  <span className="text-xs text-muted-foreground">
                    After this OUT: <strong className={selected.currentStock - Number(quantity) <= selected.reorderLevel ? "text-red-600" : "text-green-700"}>
                      {selected.currentStock - Number(quantity)} {selected.unit}(s)
                    </strong>
                  </span>
                </div>
              )}
              {mode === "in" && Number(quantity) > 0 && (
                <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                  <span className="text-xs text-muted-foreground">
                    After this IN: <strong className="text-green-700">
                      {selected.currentStock + Number(quantity)} {selected.unit}(s)
                    </strong>
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Quantity *</Label>
            <Input
              type="number" min="1"
              max={mode === "out" ? selected?.currentStock : undefined}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              placeholder={`Units to ${mode === "in" ? "receive" : "dispatch"}`}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Reference / Note</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={mode === "in"
                ? "Delivery note number, supplier name…"
                : "Sales order number, customer name…"}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button
              type="submit" disabled={saving}
              className={mode === "in" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {saving ? "Saving…" : mode === "in" ? "✓ Record Stock IN" : "✓ Record Stock OUT"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────── */
export default function StaffInventory() {
  const [products,      setProducts]     = useState([]);
  const [transactions,  setTransactions] = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [txLoading,     setTxLoading]    = useState(true);
  const [search,        setSearch]       = useState("");
  const [dialogMode,    setDialogMode]   = useState(null);
  const [txFilter,      setTxFilter]     = useState("all");

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await productsApi.getAll({ search: search || undefined });
      setProducts(data);
    } catch { toast.error("Failed to load products."); }
    finally { setLoading(false); }
  }, [search]);

  const fetchTx = useCallback(async () => {
    setTxLoading(true);
    try {
      const params = { limit: 100 };
      if (txFilter !== "all") params.type = txFilter;
      const { data } = await stockApi.getTransactions(params);
      setTransactions(data.data);
    } catch { toast.error("Failed to load history."); }
    finally { setTxLoading(false); }
  }, [txFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchTx(); }, [fetchTx]);

  const handleSaved = () => { fetchProducts(); fetchTx(); };

  const lowStockCount = products.filter((p) => p.currentStock <= p.reorderLevel).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Stock Entry" description="Record incoming and outgoing stock movements">
        <div className="flex gap-2">
          <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1.5" onClick={() => setDialogMode("in")}>
            <TrendingUp className="h-4 w-4" /> Stock IN
          </Button>
          <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50 gap-1.5" onClick={() => setDialogMode("out")}>
            <TrendingDown className="h-4 w-4" /> Stock OUT
          </Button>
        </div>
      </PageHeader>

      {/* Low stock banner */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800">
            <strong>{lowStockCount} product(s)</strong> are below reorder level. Please inform your manager.
          </p>
        </div>
      )}

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Current Stock Levels</TabsTrigger>
          <TabsTrigger value="history">Movement History</TabsTrigger>
        </TabsList>

        {/* ── Stock Levels ── */}
        <TabsContent value="stock" className="mt-4">
          <Card>
            <CardContent className="p-4 pb-2">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </CardContent>
            <CardContent className="p-0">
              {loading ? <TableSkeleton rows={6} cols={5} /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>In Stock</TableHead>
                      <TableHead>Reorder Level</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!products.length
                      ? <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No products found</TableCell></TableRow>
                      : products.map((p) => {
                        const isLow = p.currentStock <= p.reorderLevel;
                        const pct   = Math.min(100, Math.round((p.currentStock / Math.max(p.reorderLevel * 2, 1)) * 100));
                        return (
                          <TableRow key={p.id} className={isLow ? "bg-red-50/50" : ""}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                                  <Package className="h-4 w-4 text-violet-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{p.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{p.sku || p.unit}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="secondary" className="text-xs">{p.category?.name}</Badge></TableCell>
                            <TableCell>
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className={`text-lg font-black ${isLow ? "text-red-600" : "text-green-700"}`}>{p.currentStock}</span>
                                  <span className="text-xs text-muted-foreground">{p.unit}(s)</span>
                                </div>
                                {/* Stock bar */}
                                <div className="w-24 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                  <div className={`h-full rounded-full ${isLow ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.reorderLevel} {p.unit}(s)</TableCell>
                            <TableCell>
                              {isLow
                                ? <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                                    <AlertTriangle className="h-3.5 w-3.5" /> Low Stock
                                  </span>
                                : <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                                    <CheckCircle className="h-3.5 w-3.5" /> Healthy
                                  </span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Movement History ── */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-4 pb-2">
              <div className="flex gap-2 flex-wrap">
                {["all", "IN", "OUT"].map((t) => (
                  <Button key={t} size="sm" onClick={() => setTxFilter(t)}
                    variant={txFilter === t ? "default" : "outline"}
                    className={`h-7 text-xs ${txFilter === t && t === "IN" ? "bg-green-600 hover:bg-green-700" : ""} ${txFilter === t && t === "OUT" ? "bg-red-600 hover:bg-red-700" : ""}`}>
                    {t === "all" ? "All" : `Stock ${t}`}
                  </Button>
                ))}
              </div>
            </CardContent>
            <CardContent className="p-0">
              {txLoading ? <TableSkeleton rows={6} cols={6} /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Before → After</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!transactions.length
                      ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No transactions recorded</TableCell></TableRow>
                      : transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-medium text-sm">{tx.product?.name}</TableCell>
                          <TableCell><StatusBadge value={tx.type} /></TableCell>
                          <TableCell className="font-bold">{tx.quantity} {tx.product?.unit}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {tx.previousStock} → <strong className="text-foreground">{tx.newStock}</strong>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-40 truncate">{tx.note || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <StockActionDialog
        open={!!dialogMode}
        onOpenChange={() => setDialogMode(null)}
        mode={dialogMode}
        products={products}
        onSaved={handleSaved}
      />
    </div>
  );
}
