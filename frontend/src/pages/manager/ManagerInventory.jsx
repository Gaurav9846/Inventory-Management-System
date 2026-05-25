// src/pages/manager/ManagerInventory.jsx
import { useEffect, useState, useCallback } from "react";
import { productsApi, stockApi } from "@/api/index.js";
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
import { TrendingUp, TrendingDown, SlidersHorizontal, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/utils/helpers.js";

function StockActionDialog({ open, onOpenChange, mode, products, onSaved }) {
  const [productId, setProductId] = useState("");
  const [quantity,  setQuantity]  = useState("");
  const [newQty,    setNewQty]    = useState("");
  const [note,      setNote]      = useState("");
  const [saving,    setSaving]    = useState(false);
  const selected = products.find((p) => p.id === productId);

  useEffect(() => { if (open) { setProductId(""); setQuantity(""); setNewQty(""); setNote(""); } }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId) return toast.error("Select a product.");
    setSaving(true);
    try {
      if (mode === "in")     await stockApi.in({ productId, quantity: Number(quantity), note });
      if (mode === "out")    await stockApi.out({ productId, quantity: Number(quantity), note });
      if (mode === "adjust") await stockApi.adjust({ productId, newQuantity: Number(newQty), note });
      toast.success(`Stock ${mode === "adjust" ? "adjusted" : mode === "in" ? "IN" : "OUT"} recorded.`);
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed."); }
    finally { setSaving(false); }
  };

  const titles = {
    in: { label: "Record Stock IN",    icon: TrendingUp,    color: "text-green-600" },
    out:{ label: "Record Stock OUT",   icon: TrendingDown,  color: "text-red-600"   },
    adjust:{ label: "Adjust Stock",    icon: SlidersHorizontal, color: "text-blue-600" },
  };
  const meta = titles[mode] || titles.in;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <meta.icon className={`h-5 w-5 ${meta.color}`} />
            {meta.label}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Select product…" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — <span className={p.currentStock <= p.reorderLevel ? "text-red-600 font-semibold" : ""}>{p.currentStock} {p.unit}(s)</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selected && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${
              selected.currentStock <= selected.reorderLevel
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-green-50 border-green-200 text-green-700"
            }`}>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Current stock: <strong>{selected.currentStock}</strong> {selected.unit}(s) · Reorder at: {selected.reorderLevel}
            </div>
          )}
          {mode === "adjust" ? (
            <div className="space-y-1.5">
              <Label>New Quantity (Physical Count) *</Label>
              <Input type="number" min="0" value={newQty} onChange={(e) => setNewQty(e.target.value)} required placeholder="Actual count result" />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Quantity *</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required placeholder="Number of units" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Note / Reference</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Delivery note, PO number, reason…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button
              type="submit" disabled={saving}
              className={mode === "in" ? "bg-green-600 hover:bg-green-700" : mode === "out" ? "bg-red-600 hover:bg-red-700" : ""}
              variant={mode === "out" ? "destructive" : "default"}
            >
              {saving ? "Saving…" : mode === "in" ? "Record IN" : mode === "out" ? "Record OUT" : "Save Adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ManagerInventory() {
  const [products,    setProducts]    = useState([]);
  const [transactions,setTransactions]= useState([]);
  const [loading,     setLoading]     = useState(true);
  const [txLoading,   setTxLoading]   = useState(true);
  const [search,      setSearch]      = useState("");
  const [dialogMode,  setDialogMode]  = useState(null);
  const [txFilter,    setTxFilter]    = useState("all");

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
      const params = { limit: 50 };
      if (txFilter !== "all") params.type = txFilter;
      const { data } = await stockApi.getTransactions(params);
      setTransactions(data.data);
    } catch { toast.error("Failed to load transactions."); }
    finally { setTxLoading(false); }
  }, [txFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchTx(); }, [fetchTx]);

  const handleSaved = () => { fetchProducts(); fetchTx(); };

  return (
    <div className="space-y-6">
      <PageHeader title="Stock Overview" description="Monitor and update all inventory levels">
        <div className="flex gap-2">
          <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1.5" onClick={() => setDialogMode("in")}>
            <TrendingUp className="h-4 w-4" /> Stock IN
          </Button>
          <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50 gap-1.5" onClick={() => setDialogMode("out")}>
            <TrendingDown className="h-4 w-4" /> Stock OUT
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialogMode("adjust")}>
            <SlidersHorizontal className="h-4 w-4" /> Adjust
          </Button>
        </div>
      </PageHeader>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><span className="font-bold text-blue-600 text-lg">{products.length}</span></div>
          <div><p className="text-xs text-muted-foreground">Total Products</p><p className="text-sm font-semibold">In catalog</p></div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><span className="font-bold text-red-600 text-lg">{products.filter((p) => p.currentStock <= p.reorderLevel).length}</span></div>
          <div><p className="text-xs text-muted-foreground">Low Stock</p><p className="text-sm font-semibold text-red-700">Need reorder</p></div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><span className="font-bold text-green-600 text-lg">{products.filter((p) => p.currentStock > p.reorderLevel).length}</span></div>
          <div><p className="text-xs text-muted-foreground">Healthy Stock</p><p className="text-sm font-semibold text-green-700">Above reorder</p></div>
        </div>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Product Stock Levels</TabsTrigger>
          <TabsTrigger value="history">Movement History</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <Card>
            <CardContent className="p-4 pb-0">
              <div className="relative max-w-sm mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </CardContent>
            <CardContent className="p-0">
              {loading ? <TableSkeleton rows={6} cols={6} /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Reorder Level</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!products.length
                      ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No products found</TableCell></TableRow>
                      : products.map((p) => {
                        const isLow = p.currentStock <= p.reorderLevel;
                        return (
                          <TableRow key={p.id} className={isLow ? "bg-red-50/50" : ""}>
                            <TableCell className="font-medium text-sm">{p.name}{p.sku && <span className="ml-2 text-xs text-muted-foreground font-mono">{p.sku}</span>}</TableCell>
                            <TableCell><Badge variant="secondary" className="text-xs">{p.category?.name}</Badge></TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.unit}</TableCell>
                            <TableCell>
                              <span className={`text-lg font-bold ${isLow ? "text-red-600" : "text-green-700"}`}>{p.currentStock}</span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.reorderLevel}</TableCell>
                            <TableCell>
                              {isLow
                                ? <span className="flex items-center gap-1 text-xs font-semibold text-red-600"><AlertTriangle className="h-3.5 w-3.5" />Low Stock</span>
                                : <span className="text-xs font-semibold text-green-600">✓ Healthy</span>}
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

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-4 pb-2">
              <div className="flex gap-2">
                {["all", "IN", "OUT", "ADJUSTMENT"].map((t) => (
                  <Button key={t} size="sm" variant={txFilter === t ? "default" : "outline"} className="h-7 text-xs" onClick={() => setTxFilter(t)}>
                    {t === "all" ? "All Movements" : t}
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
                      <TableHead>Recorded By</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!transactions.length
                      ? <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No transactions</TableCell></TableRow>
                      : transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-medium text-sm">{tx.product?.name}</TableCell>
                          <TableCell><StatusBadge value={tx.type} /></TableCell>
                          <TableCell className="font-semibold">{tx.quantity}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{tx.previousStock} → <strong className="text-foreground">{tx.newStock}</strong></TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-36 truncate">{tx.note || "—"}</TableCell>
                          <TableCell className="text-xs">{tx.user?.name}</TableCell>
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

      <StockActionDialog open={!!dialogMode} onOpenChange={() => setDialogMode(null)} mode={dialogMode} products={products} onSaved={handleSaved} />
    </div>
  );
}
