import { useEffect, useState, useCallback } from "react";
import { stockApi, productsApi } from "@/api/index.js";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { TrendingUp, TrendingDown, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/utils/helpers.js";
import { useAuth } from "@/context/AuthContext.jsx";

function StockActionDialog({ open, onOpenChange, mode, products, onSaved }) {
  const [productId, setProductId] = useState("");
  const [quantity,  setQuantity]  = useState("");
  const [newQty,    setNewQty]    = useState("");
  const [note,      setNote]      = useState("");
  const [saving,    setSaving]    = useState(false);

  useEffect(() => { if (open) { setProductId(""); setQuantity(""); setNewQty(""); setNote(""); } }, [open]);

  const titles = { in: "Stock In – Goods Receipt", out: "Stock Out – Goods Dispatch", adjust: "Adjust Stock (Physical Count)" };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId) return toast.error("Select a product.");
    setSaving(true);
    try {
      if (mode === "in")     await stockApi.in({ productId, quantity: Number(quantity), note });
      if (mode === "out")    await stockApi.out({ productId, quantity: Number(quantity), note });
      if (mode === "adjust") await stockApi.adjust({ productId, newQuantity: Number(newQty), note });
      toast.success("Stock updated successfully.");
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(err.response?.data?.message || "Stock update failed."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{titles[mode]}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.currentStock} {p.unit}(s)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {mode === "adjust" ? (
            <div className="space-y-1.5">
              <Label>New Quantity *</Label>
              <Input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} min="0" required placeholder="Physical count result" />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Quantity *</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" required placeholder="Units to move" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Optional reason / reference…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}
              variant={mode === "out" ? "destructive" : "default"}>
              {saving ? "Saving…" : mode === "in" ? "Record IN" : mode === "out" ? "Record OUT" : "Adjust"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Stock() {
  const { isManager } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [dialogMode,   setDialogMode]   = useState(null); // "in"|"out"|"adjust"
  const [filterType,   setFilterType]   = useState("all");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterType !== "all" ? { type: filterType } : {};
      const [txRes, pRes] = await Promise.all([
        stockApi.getTransactions({ ...params, limit: 100 }),
        productsApi.getAll(),
      ]);
      setTransactions(txRes.data.data);
      setProducts(pRes.data);
    } catch { toast.error("Failed to load stock data."); }
    finally { setLoading(false); }
  }, [filterType]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="space-y-5">
      <PageHeader title="Stock Management" description="Track all inventory movements">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50" onClick={() => setDialogMode("in")}>
            <TrendingUp className="h-4 w-4" /> Stock In
          </Button>
          <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={() => setDialogMode("out")}>
            <TrendingDown className="h-4 w-4" /> Stock Out
          </Button>
          {isManager && (
            <Button size="sm" variant="outline" onClick={() => setDialogMode("adjust")}>
              <SlidersHorizontal className="h-4 w-4" /> Adjust
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Filter tabs */}
      <Tabs value={filterType} onValueChange={setFilterType}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="IN">Stock In</TabsTrigger>
          <TabsTrigger value="OUT">Stock Out</TabsTrigger>
          <TabsTrigger value="ADJUSTMENT">Adjustments</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={8} cols={6} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Before → After</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!transactions.length ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No transactions found</TableCell></TableRow>
                ) : transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium text-sm">{tx.product?.name}</TableCell>
                    <TableCell><StatusBadge value={tx.type} /></TableCell>
                    <TableCell className="font-semibold">{tx.quantity} {tx.product?.unit}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {tx.previousStock} → <span className="font-semibold text-foreground">{tx.newStock}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-40 truncate">{tx.note || "—"}</TableCell>
                    <TableCell className="text-sm">{tx.user?.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <StockActionDialog
        open={!!dialogMode} onOpenChange={() => setDialogMode(null)}
        mode={dialogMode} products={products} onSaved={fetchAll}
      />
    </div>
  );
}
