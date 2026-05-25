// src/pages/manager/ManagerProducts.jsx
import { useEffect, useState, useCallback } from "react";
import { productsApi, categoriesApi, suppliersApi } from "@/api/index.js";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { TableSkeleton } from "@/components/shared/LoadingSpinner.jsx";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog.jsx";
import { Search, Pencil, Trash2, ImageOff, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/helpers.js";

const EMPTY = { name: "", sku: "", description: "", unit: "piece", reorderLevel: 10, currentStock: 0, costPrice: "", sellingPrice: "", categoryId: "", supplierId: "" };

function ProductFormDialog({ open, onOpenChange, editData, categories, suppliers, onSaved }) {
  const [form,    setForm]    = useState(EMPTY);
  const [image,   setImage]   = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editData ? { ...EMPTY, ...editData, categoryId: editData.categoryId || "", supplierId: editData.supplierId || "" } : EMPTY);
      setImage(null);
      setPreview(editData?.imageUrl || null);
    }
  }, [open, editData]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.categoryId) return toast.error("Name and category are required.");
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== "" && v != null) fd.append(k, v); });
      if (image) fd.append("image", image);
      if (editData) { await productsApi.update(editData.id, fd); toast.success("Product updated."); }
      else          { await productsApi.create(fd);              toast.success("Product created."); }
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{editData ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. 20L Water Jar" /></div>
            <div className="space-y-1.5"><Label>SKU</Label><Input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="WJ-20L-001" /></div>
            <div className="space-y-1.5"><Label>Unit</Label><Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="piece / bottle / litre" /></div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Select value={form.supplierId || "none"} onValueChange={(v) => set("supplierId", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Cost Price (NPR)</Label><Input type="number" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} placeholder="0.00" min="0" step="0.01" /></div>
            <div className="space-y-1.5"><Label>Selling Price (NPR)</Label><Input type="number" value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} placeholder="0.00" min="0" step="0.01" /></div>
            <div className="space-y-1.5"><Label>Current Stock</Label><Input type="number" value={form.currentStock} onChange={(e) => set("currentStock", e.target.value)} min="0" /></div>
            <div className="space-y-1.5"><Label>Reorder Level</Label><Input type="number" value={form.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value)} min="0" /></div>
            <div className="col-span-2 space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} /></div>
            <div className="col-span-2 space-y-1.5">
              <Label>Product Image</Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                  {preview ? <img src={preview} alt="preview" className="w-full h-full object-cover" /> : <ImageOff className="h-7 w-7 text-slate-400" />}
                </div>
                <Input type="file" accept="image/*" onChange={handleFile} className="cursor-pointer" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? "Saving…" : editData ? "Update Product" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ManagerProducts() {
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers,  setSuppliers]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterCat,  setFilterCat]  = useState("all");
  const [formOpen,   setFormOpen]   = useState(false);
  const [editData,   setEditData]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,   setDeleting]   = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)              params.search     = search;
      if (filterCat !== "all") params.categoryId = filterCat;
      const [pRes, cRes, sRes] = await Promise.all([
        productsApi.getAll(params),
        categoriesApi.getAll(),
        suppliersApi.getAll(),
      ]);
      setProducts(pRes.data);
      setCategories(cRes.data);
      setSuppliers(sRes.data);
    } catch { toast.error("Failed to load products."); }
    finally { setLoading(false); }
  }, [search, filterCat]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async () => {
    setDeleting(true);
    try { await productsApi.remove(deleteTarget.id); toast.success("Product deleted."); setDeleteTarget(null); fetchAll(); }
    catch (err) { toast.error(err.response?.data?.message || "Delete failed."); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        description="Manage product catalog, prices and availability"
        actionLabel="Add Product"
        onAction={() => { setEditData(null); setFormOpen(true); }}
      />

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{products.length} products</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={6} cols={7} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!products.length
                  ? <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No products found</TableCell></TableRow>
                  : products.map((p) => {
                    const isLow    = p.currentStock <= p.reorderLevel;
                    const margin   = p.costPrice && p.sellingPrice
                      ? (((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100).toFixed(1)
                      : null;
                    return (
                      <TableRow key={p.id} className={isLow ? "bg-red-50/40" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg border bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                              {p.imageUrl
                                ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                : <Package className="h-4 w-4 text-slate-400" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{p.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{p.sku || p.unit}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{p.category?.name}</Badge></TableCell>
                        <TableCell>
                          <span className={`font-bold text-sm ${isLow ? "text-red-600" : "text-green-700"}`}>{p.currentStock}</span>
                          <span className="text-xs text-muted-foreground ml-1">{p.unit}</span>
                          {isLow && <AlertTriangle className="h-3.5 w-3.5 text-red-500 inline ml-1" />}
                        </TableCell>
                        <TableCell className="text-sm">{p.costPrice ? formatCurrency(p.costPrice) : "—"}</TableCell>
                        <TableCell className="text-sm font-medium">{p.sellingPrice ? formatCurrency(p.sellingPrice) : "—"}</TableCell>
                        <TableCell>
                          {margin != null
                            ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${Number(margin) >= 20 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{margin}%</span>
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditData(p); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} editData={editData} categories={categories} suppliers={suppliers} onSaved={fetchAll} />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}
        title="Delete Product" description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}
